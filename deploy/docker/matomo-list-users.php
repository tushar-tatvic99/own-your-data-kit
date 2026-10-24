#!/usr/bin/env php
<?php
define('PIWIK_DOCUMENT_ROOT', '/var/www/html');
require_once PIWIK_DOCUMENT_ROOT . '/bootstrap.php';
require_once PIWIK_DOCUMENT_ROOT . '/core/bootstrap.php';
Piwik\Plugin\Manager::getInstance()->loadActivatedPlugins();
$model = new Piwik\Plugins\UsersManager\Model();
foreach ($model->getUsers() as $u) {
    echo $u['login'] . "\n";
}
