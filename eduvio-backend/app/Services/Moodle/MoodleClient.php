<?php

namespace App\Services\Moodle;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class MoodleClient
{
    private string $baseUrl;

    public function __construct(string $baseUrl, private string $wstoken)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /**
     * Call a Moodle Web Services function via the REST protocol.
     *
     * Array parameters are serialized as `name[0]=a&name[1]=b`, which is the
     * format Moodle REST expects. Errors never contain the token or request URL.
     *
     * @throws MoodleApiException
     */
    public function call(string $function, array $params = []): array
    {
        $query = array_merge($this->normalizeParams($params), [
            'wstoken'            => $this->wstoken,
            'wsfunction'         => $function,
            'moodlewsrestformat' => 'json',
        ]);

        try {
            $response = Http::timeout(15)->get("{$this->baseUrl}/webservice/rest/server.php", $query);
        } catch (ConnectionException $e) {
            // The underlying message includes the full URL (with the token) — do not propagate it.
            throw new MoodleApiException('connection_error', "Moodle request {$function} failed: connection error.");
        }

        if (! $response->successful()) {
            throw new MoodleApiException('http_error', "Moodle request {$function} failed with HTTP {$response->status()}.");
        }

        $data = $response->json();

        if (! is_array($data)) {
            throw new MoodleApiException('invalid_response', "Moodle request {$function} returned an invalid response.");
        }

        if (isset($data['exception']) || isset($data['errorcode'])) {
            throw new MoodleApiException(
                (string) ($data['errorcode'] ?? 'unknown'),
                (string) ($data['message'] ?? 'Unknown Moodle error.'),
            );
        }

        return $data;
    }

    /**
     * Re-index list arrays so they serialize as name[0], name[1], ... regardless of keys.
     */
    private function normalizeParams(array $params): array
    {
        foreach ($params as $key => $value) {
            if (is_array($value)) {
                $value = $this->normalizeParams($value);
                $onlyIntKeys = $value === [] || count(array_filter(array_keys($value), 'is_int')) === count($value);
                $params[$key] = $onlyIntKeys ? array_values($value) : $value;
            }
        }

        return $params;
    }
}
