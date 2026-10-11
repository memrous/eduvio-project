<?php

namespace App\Services\Department;

use RuntimeException;

/**
 * A department page could not be fetched (network error, server error,
 * redirect loop). The outcome is unknown, unlike a missing or disallowed page.
 */
class DepartmentFetchException extends RuntimeException
{
}
