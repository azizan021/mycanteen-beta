// js/login.js

import { fetchAPI } from "./utils.js";
import { API_CONFIG } from "./api-config.js";

let currentPhoneNumber = "";
let currentRole = "";

export const initLoginPage = () => {
  const requestOtpForm = document.getElementById("request-otp-form");
  const verifyOtpForm = document.getElementById("verify-otp-form");
  const phoneNumberInput = document.getElementById("phone-number");
  const roleSelect = document.getElementById("role");
  const otpCodeInput = document.getElementById("otp-code");
  const requestOtpErrorMessage = document.getElementById(
    "request-otp-error-message"
  );
  const verifyOtpErrorMessage = document.getElementById(
    "verify-otp-error-message"
  );
  const displayPhoneNumber = document.getElementById("display-phone-number");
  const resendOtpBtn = document.getElementById("resend-otp-btn");

  if (!requestOtpForm || !verifyOtpForm) {
    console.warn("Login forms not found on this page.");
    return;
  }

  // --- Tahap 1: Meminta OTP ---
  requestOtpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    currentPhoneNumber = phoneNumberInput.value.trim();
    currentRole = roleSelect.value;
    requestOtpErrorMessage.textContent = "";

    if (!currentPhoneNumber) {
      requestOtpErrorMessage.textContent = "Nomor WhatsApp harus diisi.";
      return;
    }

    // Nomor WhatsApp harus diawali dengan 62 dan minimal 10 digit (misal 62812...)
    if (!currentPhoneNumber.match(/^62\d{8,15}$/)) {
      requestOtpErrorMessage.textContent =
        "Format nomor WhatsApp tidak valid (contoh: 6281234567890).";
      return;
    }

    try {
      const response = await fetchAPI(
        `${API_CONFIG.BASE_URL}/auth_whatsapp.php`, // Endpoint baru untuk auth WhatsApp
        "POST",
        {
          action: "request_otp",
          phone_number: currentPhoneNumber,
          role: currentRole, // Diperlukan untuk cek apakah nomor terdaftar
        }
      );

      if (response.success) {
        displayPhoneNumber.textContent = currentPhoneNumber;
        requestOtpForm.classList.remove("active");
        verifyOtpForm.classList.add("active");
        alert("Kode OTP telah dikirim ke nomor WhatsApp Anda.");
      } else {
        requestOtpErrorMessage.textContent =
          response.error || "Gagal mengirim OTP. Coba lagi.";
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      requestOtpErrorMessage.textContent =
        "Terjadi kesalahan. Silakan coba lagi nanti.";
    }
  });

  // --- Tahap 2: Memverifikasi OTP ---
  verifyOtpForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const otpCode = otpCodeInput.value.trim();
    verifyOtpErrorMessage.textContent = "";

    if (!otpCode) {
      verifyOtpErrorMessage.textContent = "Kode OTP harus diisi.";
      return;
    }

    if (!otpCode.match(/^\d{6}$/)) {
      verifyOtpErrorMessage.textContent = "Kode OTP harus 6 digit angka.";
      return;
    }

    try {
      const response = await fetchAPI(
        `${API_CONFIG.BASE_URL}/auth_whatsapp.php`, // Endpoint baru untuk auth WhatsApp
        "POST",
        {
          action: "verify_otp",
          phone_number: currentPhoneNumber,
          otp_code: otpCode,
          role: currentRole, // Diperlukan untuk proses login akhir
        }
      );

      if (response.success) {
        localStorage.setItem("userRole", currentRole);
        localStorage.setItem("userId", response.user_id);
        localStorage.setItem("userName", response.user_name);

        alert("Login berhasil!");
        if (currentRole === "customer") {
          window.location.href = "index.html";
        } else if (currentRole === "courier") {
          window.location.href = "courier-notifications.html";
        }
      } else {
        verifyOtpErrorMessage.textContent =
          response.error ||
          "Verifikasi OTP gagal. Kode tidak valid atau sudah kedaluwarsa.";
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      verifyOtpErrorMessage.textContent =
        "Terjadi kesalahan saat verifikasi. Silakan coba lagi nanti.";
    }
  });

  // --- Kirim Ulang OTP ---
  resendOtpBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    verifyOtpErrorMessage.textContent = "Mengirim ulang kode...";

    try {
      const response = await fetchAPI(
        `${API_CONFIG.BASE_URL}/auth_whatsapp.php`,
        "POST",
        {
          action: "request_otp",
          phone_number: currentPhoneNumber,
          role: currentRole,
          resend: true, // Menandakan ini permintaan kirim ulang
        }
      );

      if (response.success) {
        verifyOtpErrorMessage.textContent = "Kode OTP baru telah dikirim!";
      } else {
        verifyOtpErrorMessage.textContent =
          response.error || "Gagal mengirim ulang OTP. Coba lagi.";
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      verifyOtpErrorMessage.textContent =
        "Terjadi kesalahan. Silakan coba lagi nanti.";
    }
  });
};
