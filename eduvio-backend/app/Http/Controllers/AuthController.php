<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Jobs\StagSyncJob;

class AuthController extends Controller
{
    // POST /api/check-availability
    public function checkAvailability(Request $request)
    {
        $request->validate([
            'email'    => 'required|email|unique:users,email',
            'username' => 'required|string|alpha_dash|unique:users,username',
        ]);

        return response()->json(['available' => true]);
    }


    // POST /api/register
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'username' => 'required|string|alpha_dash|unique:users,username',
            'password' => 'required|string|min:8',
            'university_id' => 'nullable|integer',
            'faculty_id' => 'nullable|integer',
            'study_program_id' => 'nullable|integer',
            'academic_year' => 'nullable|integer',
            'stag_student_id' => 'nullable|string',
            'stag_username' => 'nullable|string',
            'stag_password' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'university_id' => $validated['university_id'] ?? null,
            'faculty_id' => $validated['faculty_id'] ?? null,
            'study_program_id' => $validated['study_program_id'] ?? null,
            'academic_year' => $validated['academic_year'] ?? null,
            'stag_student_id' => $validated['stag_student_id'] ?? null,
            'stag_username' => $validated['stag_username'] ?? null,
            'stag_password' => $validated['stag_password'] ?? null,
        ]);

        // Vygenerujeme token, aby byl uživatel po registraci rovnou přihlášen
        $token = $user->createToken('auth_token')->plainTextToken;

        if ($user->stag_username && $user->stag_password) {
            StagSyncJob::dispatch($user);
        }

        return response()->json([
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201); // 201 Created
    }

    // POST /api/login
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Ověření uživatele a hesla
        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Zadané přihlašovací údaje nejsou správné.'],
            ]);
        }

        // Vygenerování nového tokenu
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    // GET /api/user
    public function user(Request $request)
    {
        // Vrací aktuálně přihlášeného uživatele podle Bearer tokenu
        // Wrapped in { user: ... } to match the frontend's expected response shape:
        // const { user: refreshedUser } = response.data
        return response()->json(['user' => $request->user()]);
    }

    // POST /api/logout
    public function logout(Request $request)
    {
        // Smaže token, který byl použit k autorizaci tohoto požadavku
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.'
        ]);
    }
}