// js/dom-handler.js

import { cart } from "./cart-handler.js"; // Import cart dari cart-handler.js

/**
 * Memperbarui jumlah item di keranjang pada header dan floating button.
 */
export const updateCartCount = () => {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll(".cart-item-count").forEach((element) => {
    element.textContent = totalItems;
    element.style.display = totalItems > 0 ? "flex" : "none";
  });
};
