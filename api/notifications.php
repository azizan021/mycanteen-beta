<?php
require_once 'config.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Endpoint ini digunakan untuk mengambil notifikasi/pesanan berdasarkan peran (kurir/kantin)
// dan juga untuk memperbarui status pesanan (PUT).

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $role = isset($_GET['role']) ? $_GET['role'] : 'courier'; // Bisa 'courier' atau 'canteen'
    $status_filter = isset($_GET['status']) ? $_GET['status'] : null;

    $allowed_statuses_for_courier_fetch = [
        'paid',               // Pesanan sudah dibayar, siap diproses/diambil
        'processing',         // Sedang diproses kantin
        'ready_for_pickup',   // Siap diambil kurir
        'assigned_to_courier',// Sudah diambil kurir
        'on_delivery'         // Sedang diantar
    ];

    $allowed_statuses_for_canteen_fetch = [
        'pending',            // Belum diproses kantin (baru masuk/belum dibayar)
        'paid',               // Sudah dibayar, siap diproses kantin
        'processing',         // Sedang diproses
        'ready_for_pickup'    // Siap diambil kurir (setelah diproses kantin)
    ];

    $target_statuses = ($role === 'courier') ? $allowed_statuses_for_courier_fetch : $allowed_statuses_for_canteen_fetch;

    $status_clause = "";
    $params = [];

    if ($status_filter) {
        $requested_statuses = explode('_or_', $status_filter);
        $valid_statuses_to_fetch = array_intersect($requested_statuses, $target_statuses);

        if (!empty($valid_statuses_to_fetch)) {
            $placeholders = implode(',', array_fill(0, count($valid_statuses_to_fetch), '?'));
            $status_clause = " WHERE o.status IN ($placeholders)";
            $params = $valid_statuses_to_fetch;
        } else {
            echo json_encode(['success' => true, 'notifications' => []]);
            exit();
        }
    } else {
        // Default: Ambil status yang paling relevan untuk peran tersebut
        $placeholders = implode(',', array_fill(0, count($target_statuses), '?'));
        $status_clause = " WHERE o.status IN ($placeholders)";
        $params = $target_statuses;
    }

    try {
        $stmt = $conn->prepare("
            SELECT o.id as order_id, o.customer_name, o.delivery_address, o.notes, o.total, o.status, o.order_date, o.courier_id
            FROM orders o
            $status_clause
            ORDER BY o.order_date DESC
            LIMIT 20
        ");
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($orders as &$order) {
            $itemStmt = $conn->prepare("SELECT menu_name, quantity, price FROM order_items WHERE order_id = ?");
            $itemStmt->execute([$order['order_id']]);
            $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode(['success' => true, 'notifications' => $orders]);

    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Notifications API DB Error (GET): " . $e->getMessage());
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }

} else if ($method == 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);

    $order_id = $data['order_id'] ?? null;
    $status = $data['status'] ?? null;
    $courier_id = $data['courier_id'] ?? null; // ID kurir yang melakukan aksi (bisa null jika dari kantin)

    if (!$order_id || !$status) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID and status are required.']);
        exit();
    }

    // Daftar status valid yang bisa diubah (penting untuk keamanan)
    $valid_status_transitions = [
        'pending' => ['paid', 'cancelled'],
        'paid' => ['processing', 'cancelled'],
        'processing' => ['ready_for_pickup', 'cancelled'],
        'ready_for_pickup' => ['assigned_to_courier', 'cancelled'],
        'assigned_to_courier' => ['on_delivery', 'failed_delivery', 'cancelled', 'ready_for_pickup'], // ready_for_pickup jika kurir membatalkan penerimaan
        'on_delivery' => ['delivered', 'failed_delivery', 'cancelled'],
        'delivered' => [], // Sudah final, tidak bisa diubah lagi dari sini
        'cancelled' => [],
        'failed_delivery' => ['cancelled'], // Bisa dibatalkan setelah gagal
        'rejected_by_courier' => ['ready_for_pickup'] // Jika pesanan ditolak kurir, kembali ke siap diambil
    ];

    // Dapatkan status saat ini dari database
    $current_status_stmt = $conn->prepare("SELECT status FROM orders WHERE id = ?");
    $current_status_stmt->execute([$order_id]);
    $current_status_row = $current_status_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$current_status_row) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found.']);
        exit();
    }

    $current_status = $current_status_row['status'];

    // Validasi transisi status
    if (!isset($valid_status_transitions[$current_status]) || !in_array($status, $valid_status_transitions[$current_status])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid status transition from ' . $current_status . ' to ' . $status]);
        exit();
    }

    try {
        $stmt = $conn->prepare("UPDATE orders SET status = ?, courier_id = ? WHERE id = ?");
        $stmt->execute([$status, $courier_id, $order_id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Order status updated successfully.']);
        } else {
            http_response_code(400); // Bad request if no rows updated (e.g. status already the same)
            echo json_encode(['error' => 'Order status not changed or already set.']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Notifications API DB Error (PUT): " . $e->getMessage());
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method not allowed.']);
}
?>