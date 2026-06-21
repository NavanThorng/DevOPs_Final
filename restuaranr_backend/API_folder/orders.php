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
    // 1. Read the raw JSON input data
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($input['cart_items']) || !is_array($input['cart_items'])) {
        http_response_code(400);
        echo json_encode(["message" => "Invalid order data. cart_items is required."]);
        exit;
    }

    try {
        $calculated_total = 0.00;
        $verified_cart_items = [];

        // 2. Loop through each item in the cart to verify and auto-calculate prices
        foreach ($input['cart_items'] as $item) {
            $name = $item['name'] ?? '';
            $qty = intval($item['qty'] ?? 0);
            $size = $item['size'] ?? 'Medium';

            if (empty($name) || $qty <= 0) {
                continue; // Skip invalid items
            }

            // 3. Fetch the official price from your menu_items table
            $stmt = $pdo->prepare("SELECT price FROM menu_items WHERE name = ? LIMIT 1");
            $stmt->execute([$name]);
            $menu_item = $stmt->fetch();

            if ($menu_item) {
                $official_price = floatval($menu_item['price']);
                
                // Calculate total for this specific food item
                $item_total = $official_price * $qty;
                $calculated_total += $item_total;

                // Build a secure, clean record for database log saving
                $verified_cart_items[] = [
                    "name" => $name,
                    "qty" => $qty,
                    "price" => $official_price,
                    "size" => $size,
                    "subtotal" => $item_total
                ];
            } else {
                // Optional: handle if a food item name doesn't match your database records
                http_response_code(400);
                echo json_encode(["message" => "Item '$name' does not exist in our menu database."]);
                exit;
            }
        }

        if (empty($verified_cart_items)) {
            http_response_code(400);
            echo json_encode(["message" => "Cart is empty or contains invalid items."]);
            exit;
        }

        // 4. Save the order to the database using our secure calculated total amount
        $sql = "INSERT INTO orders (cart_items, total_amount) VALUES (?, ?)";
        $stmt = $pdo->prepare($sql);
        
        // Convert the verified cart array back to a string format for text storage
        $json_cart = json_encode($verified_cart_items);
        $stmt->execute([$json_cart, $calculated_total]);

        $order_id = $pdo->lastInsertId();

        // 5. Respond back with the success alert data and show the calculated total
        http_response_code(201);
        echo json_encode([
            "message" => "Success! Order received by the restaurant database.",
            "order_id" => $order_id,
            "auto_calculated_total" => $calculated_total
        ]);

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Failed to save order: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed. Use POST requests."]);
}