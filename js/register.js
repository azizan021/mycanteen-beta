// js/register.js

import { fetchAPI } from "./utils.js";
import { API_CONFIG } from "./api-config.js";

let regPhoneNumber = "";
let regUserName = "";
let regUserRole = "";
let regLicensePlate = "";

export const initRegisterPage = () => {
  const registerFormStep1 = document.getElementById("register-form-step1");
  const registerFormStep2 = document.getElementById("register-form-step2");
  const nameInput = document.getElementById("reg-name");
  const phoneInput = document.getElementById("reg-phone");
  const roleSelect = document.getElementById("reg-role");
  const courierFieldsDiv = document.getElementById("courier-fields");
  const licensePlateInput = document.getElementById("reg-license-plate");
  const otpCodeInput = document.getElementById("reg-otp-code");
  const registerErrorMessageStep1 = document.getElementById(
    "register-error-message-step1"
  );
  const registerErrorMessageStep2 = document.getElementById(
    "register-error-message-step2"
  );
  const regDisplayPhoneNumber = document.getElementById(
    "reg-display-phone-number"
  );
  const resendOtpBtn = document.getElementById("reg-resend-otp-btn");

  if (!registerFormStep1 || !registerFormStep2) {
    console.warn("Register forms not found on this page.");
    return;
  }

  // Tampilkan/sembunyikan field kurir berdasarkan pilihan peran
  roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "courier") {
      courierFieldsDiv.style.display = "block";
      licensePlateInput.setAttribute("required", ""); // Plat nomor wajib untuk kurir
    } else {
      courierFieldsDiv.style.display = "none";
      licensePlateInput.removeAttribute("required");
    }
  });

  // --- Tahap 1 Registrasi: Mengirim data pendaftaran & meminta OTP ---
  registerFormStep1.addEventListener("submit", async (event) => {
    event.preventDefault();

    regUserName = nameInput.value.trim();
    regPhoneNumber = phoneInput.value.trim();
    regUserRole = roleSelect.value;
    regLicensePlate = licensePlateInput.value.trim();

    registerErrorMessageStep1.textContent = "";

    if (!regUserName || !regPhoneNumber) {
      registerErrorMessageStep1.textContent =
        "Nama dan Nomor WhatsApp harus diisi.";
      return;
    }

    if (!regPhoneNumber.match(/^62\d{8,15}$/)) {
      registerErrorMessageStep1.textContent =
        "Format nomor WhatsApp tidak valid (contoh: 6281234567890).";
      return;
    }

    const userData = {
      action: "register_request_otp", // Aksi baru untuk API
      name: regUserName,
      phone_number: regPhoneNumber,
      role: regUserRole,
    };

    if (regUserRole === "courier") {
      if (!regLicensePlate) {
        registerErrorMessageStep1.textContent =
          "Plat nomor wajib diisi untuk kurir.";
        return;
      }
      userData.license_plate = regLicensePlate;
    }

    try {
      const response = await fetchAPI(
        `${API_CONFIG.BASE_URL}/auth_whatsapp.php`,
        "POST",
        userData
      );

      if (response.success) {
        regDisplayPhoneNumber.textContent = regPhoneNumber;
        registerFormStep1.classList.remove("active");
        registerFormStep2.classList.add("active");
        alert(
          "Pendaftaran awal berhasil! Kode OTP telah dikirim ke WhatsApp Anda."
        );
      } else {
        registerErrorMessageStep1.textContent =
          response.error || "Pendaftaran gagal. Coba lagi.";
      }
    } catch (error) {
      console.error("Error during registration step 1:", error);
      registerErrorMessageStep1.textContent =
        "Terjadi kesalahan. Silakan coba lagi nanti.";
    }
  });

  // --- Tahap 2 Registrasi: Memverifikasi OTP ---
  registerFormStep2.addEventListener("submit", async (event) => {
    event.preventDefault();

    const otpCode = otpCodeInput.value.trim();
    registerErrorMessageStep2.textContent = "";

    if (!otpCode) {
      registerErrorMessageStep2.textContent = "Kode OTP harus diisi.";
      return;
    }

    if (!otpCode.match(/^\d{6}$/)) {
      registerErrorMessageStep2.textContent = "Kode OTP harus 6 digit angka.";
      return;
    }

    try {
      const response = await fetchAPI(
        `${API_CONFIG.BASE_URL}/auth_whatsapp.php`,
        "POST",
        {
          action: "register_verify_otp", // Aksi baru untuk API
          phone_number: regPhoneNumber,
          otp_code: otpCode,
          role: regUserRole,
        }
      );

      if (response.success) {
        alert("Akun berhasil diverifikasi dan dibuat! Silakan login.");
        window.location.href = "login.html"; // Redirect ke halaman login
      } else {
        registerErrorMessageStep2.textContent =
          response.error ||
          "Verifikasi OTP gagal. Kode tidak valid atau sudah kedaluwarsa.";
      }
    } catch (error) {
      console.error("Error during registration step 2:", error);
      registerErrorMessageStep2.textContent =
        "Terjadi kesalahan saat verifikasi. Silakan coba lagi nanti.";
    }
  });

  // --- Kirim Ulang OTP Registrasi ---
  resendOtpBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    registerErrorMessageStep2.textContent = "Mengirim ulang kode...";

    try {
      const response = await fetchAPI(
        `${API_CONFIG.BASE_URL}/auth_whatsapp.php`,
        "POST",
        {
          action: "request_otp", // Menggunakan aksi yang sama untuk meminta OTP
          phone_number: regPhoneNumber,
          role: regUserRole,
          resend: true, // Menandakan ini permintaan kirim ulang
        }
      );

      if (response.success) {
        registerErrorMessageStep2.textContent = "Kode OTP baru telah dikirim!";
      } else {
        registerErrorMessageStep2.textContent =
          response.error || "Gagal mengirim ulang OTP. Coba lagi.";
      }
    } catch (error) {
      console.error("Error resending OTP during registration:", error);
      registerErrorMessageStep2.textContent =
        "Terjadi kesalahan. Silakan coba lagi nanti.";
    }
  });
};
