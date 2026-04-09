const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const ordersRouter = require("./routes/orders");
const shiprocketWebhookRouter = require("./routes/shiprocketWebhook");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, service: "fastion-server" });
});

app.use("/api/orders", ordersRouter);
app.use("/api/webhooks/shiprocket", shiprocketWebhookRouter);

app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", error);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;
