<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Ambil semua kantin
        $stmt = $conn->prepare("SELECT * FROM canteens");
        $stmt->execute();
        $canteens = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Untuk setiap kantin, ambil 2 menu pertama
        foreach ($canteens as &$canteen) {
            $menuStmt = $conn->prepare("SELECT * FROM menus WHERE canteen_id = ? LIMIT 2");
            $menuStmt->execute([$canteen['id']]);
            $canteen['menus'] = $menuStmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        echo json_encode($canteens);
        break;
}
?>