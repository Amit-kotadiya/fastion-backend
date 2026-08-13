const express = require("express");

const { createShiprocketOrder, generateLabelForOrder } = require("../services/shiprocketService");
const {
  saveOrderToFirestore,
  getOrderById,
  updateOrderShiprocketData,
} = require("../services/firebaseService");

const router = express.Router();

const SHIPPING_CHARGE = 100;
// const PREPAID_DISCOUNT_AMOUNT = 50;

const calculateOrderAmount = (cartItems) => {
  const subtotal = (cartItems || []).reduce((sum, item) => {
    let price = Number(String(item.price).replace(/[^0-9.]/g, "")) || 0;
    let discount = Number(String(item.discountPrice).replace(/[^0-9.]/g, "")) || 0;
    if (discount > price) [price, discount] = [discount, price];
    let base = discount > 0 && discount < price ? discount : price;

    const pantSize = Number(item.selectedSizes?.pant);
    if (pantSize >= 36) base += 50;
    const shirtSize = item.selectedSizes?.shirt?.toUpperCase();
    if (shirtSize === "XXL" || shirtSize === "2XL") base += 50;

    return sum + base * (item.quantity || 1);
  }, 0);

  const shippingCharge = SHIPPING_CHARGE;
  // const prepaidDiscount = paymentMode === "Prepaid" ? PREPAID_DISCOUNT_AMOUNT : 0;
  // const totalAmount = subtotal - prepaidDiscount + shippingCharge;
  const totalAmount = subtotal + shippingCharge;
  return { subtotal, shippingCharge, totalAmount };
};

router.post("/create", async (req, res) => {
  try {
    const order = req.body;

    if (!order.cartItems || !Array.isArray(order.cartItems) || order.cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart items missing" });
    }

    const { subtotal, shippingCharge, totalAmount } =
      calculateOrderAmount(order.cartItems);

    order.subtotal = subtotal;
    order.shippingCharge = shippingCharge;
    // order.prepaidDiscount = prepaidDiscount;
    order.totalAmount = totalAmount;

    const savedOrder = await saveOrderToFirestore(order);

    let shiprocketResult = null;
    let shiprocketErrorPayload = null;
    try {
      shiprocketResult = await createShiprocketOrder(savedOrder);
    } catch (shiprocketError) {
      shiprocketErrorPayload = shiprocketError.response
        ? shiprocketError.response.data
        : shiprocketError.message;

      console.error("Shiprocket create order failed:", shiprocketErrorPayload);

      await updateOrderShiprocketData(savedOrder.id, {
        shippingStatus: "SYNC_FAILED",
        shiprocketError: shiprocketErrorPayload,
      });
    }

    res.status(201).json({
      success: true,
      orderId: savedOrder.id,
      totalAmount,
      shiprocketSynced: Boolean(shiprocketResult),
      shiprocket: shiprocketResult,
      shiprocketError: shiprocketErrorPayload,
    });
  } catch (error) {
    console.error("Order create failed:", error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
});
router.post("/:orderId/sync-shiprocket", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.shiprocketOrderId) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Order is already synced",
      });
    }

    const shiprocket = await createShiprocketOrder(order);
    return res.status(200).json({ success: true, shiprocket });
  } catch (error) {
    console.error("Shiprocket sync failed:", error.response ? error.response.data : error.message);
    return res.status(500).json({ success: false, message: "Shiprocket sync failed" });
  }
});

router.post("/:orderId/generate-label", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (!order.shiprocketShipmentId) {
      return res.status(400).json({
        success: false,
        message: "Cannot generate label without shiprocketShipmentId",
      });
    }

    const label = await generateLabelForOrder({
      shipmentId: order.shiprocketShipmentId,
      localOrderId: order.id,
    });

    return res.status(200).json({ success: true, label });
  } catch (error) {
    console.error(
      "Label generation failed:",
      error.response ? error.response.data : error.message
    );
    return res.status(500).json({ success: false, message: "Label generation failed" });
  }
});
// CANCEL ORDER
router.post("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.shiprocketOrderId) {
      return res.status(400).json({ success: false, message: "Shiprocket order not found" });
    }

    const { shiprocketRequest } = require("../services/shiprocketClient");

    const cancelRes = await shiprocketRequest(
      "POST",
      "/v1/external/orders/cancel",
      { ids: [order.shiprocketOrderId] }
    );

    await updateOrderShiprocketData(orderId, {
      shippingStatus: "CANCELLED",
      status: "Cancelled",
      shiprocketRawCancel: cancelRes,
    });

    return res.status(200).json({ success: true, cancel: cancelRes });

  } catch (error) {
    console.error("Cancel failed:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Cancel failed" });
  }
});
// RTO RETURN TO ORIGIN
router.post("/:orderId/rto", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    await updateOrderShiprocketData(orderId, {
      status: "RTO",
      rtoMarkedAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: "Order marked as RTO" });
  } catch (error) {
    console.error("RTO failed:", error.message);
    return res.status(500).json({ success: false, message: "RTO update failed" });
  }
});
// RETURN ORDER
router.post("/:orderId/return", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const { shiprocketRequest } = require("../services/shiprocketClient");

    const returnRes = await shiprocketRequest(
      "POST",
      "/v1/external/orders/create/return",
      {
        order_id: order.shiprocketOrderId,
        order_date: new Date().toISOString().slice(0, 10),
        channel_name: "",
        pickup_customer_name: order.addressInfo?.name || "",
        pickup_address: order.addressInfo?.address || "",
        pickup_city: order.addressInfo?.city || "",
        pickup_state: order.addressInfo?.state || "",
        pickup_country: "India",
        pickup_pincode: order.addressInfo?.pincode || "",
        pickup_email: order.addressInfo?.email || "",
        pickup_phone: order.addressInfo?.phoneNumber || "",
        shipping_customer_name: "BlueDevis Store",
        shipping_address: process.env.SHIPROCKET_PICKUP_ADDRESS || "Your Address",
        shipping_city: process.env.SHIPROCKET_PICKUP_CITY || "Surat",
        shipping_country: "India",
        shipping_pincode: process.env.SHIPROCKET_PICKUP_PINCODE || "395006",
        shipping_state: "Gujarat",
        shipping_email: "kotadiyabalu475@gmail.com",
        shipping_phone: "9429222441",
        order_items: order.cartItems.map((item, idx) => ({
          name: item.title,
          sku: item.id + "-" + idx,
          units: item.quantity || 1,
          selling_price: item.discountPrice || item.price || 100,
        })),
        payment_method: order.paymentMode === "COD" ? "COD" : "Prepaid",
        sub_total: order.totalAmount,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5,
      }
    );

    await updateOrderShiprocketData(orderId, {
      returnShiprocketOrderId: returnRes.order_id || null,
      returnStatus: "RETURN_CREATED",
      status: "Returned",
      shiprocketRawReturn: returnRes,
    });

    return res.status(200).json({ success: true, return: returnRes });

  } catch (error) {
    console.error("Return failed:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Return failed" });
  }
});
module.exports = router;
