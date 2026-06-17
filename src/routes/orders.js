// const express = require("express");

// const { createShiprocketOrder, generateLabelForOrder } = require("../services/shiprocketService");
// const {
//   saveOrderToFirestore,
//   getOrderById,
//   updateOrderShiprocketData,
// } = require("../services/firebaseService");

// const router = express.Router();

// router.post("/create", async (req, res) => {
//   try {
//     const order = req.body;
//     const savedOrder = await saveOrderToFirestore(order);

//     let shiprocketResult = null;
//     let shiprocketErrorPayload = null;
//     try {
//       shiprocketResult = await createShiprocketOrder(savedOrder);
//     } catch (shiprocketError) {
//       shiprocketErrorPayload = shiprocketError.response
//         ? shiprocketError.response.data
//         : shiprocketError.message;

//       // eslint-disable-next-line no-console
//       console.error("Shiprocket create order failed:", shiprocketErrorPayload);

//       await updateOrderShiprocketData(savedOrder.id, {
//         shippingStatus: "SYNC_FAILED",
//         shiprocketError: shiprocketErrorPayload,
//       });
//     }

//     res.status(201).json({
//       success: true,
//       orderId: savedOrder.id,
//       shiprocketSynced: Boolean(shiprocketResult),
//       shiprocket: shiprocketResult,
//       shiprocketError: shiprocketErrorPayload,
//     });
//   } catch (error) {
//     // eslint-disable-next-line no-console
//     console.error("Order create failed:", error.response ? error.response.data : error.message);
//     res.status(500).json({ success: false, message: "Order creation failed" });
//   }
// });

// router.post("/:orderId/sync-shiprocket", async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await getOrderById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }
//     if (order.shiprocketOrderId) {
//       return res.status(200).json({
//         success: true,
//         skipped: true,
//         message: "Order is already synced",
//       });
//     }

//     const shiprocket = await createShiprocketOrder(order);
//     return res.status(200).json({ success: true, shiprocket });
//   } catch (error) {
//     // eslint-disable-next-line no-console
//     console.error("Shiprocket sync failed:", error.response ? error.response.data : error.message);
//     return res.status(500).json({ success: false, message: "Shiprocket sync failed" });
//   }
// });

// router.post("/:orderId/generate-label", async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await getOrderById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }
//     if (!order.shiprocketShipmentId) {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot generate label without shiprocketShipmentId",
//       });
//     }

//     const label = await generateLabelForOrder({
//       shipmentId: order.shiprocketShipmentId,
//       localOrderId: order.id,
//     });

//     return res.status(200).json({ success: true, label });
//   } catch (error) {
//     // eslint-disable-next-line no-console
//     console.error(
//       "Label generation failed:",
//       error.response ? error.response.data : error.message
//     );
//     return res.status(500).json({ success: false, message: "Label generation failed" });
//   }
// });
// // CANCEL ORDER
// router.post("/:orderId/cancel", async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await getOrderById(orderId);

//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     if (!order.shiprocketOrderId) {
//       return res.status(400).json({ success: false, message: "Shiprocket order not found" });
//     }

//     const { shiprocketRequest } = require("../services/shiprocketClient");

//     const cancelRes = await shiprocketRequest(
//       "POST",
//       "/v1/external/orders/cancel",
//       { ids: [order.shiprocketOrderId] }
//     );

//     await updateOrderShiprocketData(orderId, {
//       shippingStatus: "CANCELLED",
//       status: "Cancelled",
//       shiprocketRawCancel: cancelRes,
//     });

//     return res.status(200).json({ success: true, cancel: cancelRes });

//   } catch (error) {
//     console.error("Cancel failed:", error.response?.data || error.message);
//     return res.status(500).json({ success: false, message: "Cancel failed" });
//   }
// });

// // RETURN ORDER
// router.post("/:orderId/return", async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await getOrderById(orderId);

//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     const { shiprocketRequest } = require("../services/shiprocketClient");

//     const returnRes = await shiprocketRequest(
//       "POST",
//       "/v1/external/orders/create/return",
//       {
//         order_id: order.shiprocketOrderId,
//         order_date: new Date().toISOString().slice(0, 10),
//         channel_name: "",
//         pickup_customer_name: order.addressInfo?.name || "",
//         pickup_address: order.addressInfo?.address || "",
//         pickup_city: order.addressInfo?.city || "",
//         pickup_state: order.addressInfo?.state || "",
//         pickup_country: "India",
//         pickup_pincode: order.addressInfo?.pincode || "",
//         pickup_email: order.addressInfo?.email || "",
//         pickup_phone: order.addressInfo?.phoneNumber || "",
//         shipping_customer_name: "BlueDevis Store",
//         shipping_address: process.env.SHIPROCKET_PICKUP_ADDRESS || "Your Address",
//         shipping_city: process.env.SHIPROCKET_PICKUP_CITY || "Surat",
//         shipping_country: "India",
//         shipping_pincode: process.env.SHIPROCKET_PICKUP_PINCODE || "395006",
//         shipping_state: "Gujarat",
//         shipping_email: "kotadiyabalu475@gmail.com",
//         shipping_phone: "9429222441",
//         order_items: order.cartItems.map((item, idx) => ({
//           name: item.title,
//           sku: item.id + "-" + idx,
//           units: item.quantity || 1,
//           selling_price: item.discountPrice || item.price || 100,
//         })),
//         payment_method: order.paymentMode === "COD" ? "COD" : "Prepaid",
//         sub_total: order.totalAmount,
//         length: 10,
//         breadth: 10,
//         height: 10,
//         weight: 0.5,
//       }
//     );

//     await updateOrderShiprocketData(orderId, {
//       returnShiprocketOrderId: returnRes.order_id || null,
//       returnStatus: "RETURN_CREATED",
//       shiprocketRawReturn: returnRes,
//     });

//     return res.status(200).json({ success: true, return: returnRes });

//   } catch (error) {
//     console.error("Return failed:", error.response?.data || error.message);
//     return res.status(500).json({ success: false, message: "Return failed" });
//   }
// });
// module.exports = router;
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const { createShiprocketOrder, generateLabelForOrder } = require("../services/shiprocketService");
const {
  saveOrderToFirestore,
  getOrderById,
  updateOrderShiprocketData,
} = require("../services/firebaseService");
const {
  sendCustomerConfirmation,
  sendOwnerAlert,
  sendPaymentConfirmed,
  sendPaymentReminder,
  sendWhatsAppMessage,
} = require("../services/whatsappService");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Order Create ───
router.post("/create", async (req, res) => {
  try {
    const order = req.body;
    const savedOrder = await saveOrderToFirestore(order);

    // Owner ko alert
    try {
      await sendOwnerAlert(savedOrder);
    } catch (err) {
      console.error("Owner alert failed:", err.message);
    }

    // ─── PREPAID — Razorpay Payment Link ───
    if (order.paymentMode === "Prepaid") {
      try {
        const paymentLinkRes = await razorpay.paymentLink.create({
          amount: Math.round(order.totalAmount * 100),
          currency: "INR",
          accept_partial: false,
          description: `Fastion Store — Order #${savedOrder.id}`,
          customer: {
            name: order.addressInfo.name,
            contact: `+91${order.addressInfo.phoneNumber.replace(/\D/g, "").slice(-10)}`,
            email: order.addressInfo.email,
          },
          notify: { sms: false, email: false },
          reminder_enable: false,
          notes: { orderId: savedOrder.id },
          callback_url: `${process.env.FRONTEND_URL}/order`,
          callback_method: "get",
          upi_link: true,
        });

        await updateOrderShiprocketData(savedOrder.id, {
          razorpayPaymentLinkId: paymentLinkRes.id,
          razorpayPaymentLink: paymentLinkRes.short_url,
          paymentStatus: "unpaid",
        });

        return res.status(201).json({
          success: true,
          orderId: savedOrder.id,
          paymentLink: paymentLinkRes.short_url,
        });

      } catch (err) {
        console.error("Payment link failed:", err.message);
        return res.status(500).json({ success: false, message: "Payment link failed" });
      }
    }

    // ─── COD ───
    if (order.paymentMode === "COD") {
      try {
        await sendCustomerConfirmation(savedOrder);
      } catch (err) {
        console.error("COD WhatsApp failed:", err.message);
      }

      let shiprocketSynced = false;
      try {
        await createShiprocketOrder(savedOrder);
        shiprocketSynced = true;
      } catch (err) {
        console.error("Shiprocket failed:", err.message);
        await updateOrderShiprocketData(savedOrder.id, {
          shippingStatus: "SYNC_FAILED",
          shiprocketError: err.message,
        });
      }

      // 2 ghante baad COD reminder
      setTimeout(async () => {
        try {
          await sendPaymentReminder(savedOrder);
        } catch (err) {
          console.error("Reminder failed:", err.message);
        }
      }, 2 * 60 * 60 * 1000);

      return res.status(201).json({
        success: true,
        orderId: savedOrder.id,
        shiprocketSynced,
      });
    }

  } catch (error) {
    console.error("Order create failed:", error.message);
    res.status(500).json({ success: false, message: "Order creation failed" });
  }
});

// ─── Razorpay Webhook ───
router.post(
  "/razorpay-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (signature !== expectedSig) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = JSON.parse(req.body);

      if (event.event === "payment_link.paid") {
        const notes = event.payload.payment_link.entity.notes;
        const orderId = notes.orderId;
        const paymentId = event.payload.payment.entity.id;
        const amount = event.payload.payment.entity.amount / 100;

        // Firestore update
        await updateOrderShiprocketData(orderId, {
          paymentStatus: "paid",
          status: "Confirmed",
          paymentId,
          paidAt: new Date().toISOString(),
        });

        const order = await getOrderById(orderId);

        // Shiprocket sync
        try {
          await createShiprocketOrder(order);
        } catch (err) {
          console.error("Shiprocket sync failed:", err.message);
          await updateOrderShiprocketData(orderId, {
            shippingStatus: "SYNC_FAILED",
          });
        }

        // Customer confirm message
        try {
          await sendPaymentConfirmed(order, paymentId, amount);
        } catch (err) {
          console.error("WhatsApp confirm failed:", err.message);
        }

        // Owner alert
        try {
          await sendWhatsAppMessage(
            process.env.OWNER_WHATSAPP,
            `💰 *Payment Received!*\n\n` +
            `🆔 Order: ${orderId}\n` +
            `💵 Amount: ₹${amount}\n` +
            `👤 Customer: ${order.addressInfo.name}\n` +
            `📞 Phone: ${order.addressInfo.phoneNumber}\n\n` +
            `✅ Auto verified + Shiprocket synced!`
          );
        } catch (err) {
          console.error("Owner alert failed:", err.message);
        }
      }

      res.json({ success: true });

    } catch (err) {
      console.error("Webhook error:", err.message);
      res.status(500).json({ error: "Webhook failed" });
    }
  }
);

// ─── Shiprocket Sync ───
router.post("/:orderId/sync-shiprocket", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (order.shiprocketOrderId) {
      return res.status(200).json({ success: true, skipped: true, message: "Already synced" });
    }
    const shiprocket = await createShiprocketOrder(order);
    return res.status(200).json({ success: true, shiprocket });
  } catch (error) {
    console.error("Shiprocket sync failed:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Shiprocket sync failed" });
  }
});

// ─── Generate Label ───
router.post("/:orderId/generate-label", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.shiprocketShipmentId) {
      return res.status(400).json({ success: false, message: "No shipment ID" });
    }
    const label = await generateLabelForOrder({
      shipmentId: order.shiprocketShipmentId,
      localOrderId: order.id,
    });
    return res.status(200).json({ success: true, label });
  } catch (error) {
    console.error("Label failed:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Label generation failed" });
  }
});

// ─── Cancel Order ───
router.post("/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.shiprocketOrderId) {
      return res.status(400).json({ success: false, message: "Shiprocket order not found" });
    }
    const { shiprocketRequest } = require("../services/shiprocketClient");
    const cancelRes = await shiprocketRequest("POST", "/v1/external/orders/cancel", {
      ids: [order.shiprocketOrderId],
    });
    await updateOrderShiprocketData(orderId, {
      shippingStatus: "CANCELLED",
      status: "Cancelled",
      shiprocketRawCancel: cancelRes,
    });

    try {
      await sendWhatsAppMessage(
        order.addressInfo.phoneNumber,
        `❌ *Order Cancel Ho Gaya*\n\n` +
        `🆔 Order ID: ${orderId}\n\n` +
        `Koi sawaal ho to reply karein 😊\n` +
        `— Fastion Store`
      );
    } catch (err) {
      console.error("Cancel WhatsApp failed:", err.message);
    }

    return res.status(200).json({ success: true, cancel: cancelRes });
  } catch (error) {
    console.error("Cancel failed:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Cancel failed" });
  }
});

// ─── Return Order ───
router.post("/:orderId/return", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

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
        length: 10, breadth: 10, height: 10, weight: 0.5,
      }
    );

    await updateOrderShiprocketData(orderId, {
      returnShiprocketOrderId: returnRes.order_id || null,
      returnStatus: "RETURN_CREATED",
      shiprocketRawReturn: returnRes,
    });

    return res.status(200).json({ success: true, return: returnRes });
  } catch (error) {
    console.error("Return failed:", error.response?.data || error.message);
    return res.status(500).json({ success: false, message: "Return failed" });
  }
});

module.exports = router;