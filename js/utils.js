// js/utils.js

import { API_CONFIG } from "./api-config.js"; // <<< TAMBAHKAN BARIS INI

/**
 * Memformat angka menjadi format mata uang Rupiah.
 * @param {number} amount - Jumlah angka.
 * @returns {string} Format mata uang Rupiah.
 */
export const formatRupiah = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Mengambil data dari API.
 * @param {string} endpoint - Endpoint API.
 * @param {string} method - Metode HTTP (GET, POST, dll.).
 * @param {object} data - Data untuk dikirim (jika POST/PUT).
 * @returns {Promise<object>} Data hasil response API.
 * @throws {Error} Jika terjadi kesalahan pada fetch atau response tidak OK.
 */
export const fetchAPI = async (endpoint, method = "GET", data = null) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/${endpoint}`, options); // Kini API_CONFIG sudah terdefinisi
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Coba parse error response
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${
          errorData.error || response.statusText
        }`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

/**
 * Mendapatkan parameter URL.
 * @param {string} param - Nama parameter.
 * @returns {string|null} Nilai parameter atau null jika tidak ada.
 */
export const getUrlParam = (param) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

// Konstanta
export const SERVICE_FEE = 2000;
