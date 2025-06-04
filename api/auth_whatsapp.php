<?php
require_once 'config.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = $data['action'] ?? '';
    $phone_number = $data['phone_number'] ?? '';
    $role = $data['role'] ?? '';

    // Validasi dasar
    if (empty($action) || empty($phone_number) || empty($role)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data tidak lengkap.']);
        exit();
    }

    // Pastikan nomor diawali '62'
    if (!preg_match('/^62\d{8,15}$/', $phone_number)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Format nomor WhatsApp tidak valid (harus diawali 62).']);
        exit();
    }

    switch ($action) {
        case 'request_otp':
        case 'register_request_otp': // Digunakan untuk registrasi juga

            $resend = $data['resend'] ?? false; // Flag untuk kirim ulang

            // Cek apakah nomor sudah terdaftar (untuk login)
            if ($action === 'request_otp') {
                $table = ($role === 'customer') ? 'customers' : 'couriers';
                $stmt = $conn->prepare("SELECT id FROM $table WHERE phone_number = ?");
                $stmt->execute([$phone_number]);
                if (!$stmt->fetch()) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Nomor tidak terdaftar sebagai ' . $role . '. Silakan daftar terlebih dahulu.']);
                    exit();
                }
            }
            // Cek apakah nomor sudah terdaftar (untuk registrasi)
            if ($action === 'register_request_otp') {
                $table = ($role === 'customer') ? 'customers' : 'couriers';
                $stmt = $conn->prepare("SELECT id FROM $table WHERE phone_number = ?");
                $stmt->execute([$phone_number]);
                if ($stmt->fetch()) {
                    http_response_code(409); // Conflict
                    echo json_encode(['success' => false, 'error' => 'Nomor WhatsApp ini sudah terdaftar sebagai ' . $role . '. Silakan login.']);
                    exit();
                }

                // Jika ini permintaan registrasi, kita simpan data awal sebelum mengirim OTP
                // Namun, kita TIDAK akan menyimpan nama dan plat nomor di sini dulu
                // Penyimpanan final terjadi di 'register_verify_otp'
                // Ini untuk mencegah 'registrasi' palsu hanya dengan nomor telepon.
                // Jika Anda ingin menyimpan nama di sini, Anda perlu mekanisme untuk menghapus jika OTP tidak diverifikasi.
                // Untuk kesederhanaan, kita hanya akan memproses nomor telepon di tahap ini.
            }


            // Hapus OTP lama yang belum terpakai atau kedaluwarsa untuk nomor ini
            $stmt_delete = $conn->prepare("DELETE FROM whatsapp_otps WHERE phone_number = ? AND is_used = FALSE AND expires_at < NOW()");
            $stmt_delete->execute([$phone_number]);

            // Cek apakah ada OTP yang masih aktif untuk nomor ini
            $stmt_check_active_otp = $conn->prepare("SELECT otp_code, expires_at FROM whatsapp_otps WHERE phone_number = ? AND is_used = FALSE AND expires_at > NOW()");
            $stmt_check_active_otp->execute([$phone_number]);
            $active_otp = $stmt_check_active_otp->fetch(PDO::FETCH_ASSOC);

            if ($active_otp && !$resend) { // Jika ada OTP aktif dan BUKAN permintaan kirim ulang
                http_response_code(429); // Too Many Requests
                echo json_encode(['success' => false, 'error' => 'Kode OTP sudah dikirim. Silakan tunggu hingga ' . (new DateTime($active_otp['expires_at']))->format('H:i:s') . ' atau gunakan kode yang sudah ada.']);
                exit();
            }

            // Generate OTP (misalnya 6 digit angka)
            $otp_code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            $expires_at = (new DateTime())->modify('+5 minutes')->format('Y-m-d H:i:s'); // OTP berlaku 5 menit

            try {
                $conn->beginTransaction();
                // Tandai OTP sebelumnya yang belum digunakan sebagai sudah digunakan (atau expired) untuk nomor ini, agar tidak ada duplikasi aktif
                $stmt_invalidate_old = $conn->prepare("UPDATE whatsapp_otps SET is_used = TRUE WHERE phone_number = ? AND is_used = FALSE AND expires_at > NOW()");
                $stmt_invalidate_old->execute([$phone_number]);

                $stmt = $conn->prepare("INSERT INTO whatsapp_otps (phone_number, otp_code, expires_at) VALUES (?, ?, ?)");
                $stmt->execute([$phone_number, $otp_code, $expires_at]);
                $conn->commit();

                // --- BAGIAN PENTING: PENGIRIMAN WHATSAPP OTP ---
                // Di sini Anda akan mengintegrasikan dengan WhatsApp Business API
                // Contoh dengan placeholder:
                $message = "Kode OTP MyCanteen Anda adalah: $otp_code. Berlaku 5 menit. Jangan berikan kode ini kepada siapa pun.";
                // Fungsi kirim_whatsapp_message_via_api($phone_number, $message);
                // Contoh:
                // include 'vendor/autoload.php'; // Jika pakai library Twilio/Vonage
                // use Twilio\Rest\Client;
                // $sid = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // Your Account SID
                // $token = "your_auth_token"; // Your Auth Token
                // $twilio = new Client($sid, $token);
                // $twilio->messages
                //        ->create("whatsapp:$phone_number", // to
                //                 array(
                //                     "from" => "whatsapp:+1XXXYYYZZZZ", // from your Twilio WhatsApp number
                //                     "body" => $message
                //                 )
                //        );
                // echo json_encode(['success' => true, 'message' => 'OTP sent (simulated).']);
                // exit();

                // Untuk pengembangan lokal tanpa API, kita akan log OTP ke error_log atau response
                error_log("Simulated WhatsApp OTP for $phone_number: $otp_code");
                echo json_encode(['success' => true, 'message' => 'Kode OTP telah dikirim (simulasi). Cek log server.']);

            } catch (PDOException $e) {
                $conn->rollBack();
                error_log("OTP Request Error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Gagal meminta OTP: ' . $e->getMessage()]);
            }
            break;

        case 'verify_otp':
        case 'register_verify_otp': // Digunakan untuk registrasi juga
            $otp_code = $data['otp_code'] ?? '';

            if (empty($otp_code)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Kode OTP harus diisi.']);
                exit();
            }

            try {
                $conn->beginTransaction();
                $stmt = $conn->prepare("SELECT id, expires_at, is_used FROM whatsapp_otps WHERE phone_number = ? AND otp_code = ? ORDER BY created_at DESC LIMIT 1");
                $stmt->execute([$phone_number, $otp_code]);
                $otp_record = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$otp_record || $otp_record['is_used'] || (new DateTime($otp_record['expires_at'])) < (new DateTime())) {
                    $conn->rollBack();
                    http_response_code(401); // Unauthorized
                    echo json_encode(['success' => false, 'error' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
                    exit();
                }

                // Tandai OTP sebagai sudah digunakan
                $stmt_update = $conn->prepare("UPDATE whatsapp_otps SET is_used = TRUE WHERE id = ?");
                $stmt_update->execute([$otp_record['id']]);

                // Jika verifikasi OTP berhasil, proses login atau registrasi akhir
                if ($action === 'verify_otp') {
                    // Login
                    $table = ($role === 'customer') ? 'customers' : 'couriers';
                    $stmt_user = $conn->prepare("SELECT id, name FROM $table WHERE phone_number = ?");
                    $stmt_user->execute([$phone_number]);
                    $user = $stmt_user->fetch(PDO::FETCH_ASSOC);

                    if ($user) {
                        $conn->commit();
                        echo json_encode([
                            'success' => true,
                            'message' => 'Login berhasil!',
                            'user_id' => $user['id'],
                            'user_name' => $user['name'],
                            'role' => $role
                        ]);
                    } else {
                        $conn->rollBack();
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Pengguna tidak ditemukan setelah verifikasi OTP.']);
                    }
                } elseif ($action === 'register_verify_otp') {
                    // Registrasi akhir (setelah OTP diverifikasi)
                    $name = $data['name'] ?? null; // Nama sudah dikirim di tahap 1, tapi perlu di-fetch dari sesi atau disimpan sementara
                    $license_plate = $data['license_plate'] ?? null; // Sama untuk plat nomor

                    // Ini adalah titik kritis.
                    // Karena data 'name' dan 'license_plate' tidak disimpan di database di tahap 'register_request_otp',
                    // Anda harus menyimpannya di session PHP setelah 'register_request_otp' berhasil,
                    // dan mengambilnya dari session di sini.
                    // Atau, lebih mudah, kirim ulang 'name' dan 'license_plate' dari frontend di tahap 'register_verify_otp'.
                    // Untuk kesederhanaan, saya akan asumsikan Anda mengirim ulang data ini dari front-end.
                    // (Anda perlu modifikasi js/register.js untuk mengirimkan kembali nama dan plat nomor di tahap 2)

                    $name_from_frontend = $data['name_from_frontend'] ?? ''; // Asumsikan Anda kirim ini dari frontend
                    $license_plate_from_frontend = ($role === 'courier') ? ($data['license_plate_from_frontend'] ?? null) : null;

                    if (empty($name_from_frontend)) {
                        $conn->rollBack();
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'Nama pengguna tidak ditemukan untuk pendaftaran.']);
                        exit();
                    }

                    $insert_stmt = null;
                    if ($role === 'customer') {
                        $insert_stmt = $conn->prepare("INSERT INTO customers (name, phone_number) VALUES (?, ?)");
                        $insert_stmt->execute([$name_from_frontend, $phone_number]);
                    } elseif ($role === 'courier') {
                        if (empty($license_plate_from_frontend)) {
                            $conn->rollBack();
                            http_response_code(400);
                            echo json_encode(['success' => false, 'error' => 'Plat nomor wajib untuk kurir.']);
                            exit();
                        }
                        $insert_stmt = $conn->prepare("INSERT INTO couriers (name, phone_number, license_plate) VALUES (?, ?, ?)");
                        $insert_stmt->execute([$name_from_frontend, $phone_number, $license_plate_from_frontend]);
                    } else {
                        $conn->rollBack();
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'Peran tidak valid.']);
                        exit();
                    }

                    $conn->commit();
                    echo json_encode(['success' => true, 'message' => 'Registrasi dan verifikasi berhasil!']);
                }
            } catch (PDOException $e) {
                $conn->rollBack();
                error_log("OTP Verification Error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Gagal memverifikasi OTP: ' . $e->getMessage()]);
            }
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Aksi tidak valid.']);
            break;
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Metode tidak diizinkan.']);
}
?>