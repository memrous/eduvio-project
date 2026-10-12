<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/check-availability (registration form only; closed with registration)
    public function checkAvailability(Request $request)
    {
        if ($closed = $this->registrationClosed()) {
            return $closed;
        }

        $request->validate([
            'email'    => ['required', 'email', 'unique:users,email', $this->allowedDomainRule()],
            'username' => 'required|string|alpha_dash|unique:users,username',
        ]);

        return response()->json(['available' => true]);
    }


    // POST /api/register
    // Jen údaje účtu; studijní údaje dodává STAG sync (POST /stag/sync-student)
    public function register(Request $request)
    {
        if ($closed = $this->registrationClosed()) {
            return $closed;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'unique:users,email', $this->allowedDomainRule()],
            'username' => 'required|string|alpha_dash|unique:users,username',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // Vygenerujeme token, aby byl uživatel po registraci rovnou přihlášen
        $token = $user->createToken('auth_token')->plainTextToken;

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

    // ── Registration switch (config/registration.php) ────────────

    /** 403 while self-registration is turned off, otherwise null. */
    private function registrationClosed(): ?JsonResponse
    {
        if (config('registration.enabled')) {
            return null;
        }

        return response()->json([
            'error'   => 'registration_disabled',
            'message' => 'Registration is disabled.',
        ], 403);
    }

    /** E-mail must be in one of REGISTRATION_ALLOWED_DOMAINS (when any are set). */
    private function allowedDomainRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) {
            $domains = config('registration.allowed_domains', []);
            if ($domains === [] || ! is_string($value)) {
                return;
            }
            $domain = strtolower((string) substr(strrchr($value, '@') ?: '', 1));
            if (! in_array($domain, $domains, true)) {
                $fail('Registration is limited to e-mail addresses at: '.implode(', ', $domains).'.');
            }
        };
    }
}
