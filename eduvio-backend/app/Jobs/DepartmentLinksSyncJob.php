<?php

namespace App\Jobs;

use App\Models\Material;
use App\Models\Subject;
use App\Models\User;
use App\Services\Department\CourseLinkFinder;
use App\Services\Department\PageLinkTracker;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Finds course pages on department websites for one user's subjects and keeps
 * them as semester materials (category "platform", link_source "auto").
 * Manual links are never changed or removed.
 */
class DepartmentLinksSyncJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 900; // one request per second over many teacher pages
    public int $uniqueFor = 3600;

    public User $user;

    public function __construct(User $user)
    {
        $this->user = $user;
    }

    public function uniqueId(): string
    {
        return (string) $this->user->id;
    }

    public static function statusKey(int $userId): string
    {
        return "department-links:status:{$userId}";
    }

    /**
     * Subjects of departments listed in config('departments.allowed').
     */
    public static function allowedSubjects(User $user): Collection
    {
        $departments = array_map('strtoupper', array_keys((array) config('departments.allowed', [])));

        return $user->subjects()
            ->whereNotNull('department')
            ->whereNotNull('code')
            ->whereNull('stag_removed_at')
            ->get()
            ->filter(fn (Subject $subject) => in_array(strtoupper(trim($subject->department)), $departments, true))
            ->values();
    }

    /**
     * Queue a sync when the user has subjects of a supported department.
     */
    public static function dispatchForUser(User $user): void
    {
        if (self::allowedSubjects($user)->isNotEmpty() || self::semesterLinks($user)->isNotEmpty()) {
            self::dispatch($user);
        }
    }

    /**
     * All semester links of the user (automatic and manual).
     */
    public static function semesterLinks(User $user): Collection
    {
        $subjectIds = $user->subjects()->pluck('id');

        return Material::where('category', 'platform')
            ->where(fn ($query) => $query->where('user_id', $user->id)->orWhereIn('subject_id', $subjectIds))
            ->get();
    }

    public function handle(CourseLinkFinder $finder, PageLinkTracker $tracker): void
    {
        $this->setStatus('pending');

        $found = 0;
        $failures = 0;
        $subjects = self::allowedSubjects($this->user);
        foreach ($subjects as $subject) {
            $baseUrl = config('departments.allowed.' . strtoupper(trim($subject->department)) . '.base_url');

            try {
                $result = $finder->find($subject, $baseUrl);
                $found += $this->syncSubject($subject, $result['candidates'], $result['complete']);
            } catch (\Throwable $e) {
                $failures++;
                // One failing page must not stop the other subjects; never log page content
                Log::warning("Department links sync failed for subject {$subject->id} of user {$this->user->id}", [
                    'error' => mb_substr($e->getMessage(), 0, 300),
                ]);
            }
        }

        $newLinks = $this->checkPages($tracker);

        $this->setStatus($failures > 0 && $failures === $subjects->count() ? 'failed' : 'success');
        Log::info("Department links sync for user {$this->user->id}: {$found} links, {$newLinks} new page links");
    }

    /**
     * Look for new files and subpages on every semester link. Besides the
     * configured domains, only hosts of automatic links (found on department
     * pages) are fetched — a manual link elsewhere is never requested.
     */
    private function checkPages(PageLinkTracker $tracker): int
    {
        $links = self::semesterLinks($this->user);
        $extraHosts = $links
            ->where('link_source', 'auto')
            ->map(fn (Material $m) => strtolower((string) parse_url((string) $m->url, PHP_URL_HOST)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $newLinks = 0;
        foreach ($links as $material) {
            try {
                $newLinks += $tracker->check($material, $extraHosts);
            } catch (\Throwable $e) {
                Log::warning("Page check failed for material {$material->id}", [
                    'error' => mb_substr($e->getMessage(), 0, 300),
                ]);
            }
        }

        return $newLinks;
    }

    public function failed(?\Throwable $exception): void
    {
        $this->setStatus('failed');
    }

    /**
     * @param  list<array{url: string, person: string, surname: string, role: string}>  $candidates
     * @return int number of auto links kept for the subject
     */
    private function syncSubject(Subject $subject, array $candidates, bool $complete): int
    {
        $existing = Material::where('subject_id', $subject->id)
            ->where('category', 'platform')
            ->get();

        $manualUrls = $existing
            ->filter(fn (Material $m) => $m->link_source !== 'auto')
            ->pluck('url')
            ->all();

        $keptUrls = [];
        foreach ($candidates as $candidate) {
            if (strlen($candidate['url']) > 255 || in_array($candidate['url'], $manualUrls, true)) {
                continue;
            }

            // No stored title: the app shows the subject name and translated labels
            $attributes = [
                'title'           => null,
                'type'            => 'LINK',
                'source_person'   => $candidate['person'],
                'source_role'     => $candidate['role'],
                'last_checked_at' => now(),
            ];

            $material = $existing->first(fn (Material $m) => $m->link_source === 'auto' && $m->url === $candidate['url']);
            if ($material) {
                $material->update($attributes);
            } else {
                Material::create($attributes + [
                    'user_id'     => $this->user->id,
                    'subject_id'  => $subject->id,
                    'url'         => $candidate['url'],
                    'category'    => 'platform',
                    'link_source' => 'auto',
                    'size'        => 'External Link',
                ]);
            }
            $keptUrls[] = $candidate['url'];
        }

        // Remove auto links that disappeared, but only when every page was checked
        if ($complete) {
            $existing
                ->filter(fn (Material $m) => $m->link_source === 'auto' && ! in_array($m->url, $keptUrls, true))
                ->each(fn (Material $m) => $m->delete());
        }

        return count($keptUrls);
    }

    private function setStatus(string $status): void
    {
        Cache::put(self::statusKey($this->user->id), [
            'status'      => $status,
            'finished_at' => $status === 'pending' ? null : now()->toIso8601String(),
        ], now()->addDays(30));
    }
}
