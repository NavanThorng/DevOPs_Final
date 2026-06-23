<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../CONFIG_folder/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    // Validate that all required properties are sent from our JavaScript form
    if (!isset($input['phone_number']) || !isset($input['username']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Phone number, username, and password are required fields."]);
        exit;
    }

    $phone_number = trim($input['phone_number']);
    $username = trim($input['username']);
    $password = trim($input['password']);

    if (empty($phone_number) || empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Fields cannot be blank."]);
        exit;
    }

    try {
        // 1. Check if a user with this phone number already exists in the table
        $checkStmt = $pdo->prepare("SELECT * FROM users WHERE phone_number = ? LIMIT 1");
        $checkStmt->execute([$phone_number]);
        $existingUser = $checkStmt->fetch();

        if ($existingUser) {
            // 2. User exists: Proceed as a regular login validation check
            // Note: If you choose to use password_hash() later, swap this for password_verify()
            if ($existingUser['username'] === $username && $existingUser['password'] === $password) {
                http_response_code(200);
                echo json_encode([
                    "status" => "success",
                    "message" => "🔐 Login Successful! Welcome back, " . $username
                ]);
            } else {
                http_response_code(401);
                echo json_encode([
                    "status" => "error",
                    "message" => "Incorrect username or password associated with this phone number."
                ]);
            }
        } else {
            // 3. User does not exist: Fill it out and post it to the users table seamlessly
            $insertStmt = $pdo->prepare("INSERT INTO users (phone_number, username, password) VALUES (?, ?, ?)");
            $insertStmt->execute([$phone_number, $username, $password]);

            http_response_code(201);
            echo json_encode([
                "status" => "success",
                "message" => "✨ Account created successfully! Welcome, " . $username
            ]);
        }

    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database exception: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
?>