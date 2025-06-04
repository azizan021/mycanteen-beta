// js/homepage.js

import { fetchAPI, formatRupiah } from "./utils.js";
import { API_CONFIG } from "./api-config.js";
import { addToCart } from "./cart-handler.js";

/**
 * Mendapatkan daftar kantin dari API.
 * @returns {Promise<Array>} Array kantin.
 */
const getCanteens = async () => {
  try {
    const data = await fetchAPI(API_CONFIG.ENDPOINTS.CANTEENS);
    if (!data || data.error) {
      throw new Error(data?.error || "Invalid data received");
    }
    return data;
  } catch (error) {
    console.error("Error getting canteens:", error);
    alert("Gagal memuat data kantin. Silakan coba lagi nanti.");
    return [];
  }
};

/**
 * Render daftar kantin.
 * @param {Array} canteens - Daftar kantin.
 * @param {string} filterText - Teks untuk filter.
 */
const renderCanteens = (canteens, filterText = "") => {
  const popularCanteensSection = document.getElementById("popular-canteens");
  if (!popularCanteensSection) return;

  popularCanteensSection.innerHTML = "";

  const filteredCanteens = canteens.filter((canteen) =>
    canteen.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filteredCanteens.length === 0) {
    popularCanteensSection.innerHTML =
      '<p class="empty-list-message">Tidak ada kantin ditemukan.</p>';
    return;
  }

  filteredCanteens.forEach((canteen) => {
    const canteenCard = document.createElement("a");
    canteenCard.href = `canteen.html?id=${canteen.id}`;
    canteenCard.classList.add("canteen-card");
    canteenCard.innerHTML = `
            <div class="canteen-image-container">
                <img src="${
                  canteen.image_url || "images/default-canteen.jpg"
                }" alt="Foto ${canteen.name}">
                ${
                  canteen.discount
                    ? `<div class="discount-badge">${canteen.discount}</div>`
                    : ""
                }
            </div>
            <div class="canteen-info">
                <div class="distance-time">${canteen.distance || "0.5 km"} • ${
      canteen.time || "15 min"
    }</div>
                <h3>${canteen.name}</h3>
                <div class="rating-info">
                    <i class="fas fa-star" aria-hidden="true"></i> ${
                      canteen.rating || 4.0
                    }
                    <span class="rating-count">• ${
                      (canteen.rating || 4.0) > 4.5 ? "2rb+" : "700+"
                    } rating</span>
                </div>
            </div>
        `;
    popularCanteensSection.appendChild(canteenCard);
  });
};

/**
 * Render menu rekomendasi.
 * @param {Array} canteens - Daftar kantin untuk mengambil menu rekomendasi.
 * @param {string} filterText - Teks untuk filter.
 */
const renderRecommendedMenus = (canteens, filterText = "") => {
  const recommendedMenusSection = document.getElementById("recommended-menus");
  if (!recommendedMenusSection) return;

  recommendedMenusSection.innerHTML = "";

  const allRecommendedMenus = [];
  canteens.forEach((canteen) => {
    (canteen.menus || []).slice(0, 2).forEach((menu) => {
      allRecommendedMenus.push({
        ...menu,
        canteenName: canteen.name,
        canteenId: canteen.id,
      });
    });
  });

  const filteredMenus = allRecommendedMenus.filter(
    (menu) =>
      menu.name.toLowerCase().includes(filterText.toLowerCase()) ||
      menu.canteenName.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filteredMenus.length === 0) {
    recommendedMenusSection.innerHTML =
      '<p class="empty-list-message">Tidak ada menu rekomendasi ditemukan.</p>';
    return;
  }

  filteredMenus.forEach((menu) => {
    const menuCard = document.createElement("div");
    menuCard.classList.add("menu-card");
    menuCard.innerHTML = `
            <img src="${
              menu.image_url || "images/default-food.jpg"
            }" alt="Foto ${menu.name}">
            <h4>${menu.name}</h4>
            <p class="canteen-name">dari ${menu.canteenName}</p>
            <p class="price">${formatRupiah(menu.price)}</p>
            <button class="btn-add-to-cart" data-canteen-id="${
              menu.canteenId
            }" data-menu-id="${menu.id}">Tambah</button>
        `;
    recommendedMenusSection.appendChild(menuCard);
  });

  document.querySelectorAll(".btn-add-to-cart").forEach((button) => {
    button.addEventListener("click", (event) => {
      const canteenId = event.target.dataset.canteenId;
      const menuId = event.target.dataset.menuId;
      addToCart(canteenId, menuId);
    });
  });
};

/**
 * Inisialisasi halaman beranda.
 */
export const initHomepage = async () => {
  const searchInput = document.getElementById("search-input");
  const canteens = await getCanteens(); // Fetch canteens sekali

  renderCanteens(canteens);
  renderRecommendedMenus(canteens);

  if (searchInput) {
    searchInput.addEventListener("keyup", (event) => {
      const searchTerm = event.target.value;
      renderCanteens(canteens, searchTerm);
      renderRecommendedMenus(canteens, searchTerm);
    });
  }
};
