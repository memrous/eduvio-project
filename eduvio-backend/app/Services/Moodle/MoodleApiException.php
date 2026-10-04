<?php

namespace App\Services\Moodle;

use RuntimeException;

class MoodleApiException extends RuntimeException
{
    public function __construct(
        public readonly string $errorcode,
        string $message = '',
    ) {
        parent::__construct($message !== '' ? $message : $errorcode);
    }
}
