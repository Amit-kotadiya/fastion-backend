"use strict";

var express = require("express");

var crypto = require("crypto");

var router = express.Router(); // Verify Razorpay Payment

router.post("/verify-payment", function (req, res) {
  try {
    var _req$body = req.body,
        razorpay_order_id = _req$body.razorpay_order_id,
        razorpay_payment_id = _req$body.razorpay_payment_id,
        razorpay_signature = _req$body.razorpay_signature; // Verify signature

    var body = razorpay_order_id + "|" + razorpay_payment_id;
    var expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({
        success: true,
        message: "Payment verified successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
module.exports = router;
//# sourceMappingURL=razorpay.dev.js.map
