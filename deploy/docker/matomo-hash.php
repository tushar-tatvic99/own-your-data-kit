<?php
$password = $argv[1] ?? 'MatomoLocal2026';
$md5 = md5($password);
$hash = password_hash($md5, PASSWORD_BCRYPT, ['cost' => 12]);
echo $hash . "\n";
echo (password_verify($md5, $hash) ? "verify_ok\n" : "verify_fail\n");
