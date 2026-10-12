<#
.SYNOPSIS
    Installs the Eduvio STAG agent as a background task (Windows Task Scheduler).

.DESCRIPTION
    Creates the task "Eduvio STAG agent" that runs
        wsl.exe -d <distro> -- python3 <path>/stag_agent.py watch
    hidden (no console window) when you log on to Windows, and starts it again
    every 15 minutes if it is not running (e.g. after a crash). The agent itself
    makes sure only one instance runs.

    Run `python3 stag_agent.py setup` and `python3 stag_agent.py login` in WSL first.

.PARAMETER Distro
    WSL distribution with the agent. Default: taken from the path of this script
    (\\wsl.localhost\<distro>\...), otherwise the default WSL distribution.

.PARAMETER AgentPath
    Linux path to stag_agent.py. Default: next to this script (when started from
    \\wsl.localhost\...), otherwise ~/eduvio-project/stag_mock_import/stag_agent.py.

.PARAMETER NoHeadless
    Start wsl.exe directly (a console window stays open). For Windows versions
    without `conhost.exe --headless`.

.PARAMETER StartNow
    Start the task right after installing it.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-agent.ps1 -StartNow
#>
[CmdletBinding()]
param(
    [string]$Distro,
    [string]$AgentPath,
    [switch]$NoHeadless,
    [switch]$StartNow
)

$ErrorActionPreference = 'Stop'
$TaskName = 'Eduvio STAG agent'
$Wsl = Join-Path $env:WINDIR 'System32\wsl.exe'

if (-not (Test-Path $Wsl)) {
    throw "wsl.exe not found ($Wsl). Install WSL first."
}

# Distro and path from the location of this script: \\wsl.localhost\<distro>\home\...\windows
$scriptMatch = [regex]::Match($PSScriptRoot, '^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(\\.*)$')
if (-not $Distro -and $scriptMatch.Success) {
    $Distro = $scriptMatch.Groups[1].Value
}
if (-not $Distro) {
    $Distro = (& $Wsl -e sh -c 'printf %s "$WSL_DISTRO_NAME"' | Out-String).Trim()
}
if (-not $Distro) {
    throw 'Could not find the WSL distribution. Pass it with -Distro (see `wsl -l`).'
}

if (-not $AgentPath) {
    if ($scriptMatch.Success) {
        $linuxDir = ($scriptMatch.Groups[2].Value -replace '\\', '/')
        $AgentPath = ($linuxDir -replace '/windows$', '') + '/stag_agent.py'
    } else {
        $AgentPath = (& $Wsl -d $Distro -e sh -c 'readlink -f ~/eduvio-project/stag_mock_import/stag_agent.py' | Out-String).Trim()
    }
}

& $Wsl -d $Distro -e test -f $AgentPath
if ($LASTEXITCODE -ne 0) {
    throw "stag_agent.py not found in WSL '$Distro' at '$AgentPath'. Pass the path with -AgentPath."
}

& $Wsl -d $Distro -e sh -c 'test -f ~/.eduvio-agent/config.json'
if ($LASTEXITCODE -ne 0) {
    Write-Warning 'The agent is not set up yet. Run in WSL: python3 stag_agent.py setup'
}

$wslArguments = "-d $Distro -- python3 $AgentPath watch"
if ($NoHeadless) {
    $action = New-ScheduledTaskAction -Execute $Wsl -Argument $wslArguments
} else {
    # conhost --headless runs wsl.exe without a console window, still in the user's session
    # (so the agent can open the STAG login in the browser)
    $action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless `"$Wsl`" $wslArguments"
}

$user = "$env:USERDOMAIN\$env:USERNAME"

# At logon (one minute later, so VPN/Wi-Fi can connect), and every 15 minutes in case it stopped
$atLogon = New-ScheduledTaskTrigger -AtLogOn -User $user
$atLogon.Delay = 'PT1M'
$watchdog = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($atLogon, $watchdog) `
    -Settings $settings -Principal $principal `
    -Description 'Eduvio: STAG sync in the background (stag_agent.py watch).' -Force | Out-Null

Write-Host "Task '$TaskName' installed."
Write-Host "  WSL:    $Distro"
Write-Host "  Agent:  $AgentPath"
Write-Host "  Log:    ~/.eduvio-agent/agent.log (in WSL)"

if ($StartNow) {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host 'Started. The app shows "Notebook online" within about 2 minutes.'
} else {
    Write-Host 'It starts at your next logon (or now: Start-ScheduledTask -TaskName ''Eduvio STAG agent'').'
}
