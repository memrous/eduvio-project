<?php
// Quick diagnostic script - run with: ./vendor/bin/sail artisan tinker < test_login.php
$result = DB::select('SELECT id, name, email FROM users LIMIT 5');
echo json_encode($result, JSON_PRETTY_PRINT) . PHP_EOL;
