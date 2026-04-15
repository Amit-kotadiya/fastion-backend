const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const razorpay = require("../services/razorpayService");
const admin = require("firebase-admin");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");

const calculateTotal = (cartItems) => {
    return cartItems.reduce((sum, item) => {
        let price = Number(String(item.price).replace(/[^0-9.]/g, "")) || 0;
        let discount = Number(String(item.discountPrice).replace(/[^0-9.]/g, "")) || 0;
        if (discount > price) [price, discount] = [discount, price];
        let base = discount > 0 && discount < price ? discount : price;

        const pantSize = Number(item.selectedSizes?.pant);
        if (pantSize >= 36) base += 50;
        const shirtSize = item.selectedSizes?.shirt?.toUpperCase();
        if (shirtSize === "XXL" || shirtSize === "2XL") base += 50;

        return sum + base;
    }, 0);
};

router.post("/create-order", async (req, res) => {
    try {
        console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

        const { cartItems, userId } = req.body;



        console.log("🛒 cartItems:", cartItems);
        console.log("👤 userId:", userId);

        const subtotal = calculateTotal(cartItems);
        console.log("💰 subtotal:", subtotal);

        const shipping = 80;
        const amount = subtotal + shipping;

        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: { userId, source: "fastion_web" },
        };

        const order = await razorpay.orders.create(options);

        await db.collection("orders").doc(order.id).set({
            razorpayOrderId: order.id,
            userId,
            amount,
            status: "pending",
            createdAt: Timestamp.now(),
        });

        return res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("❌ create-order error:", err);
        return res.status(500).json({ error: "Failed to create order" });
    }
});

router.post("/verify", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment fields" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expected !== razorpay_signature) {
            await db.collection("orders").doc(razorpay_order_id).update({
                status: "failed",
                failureReason: "Signature mismatch",
            });
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        await db.collection("orders").doc(razorpay_order_id).update({
            status: "paid",
            paymentId: razorpay_payment_id,
            paidAt: Timestamp.now(),
        });

        return res.status(200).json({ success: true, paymentId: razorpay_payment_id });
    } catch (err) {
        console.error("❌ verify error:", err);
        return res.status(500).json({ error: "Verification failed" });
    }
});

module.exports = router;