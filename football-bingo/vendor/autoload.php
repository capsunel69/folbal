<?php
   error_reporting(E_ALL);
   ini_set('display_errors', 1);
   
   require_once __DIR__ . '/Psr/Log/LoggerAwareInterface.php';
   require_once __DIR__ . '/Psr/Log/LoggerInterface.php';
   require_once __DIR__ . '/Psr/Log/LoggerAwareTrait.php';

   require_once __DIR__ . '/pusher/pusher-php-server/src/PusherInterface.php';
   require_once __DIR__ . '/pusher/pusher-php-server/src/Pusher.php';
   require_once __DIR__ . '/pusher/pusher-php-server/src/PusherCrypto.php';
   require_once __DIR__ . '/pusher/pusher-php-server/src/PusherException.php';
   require_once __DIR__ . '/pusher/pusher-php-server/src/PusherInstance.php';
