"use strict";

// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");
// const ordersRouter = require("./routes/orders");
// const shiprocketWebhookRouter = require("./routes/shiprocketWebhook");
// const paymentRoutes = require("./routes/payment");
// const app = express();
// const allowedOrigins = [
//   "http://localhost:3000",
//   "https://fastion-alpha.vercel.app"
// ];
// app.use("/api/payment", paymentRoutes);
// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   }
// }));
// app.use(express.json({ limit: "2mb" }));
// app.use(morgan("dev"));
// app.get("/health", (_req, res) => {
//   res.status(200).json({ success: true, service: "fastion-server" });
// });
// app.use("/api/orders", ordersRouter);
// app.use("/api/webhooks/shiprocket", shiprocketWebhookRouter);
// app.use((error, _req, res, _next) => {
//   // eslint-disable-next-line no-console
//   console.error("Unhandled error:", error);
//   res.status(500).json({ success: false, message: "Internal server error" });
// });
// module.exports = app;
var express = require("express");

var cors = require("cors");

var morgan = require("morgan");

var ordersRouter = require("./routes/orders");

var shiprocketWebhookRouter = require("./routes/shiprocketWebhook");

var paymentRoutes = require("./routes/payment");

var app = express();
var allowedOrigins = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000", "https://fastion-alpha.vercel.app"];
app.use(cors({
  origin: function origin(_origin, callback) {
    if (!_origin || allowedOrigins.includes(_origin)) {
      callback(null, true);
    } else {
      console.log("❌ CORS blocked origin:", _origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({
  limit: "2mb"
}));
app.use(morgan("dev"));
app.get("/health", function (_req, res) {
  res.status(200).json({
    success: true,
    service: "fastion-server"
  });
});
app.use("/api/orders", ordersRouter);
app.use("/api/payment", paymentRoutes);
app.use("/api/webhooks/shiprocket", shiprocketWebhookRouter);
app.use(function (error, _req, res, _next) {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});
module.exports = app;
//# sourceMappingURL=app.dev.js.map
