const express = require("express");

const { updateOrderByShipmentStatus } = require("../services/firebaseService");
const { mapShiprocketStatus } = require("../utils/statusMapper");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (expectedSecret) {
      const incomingSecret = req.headers["x-webhook-secret"];
      if (incomingSecret !== expectedSecret) {
        return res.status(401).json({ success: false, message: "Unauthorized webhook" });
      }
    }

    const payload = req.body || {};
    const shipmentId = payload.shipment_id || payload.shipmentId;
    const currentStatus = payload.current_status || payload.status;
    if (!shipmentId) {
      return res.status(400).json({ success: false, message: "shipment_id is required" });
    }

    const shippingStatus = mapShiprocketStatus(currentStatus);
    const updated = await updateOrderByShipmentStatus(String(shipmentId), {
      shippingStatus,
      shiprocketStatus: currentStatus || null,
      shippingRaw: payload,
    });

    return res.status(200).json({ success: true, updated });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Webhook error:", error.message);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;
