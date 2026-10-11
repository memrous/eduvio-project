<?php

use App\Services\Department\CourseLinkFinder;
use App\Services\Department\PersonNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Automatic semester links get no stored (Czech) title: the app shows the
 * subject name and translated labels. The person's role is stored instead.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->string('title')->nullable()->change();
            $table->string('source_role')->nullable(); // guarantor, lecturer, tutor
        });

        $links = DB::table('resources')
            ->where('category', 'platform')
            ->where('link_source', 'auto')
            ->get(['id', 'subject_id', 'source_person']);

        foreach ($links as $link) {
            DB::table('resources')->where('id', $link->id)->update([
                'title'       => null,
                'source_role' => $this->roleOf($link->subject_id, $link->source_person),
            ]);
        }
    }

    public function down(): void
    {
        $links = DB::table('resources')->whereNull('title')->get(['id', 'source_person']);
        foreach ($links as $link) {
            $surname = $link->source_person ? PersonNames::surname($link->source_person) : '';
            DB::table('resources')->where('id', $link->id)->update([
                'title' => trim("Stránka předmětu – {$surname}", ' –'),
            ]);
        }

        Schema::table('resources', function (Blueprint $table) {
            $table->dropColumn('source_role');
            $table->string('title')->nullable(false)->change();
        });
    }

    /**
     * Role under which the person is listed first on the subject, if any.
     */
    private function roleOf(?int $subjectId, ?string $person): ?string
    {
        if ($subjectId === null || $person === null) {
            return null;
        }

        $subject = \App\Models\Subject::find($subjectId);
        if ($subject === null) {
            return null;
        }

        $key = PersonNames::normalize($person);
        foreach (CourseLinkFinder::subjectPeopleWithRoles($subject) as ['name' => $name, 'role' => $role]) {
            if (PersonNames::normalize($name) === $key) {
                return $role;
            }
        }

        return null;
    }
};
