// js/courier-notifications.js
console.log("courier-notifications.js loaded.");

import { fetchAPI, formatRupiah } from "./utils.js";
import { API_CONFIG } from "./api-config.js";

/**
 * Mengambil daftar notifikasi/pesanan baru untuk kurir dari API.
 * @returns {Promise<Array>} Array notifikasi.
 */
const fetchCourierNotifications = async () => {
  try {
    // Kurir melihat pesanan yang 'paid', 'processing', 'ready_for_pickup', 'assigned_to_courier', 'on_delivery'
    const data = await fetchAPI(
      `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}?role=courier&status=paid_or_processing_or_ready_for_pickup_or_assigned_to_courier_or_on_delivery`
    );
    if (!data || data.error) {
      throw new Error(data?.error || "Invalid data received");
    }
    return data.notifications || [];
  } catch (error) {
    console.error("Error fetching courier notifications:", error);
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
      '<p class="empty-list-message"><i class="fas fa-box-open"></i> Tidak ada notifikasi pesanan baru yang perlu ditangani saat ini.</p>';
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
    const currentCourierId = "courier_001"; // Ganti dengan ID kurir yang sebenarnya

    if (
      notification.status === "paid" ||
      notification.status === "processing" ||
      notification.status === "ready_for_pickup"
    ) {
      actionsHtml = `
        <button class="btn-primary action-button" data-action="accept" data-order-id="${notification.order_id}" data-courier-id="${currentCourierId}">Ambil Pesanan</button>
        <button class="btn-secondary action-button" data-action="reject" data-order-id="${notification.order_id}" data-courier-id="${currentCourierId}">Tolak Pesanan</button>
      `;
    } else if (
      notification.status === "assigned_to_courier" &&
      notification.courier_id === currentCourierId
    ) {
      actionsHtml = `
        <button class="btn-primary action-button" data-action="on_delivery" data-order-id="${notification.order_id}" data-courier-id="${currentCourierId}">Pesanan Di Antar</button>
        <button class="btn-secondary action-button" data-action="cancel_assign" data-order-id="${notification.order_id}" data-courier-id="${currentCourierId}">Batalkan Ambil</button>
      `;
    } else if (
      notification.status === "on_delivery" &&
      notification.courier_id === currentCourierId
    ) {
      actionsHtml = `
        <button class="btn-primary action-button" data-action="delivered" data-order-id="${notification.order_id}" data-courier-id="${currentCourierId}">Selesai Di Antar</button>
        <button class="btn-secondary action-button" data-action="failed_delivery" data-order-id="${notification.order_id}" data-courier-id="${currentCourierId}">Gagal Di Antar</button>
      `;
    } else if (
      notification.status === "delivered" ||
      notification.status === "cancelled" ||
      notification.status === "failed_delivery" ||
      notification.status === "rejected_by_courier"
    ) {
      actionsHtml = `<span class="info-message">Pesanan ini sudah ${notification.status.replace(
        /_/g,
        " "
      )}.</span>`;
    } else {
      actionsHtml = `<span class="info-message">Menunggu aksi kantin...</span>`;
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
      const courierId = event.target.dataset.courierId;
      let newStatus;
      let confirmationMessage;

      switch (action) {
        case "accept":
          newStatus = "assigned_to_courier";
          confirmationMessage = `Anda yakin ingin menerima pesanan #${orderId}?`;
          break;
        case "reject":
          newStatus = "rejected_by_courier";
          confirmationMessage = `Anda yakin ingin menolak pesanan #${orderId}?`;
          break;
        case "on_delivery":
          newStatus = "on_delivery";
          confirmationMessage = `Ubah status pesanan #${orderId} menjadi 'Pesanan Di Antar'?`;
          break;
        case "delivered":
          newStatus = "delivered";
          confirmationMessage = `Selesaikan pesanan #${orderId} (sudah terkirim)?`;
          break;
        case "failed_delivery":
          newStatus = "failed_delivery";
          confirmationMessage = `Laporkan pengiriman pesanan #${orderId} gagal?`;
          break;
        case "cancel_assign":
          newStatus = "ready_for_pickup"; // Kembali ke status siap diambil oleh kurir lain
          confirmationMessage = `Batalkan pengambilan pesanan #${orderId}? Pesanan akan tersedia untuk kurir lain.`;
          break;
        default:
          return;
      }

      if (confirm(confirmationMessage)) {
        await updateOrderStatus(orderId, newStatus, courierId);
      }
    });
  });

  const refreshButton = document.querySelector(".refresh-button");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      notificationsList.innerHTML =
        '<p class="empty-list-message"><i class="fas fa-spinner fa-spin"></i> Memuat notifikasi...</p>';
      await initCourierNotificationsPage();
    });
  }
};

/**
 * Mengirim pembaruan status pesanan ke API.
 * @param {string} orderId
 * @param {string} newStatus
 * @param {string} courierId - ID kurir yang melakukan aksi
 */
const updateOrderStatus = async (orderId, newStatus, courierId) => {
  try {
    const response = await fetchAPI(
      `${API_CONFIG.ENDPOINTS.NOTIFICATIONS}`,
      "PUT",
      {
        order_id: orderId,
        status: newStatus,
        courier_id: courierId,
      }
    );

    if (response.success) {
      alert(
        `Status pesanan #${orderId} berhasil diubah menjadi: ${newStatus.replace(
          /_/g,
          " "
        )}`
      );
      await initCourierNotificationsPage();
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

/**
 * Inisialisasi halaman notifikasi kurir.
 */
export const initCourierNotificationsPage = async () => {
  console.log("initCourierNotificationsPage started.");
  const notifications = await fetchCourierNotifications();
  renderNotifications(notifications);

  setInterval(async () => {
    console.log("Refreshing courier notifications...");
    const updatedNotifications = await fetchCourierNotifications();
    renderNotifications(updatedNotifications);
  }, 30000);
};
