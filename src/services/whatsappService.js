const axios = require("axios");

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const OWNER_PHONE = process.env.OWNER_WHATSAPP;

// ─── Core: Message bhejo ───
async function sendWhatsAppMessage(to, text) {
    const phone = to.replace(/\D/g, "");
    const withCode = phone.startsWith("91") ? phone : `91${phone}`;

    await axios.post(
        `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
        {
            messaging_product: "whatsapp",
            to: withCode,
            type: "text",
            text: { body: text },
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
}

// ─── 1. Customer ko Order Confirm ───
async function sendCustomerConfirmation(order) {
    const { addressInfo, cartItems, totalAmount, orderId, paymentMode } = order;

    const itemsList = cartItems.map((item, i) => {
        let size = "";
        if (item.selectedSizes?.pant) size += `Pant: ${item.selectedSizes.pant} `;
        if (item.selectedSizes?.shirt) size += `Shirt: ${item.selectedSizes.shirt}`;
        const qty = item.quantity || 1;
        const price = Number(
            (item.discountPrice || item.price || "0").toString().replace(/[^0-9.]/g, "")
        );
        return (
            `${i + 1}. ${item.title}${size ? ` (${size.trim()})` : ""}` +
            `\n   ₹${price} x ${qty} = ₹${(price * qty).toFixed(0)}`
        );
    }).join("\n");

    const message =
        `✅ *Order Confirm Ho Gaya!*\n\n` +
        `🆔 Order ID: ${orderId}\n` +
        `👤 Naam: ${addressInfo.name}\n\n` +
        `📦 *Aapke Items:*\n${itemsList}\n\n` +
        `💰 Total: ₹${totalAmount}\n` +
        `💳 Payment: ${paymentMode === "COD" ? "Cash on Delivery 🚚" : "Prepaid ✅"}\n` +
        `🏠 Address: ${addressInfo.address}, ${addressInfo.city}, ${addressInfo.state} - ${addressInfo.pincode}\n\n` +
        `📅 Delivery: 2-3 business days\n\n` +
        `Koi sawaal ho to reply karein 😊\n` +
        `— Fastion Store`;

    await sendWhatsAppMessage(addressInfo.phoneNumber, message);
}

// ─── 2. Owner ko New Order Alert ───
async function sendOwnerAlert(order) {
    const { addressInfo, cartItems, totalAmount, orderId, paymentMode } = order;

    const itemsList = cartItems.map((item, i) => {
        let size = "";
        if (item.selectedSizes?.pant) size += `Pant: ${item.selectedSizes.pant} `;
        if (item.selectedSizes?.shirt) size += `Shirt: ${item.selectedSizes.shirt}`;
        const qty = item.quantity || 1;
        return `${i + 1}. ${item.title}${size ? ` (${size.trim()})` : ""} x${qty}`;
    }).join("\n");

    const message =
        `🛒 *Naya Order Aaya!*\n\n` +
        `🆔 Order ID: ${orderId}\n` +
        `👤 Customer: ${addressInfo.name}\n` +
        `📞 Phone: ${addressInfo.phoneNumber}\n` +
        `📧 Email: ${addressInfo.email}\n\n` +
        `📦 *Items:*\n${itemsList}\n\n` +
        `💰 Total: ₹${totalAmount}\n` +
        `💳 Payment: ${paymentMode === "COD" ? "COD 💵" : "Prepaid ✅"}\n\n` +
        `🏠 *Address:*\n` +
        `${addressInfo.address}, ${addressInfo.city}\n` +
        `${addressInfo.state} - ${addressInfo.pincode}`;

    await sendWhatsAppMessage(OWNER_PHONE, message);
}

// ─── 3. Prepaid — Payment Confirmed ───
async function sendPaymentConfirmed(order, paymentId, amount) {
    const message =
        `🎉 *Payment Successful!*\n\n` +
        `🆔 Order ID: ${order.orderId}\n` +
        `💰 Paid: ₹${amount}\n` +
        `🔖 Payment ID: ${paymentId}\n\n` +
        `📦 Order pack ho raha hai!\n` +
        `Delivery: 2-3 business days 🚚\n\n` +
        `Shukriya! — Fastion Store 🙏`;

    await sendWhatsAppMessage(order.addressInfo.phoneNumber, message);
}

// ─── 4. COD Reminder ───
async function sendPaymentReminder(order) {
    const message =
        `⏰ *Delivery Reminder*\n\n` +
        `🆔 Order ID: ${order.orderId}\n` +
        `💰 Amount: ₹${order.totalAmount}\n\n` +
        `Aapka order deliver hone wala hai!\n` +
        `Cash ready rakhein 💵\n\n` +
        `— Fastion Store`;

    await sendWhatsAppMessage(order.addressInfo.phoneNumber, message);
}

// ─── 5. Shipping Status ───
async function sendShippingStatus(order, currentStatus, shippingStatus) {
    const name = order?.addressInfo?.name || "Customer";
    const orderId = order?.orderId || "";
    let message = null;

    if (shippingStatus === "DELIVERED" || currentStatus === "Delivered") {
        message =
            `🎉 *Order Deliver Ho Gaya!*\n\n` +
            `👤 ${name}\n` +
            `🆔 Order ID: ${orderId}\n\n` +
            `Humein umeed hai aapko product pasand aaya! 😊\n` +
            `Review dena mat bhoolein ⭐\n\n` +
            `Dobara aane ke liye shukriya! 🙏\n` +
            `— Fastion Store`;
    } else if (currentStatus === "Out for Delivery") {
        message =
            `🚚 *Order Aaj Deliver Hoga!*\n\n` +
            `👤 ${name}\n` +
            `🆔 Order ID: ${orderId}\n\n` +
            `Delivery boy aaj aayega!\n` +
            `Phone paas rakhein 📞\n\n` +
            `— Fastion Store`;
    } else if (currentStatus === "Shipped" || shippingStatus === "SHIPPED") {
        message =
            `📦 *Order Ship Ho Gaya!*\n\n` +
            `👤 ${name}\n` +
            `🆔 Order ID: ${orderId}\n\n` +
            `Aapka order raste mein hai!\n` +
            `Delivery: 2-3 business days 🚚\n\n` +
            `— Fastion Store`;
    } else if (currentStatus === "RTO" || currentStatus === "RTO Initiated") {
        message =
            `⚠️ *Order Return Ho Raha Hai*\n\n` +
            `🆔 Order ID: ${orderId}\n\n` +
            `Delivery unsuccessful thi.\n` +
            `Koi sawaal ho to reply karein 😊\n\n` +
            `— Fastion Store`;
    }

    if (message) {
        await sendWhatsAppMessage(order.addressInfo.phoneNumber, message);
    }
}

module.exports = {
    sendWhatsAppMessage,
    sendCustomerConfirmation,
    sendOwnerAlert,
    sendPaymentConfirmed,
    sendPaymentReminder,
    sendShippingStatus,
};