<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../CONFIG_folder/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($input['cart_items']) || !is_array($input['cart_items'])) {
        http_response_code(400);
        echo json_encode(["message" => "Invalid order data. cart_items is required."]);
        exit;
    }

    try {
        $calculated_total = 0.00;
        $verified_cart_items = [];

        foreach ($input['cart_items'] as $item) {
            $name = $item['name'] ?? '';
            $qty = intval($item['qty'] ?? 0);
            $size = $item['size'] ?? 'Large';

            if (empty($name) || $qty <= 0) {
                continue;
            }

            // 1. Fetch your current updated price from menu_items table
            $stmt = $pdo->prepare("SELECT price FROM menu_items WHERE name = ? LIMIT 1");
            $stmt->execute([$name]);
            $menu_item = $stmt->fetch();

            if ($menu_item) {
                // This will be exactly 13.50 for Red Smoothie
                $db_base_price = floatval($menu_item['price']); 
                
                // 2. Calculate final price based strictly on the current database price
                $final_size_price = $db_base_price; 
                $clean_size = strtolower(trim($size));

                if ($clean_size === 'medium') {
                    $final_size_price = $db_base_price * 0.80; // 80% of current database price
                } elseif ($clean_size === 'small') {
                    $final_size_price = ($db_base_price * 0.80) * 0.90; // 72% of current database price
                }
                
                // Keep values clean to 2 decimal places
                $final_size_price = round($final_size_price, 2);
                $item_total = $final_size_price * $qty;
                $calculated_total += $item_total;

                $verified_cart_items[] = [
                    "name" => $name,
                    "qty" => $qty,
                    "price" => $final_size_price, 
                    "size" => $size,
                    "subtotal" => round($item_total, 2)
                ];
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Item '$name' does not exist."]);
                exit;
            }
        }

        if (empty($verified_cart_items)) {
            http_response_code(400);
            echo json_encode(["message" => "Cart is empty."]);
            exit;
        }

        // 3. Save order using your new calculation rules
        $sql = "INSERT INTO orders (cart_items, total_amount) VALUES (?, ?)";
        $stmt = $pdo->prepare($sql);
        
        $json_cart = json_encode($verified_cart_items);
        $stmt->execute([$json_cart, round($calculated_total, 2)]);

        $order_id = $pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            "message" => "Success! Order received by the restaurant database.",
            "order_id" => $order_id,
            "auto_calculated_total" => round($calculated_total, 2)
        ]);

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Failed to save order: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
}