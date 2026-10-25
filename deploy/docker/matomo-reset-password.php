#!/usr/bin/env php
<?php

if (!defined('PIWIK_DOCUMENT_ROOT')) {
    define('PIWIK_DOCUMENT_ROOT', '/var/www/html');
}
if (!defined('PIWIK_INCLUDE_PATH')) {
    define('PIWIK_INCLUDE_PATH', PIWIK_DOCUMENT_ROOT);
}
if (file_exists(PIWIK_DOCUMENT_ROOT . '/bootstrap.php')) {
    require_once PIWIK_DOCUMENT_ROOT . '/bootstrap.php';
}

require_once PIWIK_INCLUDE_PATH . '/core/bootstrap.php';

Piwik\Plugin\Manager::getInstance()->loadActivatedPlugins();

$login = $argv[1] ?? 'tushartatvic';
$password = $argv[2] ?? 'MatomoLocal2026';

$model = new Piwik\Plugins\UsersManager\Model();
$user = $model->getUser($login);
if (empty($user)) {
    fwrite(STDERR, "User not found: $login\n");
    exit(1);
}

$passwordHasher = new Piwik\Auth\Password();
$hash = $passwordHasher->hash($password);

$model->updateUser(
    $login,
    $hash,
    $user['email'],
    (int) $user['superuser_access'],
    $user['invited_by'] ?? null
);

// Verify via Matomo auth
$auth = Piwik\Plugins\Login\Auth::factory();
$auth->setLogin($login);
$auth->setPassword($password);
$result = $auth->authenticate();

if ($result->isAuthenticated()) {
    echo "OK: password updated and auth verified for $login\n";
    exit(0);
}

fwrite(STDERR, "FAIL: auth not verified - " . $result->getCode() . "\n");
exit(1);
