// js/cart-page.js

import {
  cart,
  calculateSubtotal,
  calculateTotal,
  placeOrder,
  decreaseQuantity,
  increaseQuantity,
  removeFromCart,
} from "./cart-handler.js";
import { fetchAPI, formatRupiah, SERVICE_FEE } from "./utils.js"; // Import fetchAPI
import { API_CONFIG } from "./api-config.js"; // Import API_CONFIG
import { updateCartCount } from "./dom-handler.js";

let qrisTimerInterval;
let timeLeft = 300;

export const renderCartItems = () => {
  const cartItemsList = document.getElementById("cart-items-list");
  const subtotalPriceElement = document.getElementById("subtotal-price");
  const totalPriceElement = document.getElementById("total-price");

  if (!cartItemsList || !subtotalPriceElement || !totalPriceElement) return;

  if (cart.length === 0) {
    cartItemsList.innerHTML = `<p class="empty-cart-message"><i class="fas fa-shopping-cart"></i> Keranjang Anda kosong.</p>`;
    subtotalPriceElement.textContent = formatRupiah(0);
    totalPriceElement.textContent = formatRupiah(SERVICE_FEE); // Tetap tampilkan biaya layanan
    return;
  }

  const groupedCart = cart.reduce((acc, item) => {
    if (!acc[item.canteenId]) {
      acc[item.canteenId] = {
        name: item.canteenName,
        items: [],
      };
    }
    acc[item.canteenId].items.push(item);
    return acc;
  }, {});

  let cartHtml = "";
  for (const canteenId in groupedCart) {
    const canteen = groupedCart[canteenId];
    cartHtml += `
      <div class="canteen-cart-group">
        <h3>${canteen.name}</h3>
        ${canteen.items
          .map(
            (item) => `
          <div class="cart-item" data-menu-id="${
            item.menuId
          }" data-canteen-id="${item.canteenId}">
            <img src="${item.image}" alt="Gambar ${item.menuName}" />
            <div class="item-details">
              <h4>${item.menuName}</h4>
              <p class="canteen-name">dari ${item.canteenName}</p>
              <div class="item-actions">
                <button class="quantity-btn decrease-quantity" data-menu-id="${
                  item.menuId
                }" data-canteen-id="${item.canteenId}">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn increase-quantity" data-menu-id="${
                  item.menuId
                }" data-canteen-id="${item.canteenId}">+</button>
                <span class="item-price">${formatRupiah(
                  item.price * item.quantity
                )}</span>
                <button class="remove-item-btn" aria-label="Hapus item" data-menu-id="${
                  item.menuId
                }" data-canteen-id="${item.canteenId}">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  cartItemsList.innerHTML = cartHtml;
  subtotalPriceElement.textContent = formatRupiah(calculateSubtotal());
  totalPriceElement.textContent = formatRupiah(calculateTotal());
};

const startQrisTimer = () => {
  const qrisTimerElement = document.getElementById("qris-timer");
  const qrisAmountElement = document.getElementById("qris-amount");

  if (!qrisTimerElement || !qrisAmountElement) return;

  // Set the QRIS amount
  qrisAmountElement.textContent = formatRupiah(calculateTotal());

  timeLeft = 300; // Reset timer to 5 minutes
  clearInterval(qrisTimerInterval); // Clear any existing timer

  qrisTimerInterval = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    qrisTimerElement.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    if (timeLeft <= 0) {
      clearInterval(qrisTimerInterval);
      alert(
        "Waktu pembayaran QRIS telah habis. Silakan buat pesanan baru jika ingin melanjutkan."
      );
      if (qrisModal) qrisModal.style.display = "none";
      // Redirect to homepage or order tracking page
      window.location.href = "index.html"; // Or order-tracking.html if you want to show it as failed
    }
    timeLeft--;
  }, 1000);
};

export const initCartPage = () => {
  const customerNameInput = document.getElementById("customer-name");
  const deliveryAddressInput = document.getElementById("delivery-address");
  const orderNotesInput = document.getElementById("order-notes");
  const placeOrderBtn = document.getElementById("place-order-btn");

  const qrisModal = document.getElementById("qris-payment-modal");
  const closeModalBtn = qrisModal?.querySelector(".close-button");
  const paymentDoneBtn = document.getElementById("payment-done-btn");

  const summaryCustomerName = document.getElementById("summary-customer-name");
  const summaryDeliveryAddress = document.getElementById(
    "summary-delivery-address"
  );
  const summaryOrderNotes = document.getElementById("summary-order-notes");
  const customerInfoSummaryDiv = document.querySelector(
    ".customer-info-summary"
  );

  renderCartItems();

  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("decrease-quantity")) {
      const menuId = event.target.dataset.menuId;
      const canteenId = event.target.dataset.canteenId;
      decreaseQuantity(menuId, canteenId);
      renderCartItems();
    } else if (event.target.classList.contains("increase-quantity")) {
      const menuId = event.target.dataset.menuId;
      const canteenId = event.target.dataset.canteenId;
      increaseQuantity(menuId, canteenId);
      renderCartItems();
    } else if (event.target.classList.contains("remove-item-btn")) {
      const menuId = event.target.dataset.menuId;
      const canteenId = event.target.dataset.canteenId;
      if (confirm("Anda yakin ingin menghapus item ini dari keranjang?")) {
        removeFromCart(menuId, canteenId);
        renderCartItems();
      }
    }
  });

  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const customerInfo = {
        name: customerNameInput.value.trim(),
        address: deliveryAddressInput.value.trim(),
        notes: orderNotesInput.value.trim(),
      };

      const orderId = await placeOrder(customerInfo); // Tangkap orderId
      if (orderId) {
        if (summaryCustomerName)
          summaryCustomerName.textContent = customerInfo.name;
        if (summaryDeliveryAddress)
          summaryDeliveryAddress.textContent = customerInfo.address;
        if (summaryOrderNotes)
          summaryOrderNotes.textContent = customerInfo.notes || "-";
        if (customerInfoSummaryDiv)
          customerInfoSummaryDiv.style.display = "block";

        if (qrisModal) {
          qrisModal.style.display = "flex";
          startQrisTimer();
          // Simpan orderId secara sementara di localStorage untuk digunakan saat "Saya Sudah Bayar"
          localStorage.setItem("currentPayingOrderId", orderId); // <<< Perubahan baru
        }
        renderCartItems(); // Mengosongkan keranjang di UI
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      if (qrisModal) qrisModal.style.display = "none";
      clearInterval(qrisTimerInterval);
      localStorage.removeItem("currentPayingOrderId"); // Bersihkan jika modal ditutup tanpa konfirmasi pembayaran
    });
  }

  if (qrisModal) {
    window.addEventListener("click", (event) => {
      if (event.target === qrisModal) {
        qrisModal.style.display = "none";
        clearInterval(qrisTimerInterval);
        localStorage.removeItem("currentPayingOrderId"); // Bersihkan jika modal ditutup tanpa konfirmasi pembayaran
      }
    });
  }

  if (paymentDoneBtn) {
    paymentDoneBtn.addEventListener("click", async () => {
      alert("Pembayaran Anda sedang diverifikasi. Terima kasih!");
      if (qrisModal) qrisModal.style.display = "none";
      clearInterval(qrisTimerInterval);

      const orderId = localStorage.getItem("currentPayingOrderId"); // Ambil orderId dari localStorage
      if (orderId) {
        try {
          const response = await fetchAPI(
            `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`,
            "PUT",
            {
              order_id: orderId,
              status: "paid", // Status baru: 'paid'
              courier_id: null, // Tidak ada kurir yang terlibat di tahap ini
            }
          );
          if (response.success) {
            console.log(`Order ${orderId} status updated to 'paid'.`);
            localStorage.removeItem("currentPayingOrderId"); // Bersihkan setelah berhasil update
            // Redirect ke halaman pelacakan pesanan dengan order_id
            window.location.href = `order-tracking.html?order_id=${orderId}`; // <<< REDIRECT KE HALAMAN PELACAKAN
          } else {
            console.error(
              `Failed to update order ${orderId} status to 'paid':`,
              response.error
            );
            alert(`Gagal memperbarui status pesanan: ${response.error}.`);
            window.location.href = "index.html"; // Fallback jika gagal update status
          }
        } catch (error) {
          console.error(
            `Error updating order ${orderId} status to 'paid':`,
            error
          );
          alert(
            "Terjadi kesalahan saat memperbarui status pesanan. Silakan coba lagi."
          );
          window.location.href = "index.html"; // Fallback jika terjadi error
        }
      } else {
        alert("Tidak ada ID pesanan yang ditemukan untuk diverifikasi.");
        window.location.href = "index.html"; // Fallback jika tidak ada orderId
      }
    });
  }

  updateCartCount();
};
