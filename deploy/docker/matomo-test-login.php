<?php
require_once '/var/www/html/plugins/UsersManager/UsersManager.php';
require_once '/var/www/html/core/Auth/Password.php';
require_once '/var/www/html/plugins/UsersManager/Model.php';

use Piwik\Auth\Password;
use Piwik\Plugins\UsersManager\Model;
use Piwik\Plugins\UsersManager\UsersManager;

$login = $argv[1] ?? 'tushartatvic';
$password = $argv[2] ?? 'MatomoLocal2026';

$model = new Model();
$user = $model->getUser($login);
if (empty($user['login'])) {
    echo "user_not_found\n";
    exit(1);
}

$prehash = UsersManager::getPasswordHash($password);
$ok = (new Password())->verify($prehash, $user['password']);
echo $ok ? "auth_ok\n" : "auth_fail\n";
