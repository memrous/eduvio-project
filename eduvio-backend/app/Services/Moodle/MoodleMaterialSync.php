<?php

namespace App\Services\Moodle;

use App\Models\Material;
use App\Models\User;
use App\Support\FileSize;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MoodleMaterialSync
{
    /** Module types imported as materials; everything else (assign, quiz, forum, label, ...) is ignored. */
    private const MATERIAL_MODULES = ['resource', 'url', 'page', 'folder', 'book'];

    /** URL fragments that would expose files or the wstoken; such URLs never reach the database. */
    private const FORBIDDEN_URL_PARTS = ['pluginfile.php', 'webservice/', 'token='];

    private const MAX_URL_LENGTH = 255;

    public function __construct(private MoodleCourseMatcher $matcher)
    {
    }

    /**
     * Fetch course contents and upsert supported modules and locked sections as the user's materials.
     * Materials that disappeared from Moodle are removed, except for courses whose
     * contents could not be fetched in this run.
     *
     * @param  array  $courses  Result of core_enrol_get_users_courses.
     * @return int Number of processed materials.
     */
    public function sync(User $user, MoodleClient $client, array $courses): int
    {
        $rows = [];
        $sectionRows = [];
        $failedCourseIds = [];

        // Collect everything over HTTP first, then write in a single transaction.
        foreach ($this->matcher->match($user, $courses) as $courseId => $match) {
            if ($match->isSkipped()) {
                continue;
            }

            try {
                $sections = $client->call('core_course_get_contents', ['courseid' => $courseId]);
            } catch (MoodleApiException $e) {
                if ($e->errorcode === 'invalidtoken') {
                    throw $e;
                }
                Log::warning("Moodle sync: contents failed for course {$courseId}: {$e->errorcode}");
                $failedCourseIds[] = $courseId;
                continue;
            }

            foreach ($sections as $section) {
                $attributes = $this->lockedSectionAttributes($user, $section, $match);
                if ($attributes !== null) {
                    $sectionRows[] = $attributes;
                }

                foreach ($section['modules'] ?? [] as $module) {
                    $attributes = $this->materialAttributes($user, $module, $match, (string) ($section['name'] ?? ''));
                    if ($attributes !== null) {
                        $rows[] = $attributes;
                    }
                }
            }
        }

        DB::transaction(function () use ($user, $rows, $sectionRows, $failedCourseIds) {
            foreach ($rows as $attributes) {
                Material::updateOrCreate(
                    ['user_id' => $user->id, 'moodle_cmid' => $attributes['moodle_cmid']],
                    $attributes,
                );
            }

            foreach ($sectionRows as $attributes) {
                Material::updateOrCreate(
                    ['user_id' => $user->id, 'moodle_section_id' => $attributes['moodle_section_id']],
                    $attributes,
                );
            }

            // Remove modules and locked sections not seen in this run (removed, or the section
            // was unlocked). Manually added materials (neither id set) are never touched.
            Material::where('user_id', $user->id)
                ->where(function ($query) use ($rows, $sectionRows) {
                    $query->where(function ($q) use ($rows) {
                        $q->whereNotNull('moodle_cmid')
                            ->whereNotIn('moodle_cmid', array_column($rows, 'moodle_cmid'));
                    })->orWhere(function ($q) use ($sectionRows) {
                        $q->whereNotNull('moodle_section_id')
                            ->whereNotIn('moodle_section_id', array_column($sectionRows, 'moodle_section_id'));
                    });
                })
                ->where(function ($query) use ($failedCourseIds) {
                    $query->whereNull('moodle_course_id')
                        ->orWhereNotIn('moodle_course_id', $failedCourseIds);
                })
                ->delete();
        });

        return count($rows) + count($sectionRows);
    }

    /**
     * A whole section hidden by an access restriction (e.g. group membership) comes back
     * with uservisible = false and no modules; import it as one placeholder material so
     * the user sees that the content exists and why it is unavailable.
     *
     * @return array<string, mixed>|null Null when the section is not a locked section with a reason.
     */
    private function lockedSectionAttributes(User $user, array $section, MoodleCourseMatch $match): ?array
    {
        if (($section['uservisible'] ?? true) !== false) {
            return null;
        }

        $lockInfo = $this->plainText((string) ($section['availabilityinfo'] ?? ''));
        if ($lockInfo === '') {
            return null;
        }

        $baseUrl = rtrim((string) config('moodle.base_url'), '/');
        $sectionNumber = (int) ($section['section'] ?? 0);

        return [
            'user_id'           => $user->id,
            'subject_id'        => $match->isMatched() ? $match->subject->id : null,
            'moodle_cmid'       => null,
            'moodle_section_id' => (int) $section['id'],
            'moodle_course_id'  => $match->courseId,
            'title'             => mb_substr((string) ($section['name'] ?? 'Moodle section'), 0, 255),
            'category'          => 'file',
            'type'              => 'LINK',
            'url'               => "{$baseUrl}/course/view.php?id={$match->courseId}#section-{$sectionNumber}",
            'size'              => 'External Link',
            'file_name'         => null,
            'description'       => "Moodle: {$match->fullname}\nZamčeno: {$lockInfo}",
        ];
    }

    /**
     * @return array<string, mixed>|null Null when the module should not be imported.
     */
    private function materialAttributes(User $user, array $module, MoodleCourseMatch $match, string $sectionName): ?array
    {
        $modname = (string) ($module['modname'] ?? '');
        if (! in_array($modname, self::MATERIAL_MODULES, true)) {
            return null;
        }

        $description = "Moodle: {$match->fullname} – {$sectionName}";

        if (($module['uservisible'] ?? true) === false) {
            $lockInfo = $this->plainText((string) ($module['availabilityinfo'] ?? ''));
            if ($lockInfo === '') {
                return null;
            }
            $description .= "\nZamčeno: {$lockInfo}";
        }

        $content = $module['contents'][0] ?? [];
        $cmid = (int) $module['id'];

        return [
            'user_id'          => $user->id,
            'subject_id'       => $match->isMatched() ? $match->subject->id : null,
            'moodle_cmid'      => $cmid,
            'moodle_course_id' => $match->courseId,
            'title'            => mb_substr((string) ($module['name'] ?? 'Moodle material'), 0, 255),
            'category'         => 'file',
            'type'             => $modname === 'resource'
                ? $this->typeFromFileName((string) ($content['filename'] ?? ''))
                : 'LINK',
            'url'              => $this->materialUrl($module, $modname, $content, $cmid),
            'size'             => $modname === 'resource'
                ? (isset($content['filesize']) ? FileSize::format((int) $content['filesize']) : null)
                : 'External Link',
            'file_name'        => null,
            'description'      => $description,
        ];
    }

    /**
     * External address for url modules, otherwise the activity page in Moodle.
     */
    private function materialUrl(array $module, string $modname, array $content, int $cmid): string
    {
        $moduleUrl = (string) ($module['url'] ?? '');
        if (! $this->isSafeUrl($moduleUrl)) {
            $moduleUrl = rtrim((string) config('moodle.base_url'), '/') . "/mod/{$modname}/view.php?id={$cmid}";
        }

        if ($modname === 'url') {
            $external = (string) ($content['fileurl'] ?? '');
            if ($this->isSafeUrl($external)) {
                return $external;
            }
        }

        return $moduleUrl;
    }

    private function isSafeUrl(string $url): bool
    {
        if ($url === '' || mb_strlen($url) > self::MAX_URL_LENGTH) {
            return false;
        }

        foreach (self::FORBIDDEN_URL_PARTS as $part) {
            if (stripos($url, $part) !== false) {
                return false;
            }
        }

        return true;
    }

    /**
     * Mirrors getTypeFromFileName in the frontend ResourcesView.
     */
    private function typeFromFileName(string $fileName): string
    {
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        return match (true) {
            $ext === 'pdf'                                                   => 'PDF',
            in_array($ext, ['doc', 'docx', 'rtf', 'odt'], true)              => 'DOC',
            in_array($ext, ['ppt', 'pptx'], true)                            => 'SLIDES',
            in_array($ext, ['txt', 'md'], true)                              => 'NOTES',
            in_array($ext, ['mp4', 'webm', 'mov', 'm4v'], true)              => 'RECORDING',
            in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'], true) => 'SLIDES',
            default                                                          => 'DOC',
        };
    }

    private function plainText(string $html): string
    {
        // Replace tags with spaces so adjacent block elements do not glue words together.
        $text = html_entity_decode(strip_tags((string) preg_replace('/<[^>]*>/', ' $0 ', $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }
}
