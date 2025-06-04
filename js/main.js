// js/main.js

console.log("main.js loaded and starting...");

import { initHomepage } from "./homepage.js";
import { initCanteenDetailPage } from "./canteen-detail.js";
import { initCartPage } from "./cart-page.js";
import { initCourierNotificationsPage } from "./courier-notifications.js";
import { initCanteenNotificationsPage } from "./canteen-notifications.js";
import { initOrderTrackingPage } from "./order-tracking.js";
import { updateCartCount } from "./dom-handler.js";
import { initLoginPage } from "./login.js"; // IMPORT BARU
import { initRegisterPage } from "./register.js"; // IMPORT BARU

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired in main.js");

  // Deteksi Halaman Beranda
  if (document.getElementById("popular-canteens")) {
    console.log("Kondisi: Homepage ditemukan. Inisialisasi homepage.");
    initHomepage();
  }
  // Deteksi Halaman Detail Kantin
  else if (document.querySelector(".canteen-detail-page")) {
    console.log(
      "Kondisi: Canteen Detail Page ditemukan. Inisialisasi detail kantin."
    );
    initCanteenDetailPage();
  }
  // Deteksi Halaman Keranjang
  else if (document.querySelector(".cart-page")) {
    console.log("Kondisi: Cart Page ditemukan. Inisialisasi keranjang.");
    initCartPage();
  }
  // Deteksi Halaman Notifikasi Kurir
  else if (
    document.querySelector(".notifications-section") &&
    window.location.href.includes("courier-notifications.html")
  ) {
    console.log(
      "Kondisi: Halaman Notifikasi Kurir ditemukan. Inisialisasi kurir."
    );
    initCourierNotificationsPage();
  }
  // Deteksi Halaman Notifikasi Kantin
  else if (
    document.querySelector(".notifications-section") &&
    window.location.href.includes("canteen-notifications.html")
  ) {
    console.log(
      "Kondisi: Halaman Notifikasi Kantin ditemukan. Inisialisasi kantin."
    );
    initCanteenNotificationsPage();
  }
  // Deteksi Halaman Pelacakan Pesanan Pelanggan
  else if (
    document.querySelector(".order-tracking-section") &&
    window.location.href.includes("order-tracking.html")
  ) {
    console.log(
      "Kondisi: Halaman Pelacakan Pesanan ditemukan. Inisialisasi pelacakan pesanan."
    );
    initOrderTrackingPage();
  }
  // Deteksi Halaman Login
  else if (document.querySelector(".login-section")) {
    // Deteksi berdasarkan kelas unik
    console.log("Kondisi: Halaman Login ditemukan. Inisialisasi login.");
    initLoginPage();
  }
  // Deteksi Halaman Register
  else if (document.querySelector(".register-section")) {
    // Deteksi berdasarkan kelas unik
    console.log("Kondisi: Halaman Register ditemukan. Inisialisasi register.");
    initRegisterPage();
  }
  // Jika tidak ada halaman yang cocok
  else {
    console.log("Kondisi: Tidak ada kondisi halaman yang cocok.");
  }

  updateCartCount();
});
