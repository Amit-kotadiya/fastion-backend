"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var express = require("express");

var _require = require("../services/firebaseService"),
    updateOrderByShipmentStatus = _require.updateOrderByShipmentStatus;

var _require2 = require("../utils/statusMapper"),
    mapShiprocketStatus = _require2.mapShiprocketStatus;

var router = express.Router();
router.post("/", function _callee(req, res) {
  var expectedSecret, incomingSecret, payload, shipmentId, currentStatus, shippingStatus, extraUpdates, updated;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          expectedSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

          if (!expectedSecret) {
            _context.next = 6;
            break;
          }

          incomingSecret = req.headers["x-api-key"];

          if (!(incomingSecret !== expectedSecret)) {
            _context.next = 6;
            break;
          }

          return _context.abrupt("return", res.status(401).json({
            success: false,
            message: "Unauthorized webhook"
          }));

        case 6:
          payload = req.body || {};
          shipmentId = payload.shipment_id || payload.shipmentId;
          currentStatus = payload.current_status || payload.status;

          if (shipmentId) {
            _context.next = 12;
            break;
          }

          console.log("⚠️ Test webhook received — no shipment_id");
          return _context.abrupt("return", res.status(200).json({
            success: true,
            message: "Test webhook received"
          }));

        case 12:
          // const shippingStatus = mapShiprocketStatus(currentStatus);
          // const updated = await updateOrderByShipmentStatus(String(shipmentId), {
          //   shippingStatus,
          //   shiprocketStatus: currentStatus || null,
          //   shippingRaw: payload,
          // });
          shippingStatus = mapShiprocketStatus(currentStatus);
          extraUpdates = {};

          if (currentStatus === "Delivered" || shippingStatus === "DELIVERED") {
            extraUpdates.status = "Delivered";
            extraUpdates.deliveredAt = new Date().toISOString();
          }

          _context.next = 17;
          return regeneratorRuntime.awrap(updateOrderByShipmentStatus(String(shipmentId), _objectSpread({
            shippingStatus: shippingStatus,
            shiprocketStatus: currentStatus || null,
            shippingRaw: payload
          }, extraUpdates)));

        case 17:
          updated = _context.sent;
          return _context.abrupt("return", res.status(200).json({
            success: true,
            updated: updated
          }));

        case 21:
          _context.prev = 21;
          _context.t0 = _context["catch"](0);
          // eslint-disable-next-line no-console
          console.error("Webhook error:", _context.t0.message);
          return _context.abrupt("return", res.status(500).json({
            success: false
          }));

        case 25:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 21]]);
});
module.exports = router;
//# sourceMappingURL=shiprocketWebhook.dev.js.map
