<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class StagStudentController extends Controller
{
    /**
     * Whitelist polí ze STAG student/getStudentInfo => sloupec v users.
     * Jiná pole (číslo karty, bankovní účet, financování, pohlaví...) endpoint nepřijímá.
     */
    private const FIELDS = [
        'nazevSp'                     => 'study_program',
        'kodSp'                       => 'study_program_code',
        'fakultaSp'                   => 'faculty',
        'formaSp'                     => 'study_form',
        'typSp'                       => 'study_type',
        'typSpKey'                    => 'study_type_key',
        'rocnik'                      => 'study_year',
        'stav'                        => 'study_status',
        'studReferentkaPrijmeniJmeno' => 'study_officer_name',
        'studReferentkaEmail'         => 'study_officer_email',
        'studReferentkaTelefon'       => 'study_officer_phone',
    ];

    /**
     * POST /api/stag/sync-student
     * Uloží studijní údaje studenta; ukládá jen pole, která přišla.
     */
    public function sync(Request $request)
    {
        $payload = $request->all();

        if (!is_array($payload) || ($payload !== [] && array_is_list($payload))) {
            return response()->json(['message' => 'Expected a JSON object.'], 422);
        }

        // Neznámá pole odmítneme celá, aby se citlivé údaje omylem nikdy neuložily
        $unknown = array_diff(array_keys($payload), array_keys(self::FIELDS));
        if ($unknown !== []) {
            return response()->json([
                'message' => 'Unknown fields are not accepted.',
                'errors'  => array_fill_keys(array_values($unknown), ['This field is not accepted.']),
            ], 422);
        }

        $request->validate([
            'nazevSp'                     => 'nullable|string|max:255',
            'kodSp'                       => 'nullable|string|max:255',
            'fakultaSp'                   => 'nullable|string|max:255',
            'formaSp'                     => 'nullable|string|max:255',
            'typSp'                       => 'nullable|string|max:255',
            'typSpKey'                    => 'nullable|string|max:255',
            'rocnik'                      => 'nullable|integer|min:0|max:20',
            'stav'                        => 'nullable|string|max:255',
            'studReferentkaPrijmeniJmeno' => 'nullable|string|max:255',
            'studReferentkaEmail'         => 'nullable|string|max:255',
            'studReferentkaTelefon'       => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $updated = [];

        foreach (self::FIELDS as $key => $column) {
            if (!array_key_exists($key, $payload)) {
                continue;
            }
            $value = $payload[$key];
            if ($key === 'rocnik' && $value !== null) {
                $value = (int) $value;
            } elseif (is_string($value)) {
                $value = trim($value) === '' ? null : trim($value);
            }
            $user->{$column} = $value;
            $updated[] = $column;
        }

        $user->study_info_synced_at = now();
        $user->save();

        return response()->json([
            'success' => true,
            'updated' => $updated,
        ]);
    }
}
