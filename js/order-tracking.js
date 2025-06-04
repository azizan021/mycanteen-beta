// js/order-tracking.js

import { fetchAPI, getUrlParam, formatRupiah } from "./utils.js";
import { API_CONFIG } from "./api-config.js";

/**
 * Mengambil detail pesanan berdasarkan ID untuk ditampilkan kepada pelanggan.
 * @param {string} orderId - ID pesanan.
 * @returns {Promise<object|null>} Detail pesanan atau null jika gagal.
 */
const fetchOrderDetails = async (orderId) => {
  try {
    const data = await fetchAPI(
      `${API_CONFIG.ENDPOINTS.ORDERS}?order_id=${orderId}&role=customer`
    );
    if (!data || data.error) {
      throw new Error(data?.error || "Order not found");
    }
    return data.order;
  } catch (error) {
    console.error(`Error fetching order details for ID ${orderId}:`, error);
    const orderStatusCard = document.getElementById("order-status-card");
    if (orderStatusCard) {
      orderStatusCard.innerHTML = `<p class="empty-list-message"><i class="fas fa-exclamation-triangle"></i> Gagal memuat detail pesanan. Pastikan ID pesanan benar atau coba refresh halaman.</p>`;
    }
    return null;
  }
};

/**
 * Render detail pesanan dan status di halaman pelacakan.
 * @param {object} order - Objek detail pesanan.
 */
const renderOrderStatus = (order) => {
  const orderStatusCard = document.getElementById("order-status-card");
  const orderTrackingDetails = document.getElementById(
    "order-tracking-details"
  );

  if (!orderStatusCard || !orderTrackingDetails) return;

  // Clear loading message
  const loadingMessage = document.getElementById("loading-order-message");
  if (loadingMessage) {
    loadingMessage.remove();
  }

  if (!order) {
    orderStatusCard.innerHTML = `<p class="empty-list-message"><i class="fas fa-search"></i> Pesanan tidak ditemukan.</p>`;
    return;
  }

  let itemsHtml = "";
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    itemsHtml = order.items
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

  // Tentukan ikon berdasarkan status
  let statusIcon = "";
  let statusMessage = "";
  let statusClass = order.status;

  switch (order.status) {
    case "pending":
      statusIcon = `<i class="fas fa-hourglass-start"></i>`;
      statusMessage = "Menunggu Pembayaran";
      break;
    case "paid":
      statusIcon = `<i class="fas fa-money-check-alt"></i>`;
      statusMessage = "Pembayaran Dikonfirmasi, Menunggu Diproses Kantin";
      break;
    case "processing":
      statusIcon = `<i class="fas fa-concierge-bell"></i>`;
      statusMessage = "Pesanan Sedang Disiapkan Kantin";
      break;
    case "ready_for_pickup":
      statusIcon = `<i class="fas fa-box-open"></i>`;
      statusMessage = "Pesanan Siap Diambil Kurir";
      break;
    case "assigned_to_courier":
      statusIcon = `<i class="fas fa-user-tie"></i>`;
      statusMessage = `Kurir Telah Menerima Pesanan (${order.courier_id})`;
      break;
    case "on_delivery":
      statusIcon = `<i class="fas fa-truck"></i>`;
      statusMessage = `Pesanan Dalam Perjalanan (${order.courier_id})`;
      break;
    case "delivered":
      statusIcon = `<i class="fas fa-check-circle"></i>`;
      statusMessage = "Pesanan Telah Diterima!";
      break;
    case "cancelled":
      statusIcon = `<i class="fas fa-times-circle"></i>`;
      statusMessage = "Pesanan Dibatalkan";
      break;
    case "failed_delivery":
      statusIcon = `<i class="fas fa-exclamation-triangle"></i>`;
      statusMessage = `Pengiriman Gagal (${order.courier_id || "N/A"})`;
      break;
    case "rejected_by_courier":
      statusIcon = `<i class="fas fa-ban"></i>`;
      statusMessage = "Kurir Menolak Pesanan, Menunggu Kurir Lain";
      break;
    default:
      statusIcon = `<i class="fas fa-question-circle"></i>`;
      statusMessage = "Status Tidak Diketahui";
      statusClass = "unknown";
  }

  orderStatusCard.innerHTML = `
    <div class="notification-header">
      <h3>Pesanan #${order.order_id}</h3>
      <span class="order-status ${statusClass}">${order.status.replace(
    /_/g,
    " "
  )}</span>
    </div>
    <div class="notification-body">
      <p class="status-message">
        ${statusIcon} ${statusMessage}
      </p>
      <p><strong>Nama:</strong> ${order.customer_name}</p>
      <p><strong>Alamat:</strong> ${order.delivery_address}</p>
      ${order.notes ? `<p><strong>Catatan:</strong> ${order.notes}</p>` : ""}
      <p><strong>Total:</strong> ${formatRupiah(parseFloat(order.total))}</p>
      <h4>Detail Pesanan:</h4>
      <ul>${itemsHtml}</ul>
      <p class="order-date">Dipesan pada: ${new Date(
        order.order_date
      ).toLocaleString("id-ID")}</p>
    </div>
  `;

  // Anda bisa menambahkan detail lain seperti estimasi waktu, lokasi kurir (jika ada data GPS), dll.
  // Untuk demo ini, kita hanya akan menampilkan informasi dasar.
  orderTrackingDetails.innerHTML = `
    <div class="tracking-timeline">
        <h4>Riwayat Status:</h4>
        </div>
  `;

  // Simulate a simple timeline based on current status
  const timelineDiv = orderTrackingDetails.querySelector(".tracking-timeline");
  const addTimelineStep = (label, isCompleted) => {
    const step = document.createElement("div");
    step.classList.add("timeline-step");
    if (isCompleted) {
      step.classList.add("completed");
    }
    step.innerHTML = `<span class="timeline-dot"></span><span class="timeline-label">${label}</span>`;
    timelineDiv.appendChild(step);
  };

  addTimelineStep("Pesanan Dibuat", true);
  if (order.status !== "pending") {
    addTimelineStep(
      "Pembayaran Dikonfirmasi",
      [
        "paid",
        "processing",
        "ready_for_pickup",
        "assigned_to_courier",
        "on_delivery",
        "delivered",
      ].includes(order.status)
    );
  }
  if (
    [
      "processing",
      "ready_for_pickup",
      "assigned_to_courier",
      "on_delivery",
      "delivered",
    ].includes(order.status)
  ) {
    addTimelineStep(
      "Pesanan Diproses Kantin",
      [
        "processing",
        "ready_for_pickup",
        "assigned_to_courier",
        "on_delivery",
        "delivered",
      ].includes(order.status)
    );
  }
  if (
    [
      "ready_for_pickup",
      "assigned_to_courier",
      "on_delivery",
      "delivered",
    ].includes(order.status)
  ) {
    addTimelineStep(
      "Siap Diambil Kurir",
      [
        "ready_for_pickup",
        "assigned_to_courier",
        "on_delivery",
        "delivered",
      ].includes(order.status)
    );
  }
  if (
    ["assigned_to_courier", "on_delivery", "delivered"].includes(order.status)
  ) {
    addTimelineStep(
      "Diambil Kurir",
      ["assigned_to_courier", "on_delivery", "delivered"].includes(order.status)
    );
  }
  if (["on_delivery", "delivered"].includes(order.status)) {
    addTimelineStep(
      "Dalam Perjalanan",
      ["on_delivery", "delivered"].includes(order.status)
    );
  }
  if (order.status === "delivered") {
    addTimelineStep("Pesanan Diterima", order.status === "delivered");
  }
};

/**
 * Inisialisasi halaman pelacakan pesanan pelanggan.
 */
export const initOrderTrackingPage = async () => {
  const orderId = getUrlParam("order_id");

  if (!orderId) {
    // Jika tidak ada order_id di URL, coba ambil dari localStorage (setelah placeOrder)
    const storedOrderId = localStorage.getItem("lastPlacedOrderId");
    if (storedOrderId) {
      // Hapus dari localStorage setelah mendapatkan, agar tidak terus-menerus melacak order yang sama
      localStorage.removeItem("lastPlacedOrderId");
      window.location.href = `order-tracking.html?order_id=${storedOrderId}`;
      return;
    } else {
      const orderStatusCard = document.getElementById("order-status-card");
      if (orderStatusCard) {
        orderStatusCard.innerHTML = `<p class="empty-list-message"><i class="fas fa-info-circle"></i> Tidak ada ID pesanan yang ditentukan untuk dilacak. Silakan lakukan pemesanan terlebih dahulu.</p>`;
      }
      return;
    }
  }

  const order = await fetchOrderDetails(orderId);
  renderOrderStatus(order);

  // Auto-refresh status setiap 15 detik
  setInterval(async () => {
    console.log(`Refreshing order status for order ID: ${orderId}...`);
    const updatedOrder = await fetchOrderDetails(orderId);
    renderOrderStatus(updatedOrder);
  }, 15000); // Refresh setiap 15 detik
};
