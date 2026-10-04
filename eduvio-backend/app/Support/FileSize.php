<?php

namespace App\Support;

class FileSize
{
    /**
     * Human readable size, e.g. "512 B", "1.5 MB".
     */
    public static function format(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes . ' B';
        }
        $units = ['KB', 'MB', 'GB'];
        $size = $bytes / 1024;
        $unitIndex = 0;
        while ($size >= 1024 && $unitIndex < count($units) - 1) {
            $size /= 1024;
            $unitIndex++;
        }
        return round($size, 1) . ' ' . $units[$unitIndex];
    }
}
