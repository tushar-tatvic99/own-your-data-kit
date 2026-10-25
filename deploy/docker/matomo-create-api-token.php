#!/usr/bin/env php
<?php
if (!defined('PIWIK_DOCUMENT_ROOT')) {
    define('PIWIK_DOCUMENT_ROOT', '/var/www/html');
}
if (!defined('PIWIK_INCLUDE_PATH')) {
    define('PIWIK_INCLUDE_PATH', PIWIK_DOCUMENT_ROOT);
}
require_once PIWIK_INCLUDE_PATH . '/core/bootstrap.php';

if (!Piwik\Common::isPhpCliMode()) {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

Piwik\FrontController::setUpSafeMode();
Piwik\Plugin\Manager::getInstance()->loadActivatedPlugins();

$login = $argv[1] ?? 'tushartatvic';
$description = $argv[2] ?? 'oydk-kit-' . date('Y-m-d');

$model = new Piwik\Plugins\UsersManager\Model();
$user = $model->getUser($login);
if (empty($user)) {
    fwrite(STDERR, "User not found: $login\n");
    exit(1);
}

$token = \Piwik\Common::getRandomString(32);
$model->addTokenAuth($login, $token, $description, null, null, null);

echo $token . "\n";
