// const express = require("express");

// const { updateOrderByShipmentStatus } = require("../services/firebaseService");
// const { mapShiprocketStatus } = require("../utils/statusMapper");

// const router = express.Router();

// router.post("/", async (req, res) => {
//   try {
//     const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
//     if (expectedSecret) {
//       const incomingSecret = req.headers["x-webhook-secret"];
//       if (incomingSecret !== expectedSecret) {
//         return res.status(401).json({ success: false, message: "Unauthorized webhook" });
//       }
//     }

//     const payload = req.body || {};
//     const shipmentId = payload.shipment_id || payload.shipmentId;
//     const currentStatus = payload.current_status || payload.status;
//     if (!shipmentId) {
//       console.log("⚠️ Test webhook received — no shipment_id");
//       return res.status(200).json({ success: true, message: "Test webhook received" });
//     }

//     // const shippingStatus = mapShiprocketStatus(currentStatus);
//     // const updated = await updateOrderByShipmentStatus(String(shipmentId), {
//     //   shippingStatus,
//     //   shiprocketStatus: currentStatus || null,
//     //   shippingRaw: payload,
//     // });
//     const shippingStatus = mapShiprocketStatus(currentStatus);

//     const extraUpdates = {};
//     if (currentStatus === "Delivered" || shippingStatus === "DELIVERED") {
//       extraUpdates.status = "Delivered";
//       extraUpdates.deliveredAt = new Date().toISOString();
//     }

//     const updated = await updateOrderByShipmentStatus(String(shipmentId), {
//       shippingStatus,
//       shiprocketStatus: currentStatus || null,
//       shippingRaw: payload,
//       ...extraUpdates,
//     });
//     return res.status(200).json({ success: true, updated });
//   } catch (error) {
//     // eslint-disable-next-line no-console
//     console.error("Webhook error:", error.message);
//     return res.status(500).json({ success: false });
//   }
// });

// module.exports = router;
const express = require("express");
const {
  updateOrderByShipmentStatus,
  getOrderByShipmentId,
} = require("../services/firebaseService");
const { mapShiprocketStatus } = require("../utils/statusMapper");
const { sendShippingStatus } = require("../services/whatsappService");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret = req.headers["x-webhook-secret"];
      if (incomingSecret !== expectedSecret) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    const payload = req.body || {};
    const shipmentId = payload.shipment_id || payload.shipmentId;
    const currentStatus = payload.current_status || payload.status;

    if (!shipmentId) {
      console.log("⚠️ Test webhook — no shipment_id");
      return res.status(200).json({ success: true, message: "Test webhook received" });
    }

    const shippingStatus = mapShiprocketStatus(currentStatus);
    const extraUpdates = {};

    if (currentStatus === "Delivered" || shippingStatus === "DELIVERED") {
      extraUpdates.status = "Delivered";
      extraUpdates.deliveredAt = new Date().toISOString();
    }

    const updated = await updateOrderByShipmentStatus(String(shipmentId), {
      shippingStatus,
      shiprocketStatus: currentStatus || null,
      shippingRaw: payload,
      ...extraUpdates,
    });

    // ✅ WhatsApp status message
    try {
      const order = await getOrderByShipmentId(String(shipmentId));
      if (order?.addressInfo?.phoneNumber) {
        await sendShippingStatus(order, currentStatus, shippingStatus);
      }
    } catch (waError) {
      console.error("WhatsApp status failed:", waError.message);
    }

    return res.status(200).json({ success: true, updated });

  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;