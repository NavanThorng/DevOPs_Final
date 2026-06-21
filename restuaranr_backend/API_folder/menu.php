<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

require_once __DIR__ . '/../CONFIG_folder/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM menu_items");
        $items = $stmt->fetchAll();
        
        http_response_code(200);
        echo json_encode($items);
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Failed to read database records."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed. Use GET."]);
}