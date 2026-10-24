<?php
$password = $argv[1] ?? 'MatomoLocal2026';
$storedHash = trim($argv[2] ?? '');
$md5 = md5($password);
echo password_verify($md5, $storedHash) ? "auth_ok\n" : "auth_fail\n";
