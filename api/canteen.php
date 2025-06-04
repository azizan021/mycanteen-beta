<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? $_GET['id'] : null;

if ($method == 'GET' && $id) {
    // Ambil detail kantin
    $stmt = $conn->prepare("SELECT * FROM canteens WHERE id = ?");
    $stmt->execute([$id]);
    $canteen = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($canteen) {
        // Ambil semua menu kantin
        $menuStmt = $conn->prepare("SELECT * FROM menus WHERE canteen_id = ?");
        $menuStmt->execute([$id]);
        $canteen['menus'] = $menuStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($canteen);
    } else {
        echo json_encode(['error' => 'Canteen not found']);
    }
}
?>