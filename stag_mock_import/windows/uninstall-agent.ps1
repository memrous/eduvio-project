<#
.SYNOPSIS
    Removes the Eduvio STAG agent background task (Windows Task Scheduler).

.DESCRIPTION
    Stops and deletes the task "Eduvio STAG agent" and stops a running
    `stag_agent.py watch` in WSL. The agent configuration and ticket in
    ~/.eduvio-agent stay (delete that folder in WSL to remove them too).

.PARAMETER Distro
    WSL distribution with the agent. Default: taken from the path of this script,
    otherwise the default WSL distribution.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\uninstall-agent.ps1
#>
[CmdletBinding()]
param(
    [string]$Distro
)

$ErrorActionPreference = 'Stop'
$TaskName = 'Eduvio STAG agent'
$Wsl = Join-Path $env:WINDIR 'System32\wsl.exe'

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Task '$TaskName' removed."
} else {
    Write-Host "Task '$TaskName' is not installed."
}

# The task's process ends with the task, but stop a watch started by hand too
if (Test-Path $Wsl) {
    $scriptMatch = [regex]::Match($PSScriptRoot, '^\\\\wsl(?:\.localhost|\$)\\([^\\]+)\\')
    if (-not $Distro -and $scriptMatch.Success) {
        $Distro = $scriptMatch.Groups[1].Value
    }
    $wslArgs = @()
    if ($Distro) { $wslArgs += @('-d', $Distro) }
    & $Wsl @wslArgs -e sh -c 'pkill -TERM -f "stag_agent.py watch" || true'
    Write-Host 'Background agent stopped (if it was running).'
}
