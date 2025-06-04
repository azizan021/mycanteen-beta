// js/canteen-notifications.js
console.log("canteen-notifications.js loaded.");

import { fetchAPI, formatRupiah } from "./utils.js";
import { API_CONFIG } from "./api-config.js";

/**
 * Mengambil daftar notifikasi/pesanan baru untuk kantin dari API.
 * @returns {Promise<Array>} Array notifikasi.
 */
const fetchCanteenNotifications = async () => {
  try {
    // Kantin melihat pesanan 'pending', 'paid', 'processing', 'ready_for_pickup'
    const data = await fetchAPI(
      `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}?role=canteen&status=pending_or_paid_or_processing_or_ready_for_pickup`
    );
    if (!data || data.error) {
      throw new Error(data?.error || "Invalid data received");
    }
    return data.notifications || [];
  } catch (error) {
    console.error("Error fetching canteen notifications:", error);
    const notificationsList = document.getElementById("notifications-list");
    if (notificationsList) {
      notificationsList.innerHTML =
        '<p class="empty-list-message"><i class="fas fa-exclamation-triangle"></i> Gagal memuat notifikasi. Coba refresh halaman.</p>';
    }
    return [];
  }
};

/**
 * Render daftar notifikasi di halaman.
 * @param {Array} notifications - Daftar notifikasi/pesanan.
 */
const renderNotifications = (notifications) => {
  const notificationsList = document.getElementById("notifications-list");
  const loadingMessage = document.getElementById("loading-message");

  if (!notificationsList) return;

  if (loadingMessage) {
    loadingMessage.remove();
  }

  if (notifications.length === 0) {
    notificationsList.innerHTML =
      '<p class="empty-list-message"><i class="fas fa-receipt"></i> Tidak ada pesanan baru untuk kantin saat ini.</p>';
    return;
  }

  notificationsList.innerHTML = "";

  notifications.forEach((notification) => {
    const notificationCard = document.createElement("div");
    notificationCard.classList.add("notification-card");

    let itemsHtml = "";
    if (
      notification.items &&
      Array.isArray(notification.items) &&
      notification.items.length > 0
    ) {
      itemsHtml = notification.items
        .map(
          (item) => `
          <li>
            <span>${item.menu_name}</span>
            <span>(${item.quantity}x) ${formatRupiah(
            parseFloat(item.price) * parseInt(item.quantity)
          )}</span>
          </li>
        `
        )
        .join("");
    } else {
      itemsHtml = "<li>Tidak ada detail menu tersedia.</li>";
    }

    let actionsHtml = "";
    // Kantin tidak perlu courier_id karena dia yang memproses pesanan
    const canteenId = "canteen_001"; // ID kantin saat ini (placeholder)

    if (notification.status === "pending") {
      actionsHtml = `
            <span class="info-message">Menunggu pembayaran...</span>
            <button class="btn-secondary action-button" data-action="cancel" data-order-id="${notification.order_id}">Batalkan Pesanan</button>
        `;
    } else if (notification.status === "paid") {
      actionsHtml = `
        <button class="btn-primary action-button" data-action="process" data-order-id="${notification.order_id}">Proses Pesanan</button>
        <button class="btn-secondary action-button" data-action="cancel" data-order-id="${notification.order_id}">Batalkan Pesanan</button>
      `;
    } else if (notification.status === "processing") {
      actionsHtml = `
        <button class="btn-primary action-button" data-action="ready_for_pickup" data-order-id="${notification.order_id}">Siap Diambil Kurir</button>
        <button class="btn-secondary action-button" data-action="cancel" data-order-id="${notification.order_id}">Batalkan Pesanan</button>
      `;
    } else if (notification.status === "ready_for_pickup") {
      actionsHtml = `
        <span class="info-message">Menunggu kurir...</span>
        <button class="btn-secondary action-button" data-action="cancel" data-order-id="${notification.order_id}">Batalkan Pesanan</button>
      `;
    } else {
      actionsHtml = `<span class="info-message">Pesanan ${notification.status.replace(
        /_/g,
        " "
      )}.</span>`;
    }

    notificationCard.innerHTML = `
      <div class="notification-header">
        <h3>Pesanan #${notification.order_id}</h3>
        <span class="order-status ${
          notification.status
        }">${notification.status.replace(/_/g, " ")}</span>
      </div>
      <div class="notification-body">
        <p><strong>Pelanggan:</strong> ${notification.customer_name}</p>
        <p><strong>Alamat:</strong> ${notification.delivery_address}</p>
        ${
          notification.notes
            ? `<p><strong>Catatan:</strong> ${notification.notes}</p>`
            : ""
        }
        <p><strong>Total:</strong> ${formatRupiah(
          parseFloat(notification.total)
        )}</p>
        <h4>Detail Pesanan:</h4>
        <ul>${itemsHtml}</ul>
      </div>
      <div class="notification-actions">
        ${actionsHtml}
      </div>
    `;
    notificationsList.appendChild(notificationCard);
  });

  document.querySelectorAll(".action-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const orderId = event.target.dataset.orderId;
      const action = event.target.dataset.action;
      let newStatus;
      let confirmationMessage;

      switch (action) {
        case "process":
          newStatus = "processing";
          confirmationMessage = `Anda yakin ingin memproses pesanan #${orderId}?`;
          break;
        case "ready_for_pickup":
          newStatus = "ready_for_pickup";
          confirmationMessage = `Ubah status pesanan #${orderId} menjadi siap diambil kurir?`;
          break;
        case "cancel":
          newStatus = "cancelled";
          confirmationMessage = `Anda yakin ingin membatalkan pesanan #${orderId}?`;
          break;
        default:
          return;
      }

      if (confirm(confirmationMessage)) {
        // Kantin tidak mengubah courier_id, jadi biarkan null atau string kosong
        await updateOrderStatus(orderId, newStatus, null);
      }
    });
  });

  // Fungsi updateOrderStatus sama dengan yang di courier-notifications.js
  const updateOrderStatus = async (orderId, newStatus, courierId) => {
    try {
      const response = await fetchAPI(
        `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`,
        "PUT",
        {
          order_id: orderId,
          status: newStatus,
          courier_id: courierId, // Bisa null jika dari kantin
        }
      );

      if (response.success) {
        alert(
          `Status pesanan #${orderId} berhasil diubah menjadi: ${newStatus.replace(
            /_/g,
            " "
          )}`
        );
        await initCanteenNotificationsPage(); // Refresh daftar notifikasi setelah aksi
      } else {
        alert(`Gagal mengubah status pesanan #${orderId}: ${response.error}`);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(
        "Terjadi kesalahan saat memperbarui status pesanan. Silakan coba lagi."
      );
    }
  };

  const refreshButton = document.querySelector(".refresh-button");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      notificationsList.innerHTML =
        '<p class="empty-list-message"><i class="fas fa-spinner fa-spin"></i> Memuat notifikasi...</p>';
      await initCanteenNotificationsPage();
    });
  }
};

/**
 * Inisialisasi halaman notifikasi kantin.
 */
export const initCanteenNotificationsPage = async () => {
  console.log("initCanteenNotificationsPage started.");
  const notifications = await fetchCanteenNotifications();
  renderNotifications(notifications);

  setInterval(async () => {
    console.log("Refreshing canteen notifications...");
    const updatedNotifications = await fetchCanteenNotifications();
    renderNotifications(updatedNotifications);
  }, 30000);
};
