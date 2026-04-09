const { shiprocketRequest } = require("./shiprocketClient");
const { updateOrderShiprocketData } = require("./firebaseService");

function toNonEmptyString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s ? s : fallback;
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDigits(value) {
  const s = toNonEmptyString(value, "");
  return s.replace(/[^\d]/g, "");
}

function normalizeIndianPhone(value) {
  let phone = normalizeDigits(value);
  phone = phone.replace(/^0+/, "");
  if (phone.length > 10) {
    phone = phone.slice(-10);
  }
  if (phone.length !== 10) {
    return "9876543210";
  }
  return phone;
}

function normalizeIndianPincode(value) {
  const pin = normalizeDigits(value);
  return pin.length === 6 ? pin : "395006";
}

function isDebugEnabled() {
  const flag = toNonEmptyString(process.env.SHIPROCKET_DEBUG, "").toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return process.env.NODE_ENV !== "production";
}

function mapOrderToShiprocketPayload(order) {
  if (!order || typeof order !== "object") {
    throw new Error("Invalid order: expected an object");
  }

  const customer = order.customer || {};
  const address = order.address || order.addressInfo || {};
  const items = order.items || order.cartItems || [];

  const orderId = toNonEmptyString(order.id || order.orderId, "");

  const fullName = toNonEmptyString(
    customer.firstName || address.name || order.customerName,
    "Customer User"
  ).split(" ");

  const billingFirstName = fullName[0] || "Customer";
  const billingLastName = fullName.slice(1).join(" ") || "User";

  const billingAddress = toNonEmptyString(
    address.line1 || address.address || order.addressInfo?.address,
    "Default Address Line"
  );

  const billingAddress2 = toNonEmptyString(
    address.line2 || address.apartment,
    "Near Landmark"
  );

  const billingPhone = normalizeIndianPhone(
    customer.phone || address.phoneNumber || address.phone
  );

  const billingEmail = toNonEmptyString(customer.email || address.email, "test@gmail.com");

  const billingPincode = normalizeIndianPincode(address.pincode);
  const billingCity = toNonEmptyString(address.city, "Surat");
  const billingState = toNonEmptyString(address.state, "Gujarat");
  const billingCountry = "India";

  const subTotal = toNumber(order.subTotal ?? order.totalAmount, 0);

  const paymentMethodRaw = toNonEmptyString(order.paymentMethod || order.paymentMode, "Prepaid");
  const paymentMethod = paymentMethodRaw.toUpperCase() === "COD" ? "COD" : "Prepaid";

  if (!orderId) {
    throw new Error("Order is missing orderId/id");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`Order ${orderId} has no items`);
  }

  const payload = {
    order_id: orderId,
    order_date: new Date().toISOString().slice(0, 10),
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "work",
    channel_id: "",
    comment: "Order from website",

    //  FIXED FIELDS
    billing_customer_name: billingFirstName,
    billing_last_name: billingLastName,
    billing_address: billingAddress,
    billing_address_2: billingAddress2,
    billing_city: billingCity,
    billing_pincode: billingPincode,
    billing_state: billingState,
    billing_country: billingCountry,
    billing_email: billingEmail,
    billing_phone: billingPhone,

    shipping_is_billing: true,

    order_items: items.map((item, idx) => ({
      name: toNonEmptyString(item.name || item.title, `Item-${idx + 1}`),
      sku: toNonEmptyString(item.sku || item.productId || item.id, "SKU"),
      units: Math.max(1, Math.floor(toNumber(item.quantity, 1))),
      selling_price: toNumber(item.discountPrice ?? item.salePrice ?? item.price, 100),
    })),

    payment_method: paymentMethod,
    sub_total: subTotal,

    length: Number(order.length || 10),
    breadth: Number(order.breadth || 10),
    height: Number(order.height || 10),
    weight: Number(order.weight || 0.5),
  };

  console.log("✅ FINAL PAYLOAD:", payload);

  return payload;
}

async function createShiprocketOrder(order) {
  const payload = mapOrderToShiprocketPayload(order);
  const srOrder = await shiprocketRequest(
    "POST",
    "/v1/external/orders/create/adhoc",
    payload
  );
  const shipmentId = srOrder.shipment_id;

  await updateOrderShiprocketData(order.id || order.orderId, {
    shiprocketOrderId: srOrder.order_id || null,
    shiprocketShipmentId: srOrder.shipment_id || null,
    shippingStatus: "ORDER_CREATED",
    shiprocketRawCreateOrder: srOrder,
  });
  if (shipmentId) {
    await assignAwbToShipment(shipmentId, order.id || order.orderId);
  }
  return srOrder;
}
async function assignAwbToShipment(shipmentId, localOrderId) {
  const awbRes = await shiprocketRequest(
    "POST",
    "/v1/external/courier/assign/awb",
    {
      shipment_id: shipmentId
    }
  );

  const awbData = awbRes?.data?.awb_assignments?.[0];

  await updateOrderShiprocketData(localOrderId, {
    trackingId: awbData?.awb_code || null,
    courierName: awbData?.courier_name || null,
    shippingStatus: "AWB_ASSIGNED",
    shiprocketRawAwb: awbRes
  });

  return awbRes;
}
async function generateLabelForOrder({ shipmentId, localOrderId }) {
  const labelRes = await shiprocketRequest(
    "POST",
    "/v1/external/courier/generate/label",
    { shipment_id: [shipmentId] }
  );

  await updateOrderShiprocketData(localOrderId, {
    labelUrl: labelRes && labelRes.label_url ? labelRes.label_url : null,
    shippingStatus: "LABEL_GENERATED",
    shiprocketRawLabel: labelRes,
  });

  return labelRes;
}

module.exports = {
  mapOrderToShiprocketPayload,
  createShiprocketOrder,
  generateLabelForOrder,
  assignAwbToShipment,

};
