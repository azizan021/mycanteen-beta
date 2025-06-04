<?php
require_once 'config.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);

        if (empty($data['customerInfo']) || empty($data['items']) || !isset($data['subtotal']) || !isset($data['total'])) {
            echo json_encode(['error' => 'Invalid data provided for order']);
            exit();
        }

        try {
            $conn->beginTransaction();

            // Set status awal pesanan menjadi 'pending' (setelah pembayaran, nanti diubah ke 'paid')
            $stmt = $conn->prepare("INSERT INTO orders (customer_name, delivery_address, notes, subtotal, service_fee, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([
                $data['customerInfo']['name'],
                $data['customerInfo']['address'],
                $data['customerInfo']['notes'] ?? '',
                $data['subtotal'],
                $data['serviceFee'] ?? 2000,
                $data['total'],
                $data['paymentMethod'] ?? 'QRIS'
            ]);

            $order_id = $conn->lastInsertId();

            // Simpan order items
            foreach ($data['items'] as $item) {
                $stmt = $conn->prepare("INSERT INTO order_items (order_id, canteen_id, canteen_name, menu_id, menu_name, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $order_id,
                    $item['canteenId'],
                    $item['canteenName'],
                    $item['menuId'],
                    $item['menuName'],
                    $item['price'],
                    $item['quantity']
                ]);
            }

            $conn->commit();
            echo json_encode(['success' => true, 'order_id' => $order_id]);

        } catch (Exception $e) {
            $conn->rollBack();
            error_log("Order Placement Error: " . $e->getMessage());
            echo json_encode(['error' => 'Failed to place order: ' . $e->getMessage()]);
        }
        break;

    case 'GET': // <<< TAMBAH FUNGSI GET
        $order_id = isset($_GET['order_id']) ? $_GET['order_id'] : null;
        $role = isset($_GET['role']) ? $_GET['role'] : null; // Digunakan untuk memastikan request dari role yang benar

        if (!$order_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Order ID is required.']);
            exit();
        }

        try {
            // Ambil detail pesanan utama
            $stmt = $conn->prepare("SELECT id as order_id, customer_name, delivery_address, notes, subtotal, service_fee, total, payment_method, status, order_date, courier_id FROM orders WHERE id = ?");
            $stmt->execute([$order_id]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($order) {
                // Ambil item-item pesanan
                $itemStmt = $conn->prepare("SELECT menu_name, quantity, price, canteen_name FROM order_items WHERE order_id = ?");
                $itemStmt->execute([$order_id]);
                $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode(['success' => true, 'order' => $order]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Order not found.']);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            error_log("Order API DB Error (GET): " . $e->getMessage());
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed.']);
        break;
}
?>