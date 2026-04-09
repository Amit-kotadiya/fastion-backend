const express = require("express");

const { createShiprocketOrder, generateLabelForOrder } = require("../services/shiprocketService");
const {
  saveOrderToFirestore,
  getOrderById,
  updateOrderShiprocketData,
} = require("../services/firebaseService");

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const order = req.body;
    const savedOrder = await saveOrderToFirestore(order);

    let shiprocketResult = null;
    let shiprocketErrorPayload = null;
    try {
      shiprocketResult = await createShiprocketOrder(savedOrder);
    } catch (shiprocketError) {
      shiprocketErrorPayload = shiprocketError.response
        ? shiprocketError.response.data
        : shiprocketError.message;

      // eslint-disable-next-line no-console
      console.error("Shiprocket create order failed:", shiprocketErrorPayload);

      await updateOrderShiprocketData(savedOrder.id, {
        shippingStatus: "SYNC_FAILED",
        shiprocketError: shiprocketErrorPayload,
      });
    }

    res.status(201).json({
      success: true,
      orderId: savedOrder.id,
      shiprocketSynced: Boolean(shiprocketResult),
      shiprocket: shiprocketResult,
      shiprocketError: shiprocketErrorPayload,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.error(
      "Label generation failed:",
      error.response ? error.response.data : error.message
    );
    return res.status(500).json({ success: false, message: "Label generation failed" });
  }
});

module.exports = router;
