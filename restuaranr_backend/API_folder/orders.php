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
    
    // 1. Validate that authentication details are passed along with the cart
    if (!isset($input['username']) || !isset($input['phone_number'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Authentication details missing. You must log in before ordering."]);
        exit;
    }

    if (!isset($input['cart_items'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid order data. cart_items is required."]);
        exit;
    }

    // Clean data variables matching your database constraints
    $username = trim($input['username']);
    $phone_number = trim($input['phone_number']);
    
    // If incoming cart items are passed as a JSON string from frontend, decode it safely
    $cart_data = is_array($input['cart_items']) ? $input['cart_items'] : json_decode($input['cart_items'], true);

    if (!is_array($cart_data)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Malformed cart items payload format."]);
        exit;
    }

    try {
        $calculated_total = 0.00;
        $verified_cart_items = [];

        foreach ($cart_data as $item) {
            $name = $item['name'] ?? '';
            $qty = intval($item['qty'] ?? 0);
            $size = $item['size'] ?? 'Large';

            if (empty($name) || $qty <= 0) {
                continue;
            }

            // Fetch current updated price from menu_items table
            $stmt = $pdo->prepare("SELECT price FROM menu_items WHERE name = ? LIMIT 1");
            $stmt->execute([$name]);
            $menu_item = $stmt->fetch();

            if ($menu_item) {
                $db_base_price = floatval($menu_item['price']); 
                
                // Calculate final size based pricing rules
                $final_size_price = $db_base_price; 
                $clean_size = strtolower(trim($size));

                if ($clean_size === 'medium') {
                    $final_size_price = $db_base_price * 0.80; 
                } elseif ($clean_size === 'small') {
                    $final_size_price = ($db_base_price * 0.80) * 0.90; 
                }
                
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
                echo json_encode(["status" => "error", "message" => "Item '$name' does not exist."]);
                exit;
            }
        }

        if (empty($verified_cart_items)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Cart is empty."]);
            exit;
        }

        // 2. Save order tracking matching your explicit column names
        $sql = "INSERT INTO orders (username, phone_number, cart_items, total_amount) VALUES (?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        
        $json_cart = json_encode($verified_cart_items);
        $stmt->execute([$username, $phone_number, $json_cart, round($calculated_total, 2)]);

        $order_id = $pdo->lastInsertId();

        http_response_code(201); // Keeping 201 Created status code intact
        echo json_encode([
            "status" => "success",
            "message" => "Success! Order received by the restaurant database.",
            "order_id" => $order_id,
            "auto_calculated_total" => round($calculated_total, 2)
        ]);

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Failed to save order: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
?>