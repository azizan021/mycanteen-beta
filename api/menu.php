<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$canteen_id = isset($_GET['canteen_id']) ? $_GET['canteen_id'] : null;
$menu_id = isset($_GET['menu_id']) ? $_GET['menu_id'] : null;

if ($method == 'GET' && $canteen_id && $menu_id) {
    // Ambil detail menu
    $stmt = $conn->prepare("SELECT m.*, c.name as canteen_name FROM menus m JOIN canteens c ON m.canteen_id = c.id WHERE m.canteen_id = ? AND m.id = ?");
    $stmt->execute([$canteen_id, $menu_id]);
    $menu = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($menu) {
        echo json_encode($menu);
    } else {
        echo json_encode(['error' => 'Menu not found']);
    }
}
?>