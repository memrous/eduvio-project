<?php

use App\Http\Controllers\StagAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/stag/callback', [StagAuthController::class, 'callback']);
