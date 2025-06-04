// js/cart-handler.js

import { fetchAPI, formatRupiah, SERVICE_FEE } from "./utils.js";
import { API_CONFIG } from "./api-config.js";
import { updateCartCount } from "./dom-handler.js";

// State keranjang
export let cart = JSON.parse(localStorage.getItem("myCanteenCart")) || [];

/**
 * Menyimpan data keranjang ke localStorage.
 */
export const saveCartToLocal = () => {
  localStorage.setItem("myCanteenCart", JSON.stringify(cart));
  updateCartCount();
};

/**
 * Mendapatkan detail menu dari API.
 * @param {string} canteenId
 * @param {string} menuId
 * @returns {Promise<object|null>} Detail menu atau null jika gagal.
 */
const getMenuDetails = async (canteenId, menuId) => {
  try {
    const data = await fetchAPI(
      `${API_CONFIG.ENDPOINTS.MENU_DETAIL}?canteen_id=${canteenId}&menu_id=${menuId}`
    );
    if (!data || data.error) {
      throw new Error(data?.error || "Menu not found");
    }
    return data;
  } catch (error) {
    console.error("Error getting menu details:", error);
    alert("Gagal memuat detail menu. Silakan coba lagi nanti.");
    return null;
  }
};

/**
 * Menambahkan item ke keranjang.
 * @param {string} canteenId
 * @param {string} menuId
 */
export const addToCart = async (canteenId, menuId) => {
  const menuDetails = await getMenuDetails(canteenId, menuId);
  if (!menuDetails) {
    alert("Menu tidak ditemukan.");
    return;
  }

  const existingCartItem = cart.find(
    (item) =>
      item.menuId == menuDetails.id && item.canteenId == menuDetails.canteen_id
  );

  if (existingCartItem) {
    existingCartItem.quantity++;
  } else {
    // Cek apakah ada item dari kantin lain
    if (cart.length > 0 && cart[0].canteenId != menuDetails.canteen_id) {
      const confirmClearCart = confirm(
        "Keranjang Anda berisi item dari kantin lain. Apakah Anda ingin mengosongkan keranjang dan menambahkan item dari kantin ini?"
      );
      if (!confirmClearCart) return;
      cart = []; // Kosongkan keranjang
    }

    cart.push({
      canteenId: menuDetails.canteen_id,
      canteenName: menuDetails.canteen_name,
      menuId: menuDetails.id,
      menuName: menuDetails.name,
      price: parseFloat(menuDetails.price),
      image: menuDetails.image_url || "images/default-food.jpg",
      quantity: 1,
    });
  }

  saveCartToLocal();
  alert(
    `${menuDetails.name} dari ${menuDetails.canteen_name} ditambahkan ke keranjang!`
  );
};

/**
 * Mengurangi jumlah item di keranjang.
 * @param {string} menuId
 * @param {string} canteenId
 */
export const decreaseQuantity = (menuId, canteenId) => {
  const itemIndex = cart.findIndex(
    (item) => item.menuId == menuId && item.canteenId == canteenId
  );
  if (itemIndex > -1) {
    if (cart[itemIndex].quantity > 1) {
      cart[itemIndex].quantity--;
    } else {
      // Jika quantity menjadi 0 atau kurang, hapus item
      cart.splice(itemIndex, 1);
    }
    saveCartToLocal();
  }
};

/**
 * Menambah jumlah item di keranjang.
 * @param {string} menuId
 * @param {string} canteenId
 */
export const increaseQuantity = (menuId, canteenId) => {
  const itemIndex = cart.findIndex(
    (item) => item.menuId == menuId && item.canteenId == canteenId
  );
  if (itemIndex > -1) {
    cart[itemIndex].quantity++;
    saveCartToLocal();
  }
};

/**
 * Menghapus item dari keranjang.
 * @param {string} menuId
 * @param {string} canteenId
 */
export const removeFromCart = (menuId, canteenId) => {
  cart = cart.filter(
    (item) => !(item.menuId == menuId && item.canteenId == canteenId)
  );
  saveCartToLocal();
};

/**
 * Menghitung subtotal keranjang.
 * @returns {number} Subtotal.
 */
export const calculateSubtotal = () => {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

/**
 * Menghitung total keranjang (subtotal + biaya layanan).
 * @returns {number} Total.
 */
export const calculateTotal = () => {
  return calculateSubtotal() + SERVICE_FEE;
};

/**
 * Mengirim pesanan ke API.
 * @param {object} customerInfo - Informasi pelanggan.
 * @returns {Promise<string|boolean>} Order ID jika berhasil, false jika gagal.
 */
export const placeOrder = async (customerInfo) => {
  if (cart.length === 0) {
    alert("Keranjang belanja Anda masih kosong.");
    return false;
  }

  if (!customerInfo.name || customerInfo.name.trim() === "") {
    alert("Nama penerima harus diisi.");
    return false;
  }
  if (!customerInfo.address || customerInfo.address.trim() === "") {
    alert("Alamat pengiriman harus diisi.");
    return false;
  }

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  try {
    const orderData = {
      customerInfo: customerInfo,
      items: cart,
      subtotal: subtotal,
      serviceFee: SERVICE_FEE,
      total: total,
      paymentMethod: "QRIS", // Untuk saat ini QRIS saja
    };

    const response = await fetchAPI(
      API_CONFIG.ENDPOINTS.ORDERS,
      "POST",
      orderData
    );

    if (response.success) {
      cart = []; // Kosongkan keranjang setelah berhasil
      saveCartToLocal();
      // Simpan order_id ke localStorage untuk pelacakan
      localStorage.setItem("lastPlacedOrderId", response.order_id); // <<< PERUBAHAN PENTING
      return response.order_id; // Mengembalikan order_id
    } else {
      throw new Error(response.error || "Failed to place order");
    }
  } catch (error) {
    console.error("Error placing order:", error);
    alert("Gagal membuat pesanan. Silakan coba lagi.");
    return false;
  }
};
