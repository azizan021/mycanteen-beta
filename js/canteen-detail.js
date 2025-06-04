// js/canteen-detail.js

import { fetchAPI, getUrlParam, formatRupiah } from "./utils.js";
import { API_CONFIG } from "./api-config.js";
import { addToCart } from "./cart-handler.js";

/**
 * Mendapatkan detail kantin dari API.
 * @param {string} canteenId
 * @returns {Promise<object|null>} Detail kantin atau null jika gagal.
 */
const getCanteenDetails = async (canteenId) => {
  try {
    const data = await fetchAPI(
      `${API_CONFIG.ENDPOINTS.CANTEEN_DETAIL}?id=${canteenId}`
    );
    if (!data || data.error) {
      throw new Error(data?.error || "Canteen not found");
    }
    return data;
  } catch (error) {
    console.error("Error getting canteen details:", error);
    alert("Gagal memuat detail kantin. Silakan coba lagi nanti.");
    return null;
  }
};

/**
 * Inisialisasi halaman detail kantin.
 */
export const initCanteenDetailPage = async () => {
  const canteenId = getUrlParam("id");

  if (!canteenId) {
    alert("ID Kantin tidak ditemukan.");
    window.location.href = "index.html";
    return;
  }

  const currentCanteen = await getCanteenDetails(canteenId);
  if (!currentCanteen) {
    alert("Kantin tidak ditemukan!");
    window.location.href = "index.html";
    return;
  }

  // Update Canteen Info
  document.getElementById("canteen-name-header").textContent =
    currentCanteen.name;
  document.getElementById("canteen-banner-img").src =
    currentCanteen.image_url || "images/default-canteen.jpg";
  document.getElementById("canteen-title").textContent = currentCanteen.name;
  document.getElementById("canteen-rating").textContent =
    currentCanteen.rating || 4.0;

  const statusElement = document.getElementById("canteen-status");
  statusElement.textContent =
    currentCanteen.status === "open" ? "Buka" : "Tutup";
  statusElement.className = "status " + (currentCanteen.status || "closed");

  document.getElementById("canteen-description").textContent =
    currentCanteen.description || "Tidak ada deskripsi";

  const menuListSection = document.getElementById("canteen-menu-list");
  const menuCategoriesNav = document.getElementById("menu-categories-nav");
  menuListSection.innerHTML = "";
  menuCategoriesNav.innerHTML = "";

  // Group menus by category
  const categories = {};
  currentCanteen.menus.forEach((menu) => {
    if (!categories[menu.category]) {
      categories[menu.category] = [];
    }
    categories[menu.category].push(menu);
  });

  Object.keys(categories).forEach((category, index) => {
    const categoryId = `category-${category
      .replace(/\s+/g, "-")
      .toLowerCase()}`;

    // Add category tab
    const categoryLink = document.createElement("a");
    categoryLink.href = `#${categoryId}`;
    categoryLink.classList.add("category-item");
    if (index === 0) categoryLink.classList.add("active");
    categoryLink.textContent = category;
    menuCategoriesNav.appendChild(categoryLink);

    // Add category section
    const categoryHeading = document.createElement("h3");
    categoryHeading.id = categoryId;
    categoryHeading.textContent = category;
    menuListSection.appendChild(categoryHeading);

    // Add menu items
    categories[category].forEach((menu) => {
      const menuItemCard = document.createElement("div");
      menuItemCard.classList.add("menu-item-card");
      menuItemCard.innerHTML = `
                <img src="${
                  menu.image_url || "images/default-food.jpg"
                }" alt="Gambar ${menu.name}">
                <div class="menu-item-details">
                    <h4>${menu.name}</h4>
                    <p>${menu.description || "Tidak ada deskripsi"}</p>
                    <span class="price">${formatRupiah(menu.price)}</span>
                </div>
                <button class="btn-add-to-cart" data-canteen-id="${
                  currentCanteen.id
                }" data-menu-id="${menu.id}">Tambah</button>
            `;
      menuListSection.appendChild(menuItemCard);
    });
  });

  // Add event listeners for "Tambah" buttons
  document.querySelectorAll(".btn-add-to-cart").forEach((button) => {
    button.addEventListener("click", (event) => {
      const canteenId = event.target.dataset.canteenId;
      const menuId = event.target.dataset.menuId;
      addToCart(canteenId, menuId);
    });
  });

  // Smooth scroll for category navigation
  menuCategoriesNav.addEventListener("click", (event) => {
    if (event.target.classList.contains("category-item")) {
      event.preventDefault();
      document
        .querySelectorAll(".category-item")
        .forEach((item) => item.classList.remove("active"));
      event.target.classList.add("active");
      const targetId = event.target.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        window.scrollTo({
          top:
            targetElement.offsetTop -
            (document.querySelector(".header")?.offsetHeight || 0) -
            10, // Adjust for fixed header and some padding
          behavior: "smooth",
        });
      }
    }
  });

  // Update active category on scroll
  const observerOptions = {
    root: null,
    rootMargin: `-${
      document.querySelector(".header")?.offsetHeight || 0
    }px 0px 0px 0px`, // Offset for fixed header
    threshold: 0.1, // Trigger when 10% of the section is visible
  };

  const menuSections = document.querySelectorAll(".menu-list h3");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        document.querySelectorAll(".category-item").forEach((item) => {
          if (item.getAttribute("href") === `#${entry.target.id}`) {
            item.classList.add("active");
          } else {
            item.classList.remove("active");
          }
        });
      }
    });
  }, observerOptions);

  menuSections.forEach((section) => observer.observe(section));
};
