<?php

namespace App\Console\Commands;

use App\Models\Material;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * One-off move of uploaded materials from the public disk (served at /storage/...)
 * to the private materials disk (MATERIALS_DISK: local or s3), served only through
 * GET /api/materials/{id}/file.
 * Safe to run again: moved materials are skipped.
 */
class MoveMaterialsToPrivate extends Command
{
    protected $signature = 'materials:move-to-private {--dry-run : Only list what would be moved}';

    protected $description = 'Move uploaded material files from the public disk to the materials disk (MATERIALS_DISK) and update the records';

    public function handle(): int
    {
        $public = Storage::disk('public');
        $private = Material::filesDisk();
        $dryRun = (bool) $this->option('dry-run');
        $moved = $missing = 0;

        $materials = Material::whereNull('file_path')
            ->where('url', 'like', '%/storage/materials/%')
            ->orderBy('id');

        foreach ($materials->lazyById() as $material) {
            $path = $material->legacyPublicPath();
            if ($path === null) {
                continue;
            }

            if (! $public->exists($path)) {
                $missing++;
                $this->warn("#{$material->id}: {$path} is not on the public disk, record left as it is");
                continue;
            }

            if ($dryRun) {
                $moved++;
                $this->line("#{$material->id}: would move {$path}");
                continue;
            }

            // Copy, point the record at the private file, only then remove the public one
            $stream = $public->readStream($path);
            $written = $private->writeStream($path, $stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
            if (! $written || ! $private->exists($path)) {
                $this->error("#{$material->id}: copying {$path} failed");
                return self::FAILURE;
            }

            $material->file_path = $path;
            $material->url = $material->fileUrl();
            $material->save();

            $public->delete($path);
            $moved++;
        }

        $this->info(($dryRun ? 'Would move' : 'Moved')." {$moved} file(s); {$missing} missing on the public disk.");

        return self::SUCCESS;
    }
}
