<?php

namespace App\Services\Department;

/**
 * Minimal reader of a React Server Components ("Flight") response, as returned
 * by a Next.js server action: rows "ID:JSON\n" and text rows "ID:T<hex length>,<bytes>".
 * References "$<id>" are resolved to other rows, "$$" escapes a dollar,
 * "$D<iso>" (dates) are kept as they are.
 */
class FlightPayload
{
    /** @var array<string, array{text?: string, json?: string}> */
    private array $rows = [];

    public static function parse(string $body): self
    {
        $payload = new self();
        $length = strlen($body);
        $position = 0;

        while ($position < $length) {
            $colon = strpos($body, ':', $position);
            if ($colon === false) {
                break;
            }
            $id = trim(substr($body, $position, $colon - $position));
            if ($id === '' || ! preg_match('/^[0-9a-f]+$/i', $id)) {
                $newline = strpos($body, "\n", $colon);
                $position = $newline === false ? $length : $newline + 1;
                continue;
            }

            if (($body[$colon + 1] ?? '') === 'T') {
                $comma = strpos($body, ',', $colon);
                if ($comma === false) {
                    break;
                }
                $bytes = hexdec(substr($body, $colon + 2, $comma - $colon - 2));
                $payload->rows[$id] = ['text' => substr($body, $comma + 1, $bytes)];
                $position = $comma + 1 + $bytes;
                continue;
            }

            $newline = strpos($body, "\n", $colon);
            $end = $newline === false ? $length : $newline;
            $payload->rows[$id] = ['json' => substr($body, $colon + 1, $end - $colon - 1)];
            $position = $end + 1;
        }

        return $payload;
    }

    /**
     * The value the action returned: row 0 is {"a": "$@<id>", ...}.
     */
    public function result(): mixed
    {
        // Rows are resolved when read, so "a" already holds the referenced value
        $root = $this->row('0');

        return is_array($root) ? ($root['a'] ?? null) : null;
    }

    private function row(string $id, int $depth = 0): mixed
    {
        $row = $this->rows[$id] ?? null;
        if ($row === null) {
            return null;
        }
        if (array_key_exists('text', $row)) {
            return $row['text'];
        }
        $decoded = json_decode($row['json'], true);

        return $depth > 20 ? $decoded : $this->resolve($decoded, $depth + 1);
    }

    private function resolve(mixed $value, int $depth = 0): mixed
    {
        if (is_array($value)) {
            return array_map(fn ($item) => $this->resolve($item, $depth), $value);
        }
        if (! is_string($value) || ! str_starts_with($value, '$')) {
            return $value;
        }
        if (str_starts_with($value, '$$')) {
            return substr($value, 1);
        }
        if (preg_match('/^\$@?([0-9a-f]+)$/i', $value, $m)) {
            return $this->row(strtolower($m[1]), $depth);
        }
        if ($value === '$undefined') {
            return null;
        }

        return $value; // "$D…" dates and other markers stay as they are
    }
}
