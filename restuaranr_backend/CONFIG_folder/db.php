<?php
// Set your connection details to use the environment variables from docker-compose
$host = getenv('DB_HOST') ?: 'mysql-db'; // Connects to the Docker MySQL container link
$db   = getenv('DB_DATABASE') ?: 'restaurant_db';
$user = getenv('DB_USERNAME') ?: 'root';
$pass = getenv('DB_PASSWORD') ?: 'root';
$charset = 'utf8mb4';

// For Docker setup, port inside the internal container network remains 3306 
// (Even though your PC routes out on 3307!)
$port = '3306'; 

$dsn = "mysql:host=$host;dbname=$db;charset=$charset;port=$port";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Throw a clean message so we see what's wrong in Postman if connection snaps
     http_response_code(500);
     echo json_encode(["message" => "Database connection failed: " . $e->getMessage()]);
     exit;
}