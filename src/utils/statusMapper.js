function mapShiprocketStatus(srStatus) {
  const s = String(srStatus || "").toLowerCase();
  if (s.includes("delivered")) return "DELIVERED";
  if (s.includes("out for delivery")) return "OUT_FOR_DELIVERY";
  if (s.includes("in transit")) return "IN_TRANSIT";
  if (s.includes("pickup")) return "PICKUP_SCHEDULED";
  if (s.includes("cancel")) return "CANCELLED";
  return "PROCESSING";
}

module.exports = {
  mapShiprocketStatus,
};
