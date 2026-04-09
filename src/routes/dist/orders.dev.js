"use strict";

var express = require("express");

var _require = require("../services/shiprocketService"),
    createShiprocketOrder = _require.createShiprocketOrder,
    generateLabelForOrder = _require.generateLabelForOrder;

var _require2 = require("../services/firebaseService"),
    saveOrderToFirestore = _require2.saveOrderToFirestore,
    getOrderById = _require2.getOrderById,
    updateOrderShiprocketData = _require2.updateOrderShiprocketData;

var router = express.Router();
router.post("/create", function _callee(req, res) {
  var order, savedOrder, shiprocketResult, shiprocketErrorPayload;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          order = req.body;
          _context.next = 4;
          return regeneratorRuntime.awrap(saveOrderToFirestore(order));

        case 4:
          savedOrder = _context.sent;
          shiprocketResult = null;
          shiprocketErrorPayload = null;
          _context.prev = 7;
          _context.next = 10;
          return regeneratorRuntime.awrap(createShiprocketOrder(savedOrder));

        case 10:
          shiprocketResult = _context.sent;
          _context.next = 19;
          break;

        case 13:
          _context.prev = 13;
          _context.t0 = _context["catch"](7);
          shiprocketErrorPayload = _context.t0.response ? _context.t0.response.data : _context.t0.message; // eslint-disable-next-line no-console

          console.error("Shiprocket create order failed:", shiprocketErrorPayload);
          _context.next = 19;
          return regeneratorRuntime.awrap(updateOrderShiprocketData(savedOrder.id, {
            shippingStatus: "SYNC_FAILED",
            shiprocketError: shiprocketErrorPayload
          }));

        case 19:
          res.status(201).json({
            success: true,
            orderId: savedOrder.id,
            shiprocketSynced: Boolean(shiprocketResult),
            shiprocket: shiprocketResult,
            shiprocketError: shiprocketErrorPayload
          });
          _context.next = 26;
          break;

        case 22:
          _context.prev = 22;
          _context.t1 = _context["catch"](0);
          // eslint-disable-next-line no-console
          console.error("Order create failed:", _context.t1.response ? _context.t1.response.data : _context.t1.message);
          res.status(500).json({
            success: false,
            message: "Order creation failed"
          });

        case 26:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 22], [7, 13]]);
});
router.post("/:orderId/sync-shiprocket", function _callee2(req, res) {
  var orderId, order, shiprocket;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          orderId = req.params.orderId;
          _context2.next = 4;
          return regeneratorRuntime.awrap(getOrderById(orderId));

        case 4:
          order = _context2.sent;

          if (order) {
            _context2.next = 7;
            break;
          }

          return _context2.abrupt("return", res.status(404).json({
            success: false,
            message: "Order not found"
          }));

        case 7:
          if (!order.shiprocketOrderId) {
            _context2.next = 9;
            break;
          }

          return _context2.abrupt("return", res.status(200).json({
            success: true,
            skipped: true,
            message: "Order is already synced"
          }));

        case 9:
          _context2.next = 11;
          return regeneratorRuntime.awrap(createShiprocketOrder(order));

        case 11:
          shiprocket = _context2.sent;
          return _context2.abrupt("return", res.status(200).json({
            success: true,
            shiprocket: shiprocket
          }));

        case 15:
          _context2.prev = 15;
          _context2.t0 = _context2["catch"](0);
          // eslint-disable-next-line no-console
          console.error("Shiprocket sync failed:", _context2.t0.response ? _context2.t0.response.data : _context2.t0.message);
          return _context2.abrupt("return", res.status(500).json({
            success: false,
            message: "Shiprocket sync failed"
          }));

        case 19:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 15]]);
});
router.post("/:orderId/generate-label", function _callee3(req, res) {
  var orderId, order, label;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          orderId = req.params.orderId;
          _context3.next = 4;
          return regeneratorRuntime.awrap(getOrderById(orderId));

        case 4:
          order = _context3.sent;

          if (order) {
            _context3.next = 7;
            break;
          }

          return _context3.abrupt("return", res.status(404).json({
            success: false,
            message: "Order not found"
          }));

        case 7:
          if (order.shiprocketShipmentId) {
            _context3.next = 9;
            break;
          }

          return _context3.abrupt("return", res.status(400).json({
            success: false,
            message: "Cannot generate label without shiprocketShipmentId"
          }));

        case 9:
          _context3.next = 11;
          return regeneratorRuntime.awrap(generateLabelForOrder({
            shipmentId: order.shiprocketShipmentId,
            localOrderId: order.id
          }));

        case 11:
          label = _context3.sent;
          return _context3.abrupt("return", res.status(200).json({
            success: true,
            label: label
          }));

        case 15:
          _context3.prev = 15;
          _context3.t0 = _context3["catch"](0);
          // eslint-disable-next-line no-console
          console.error("Label generation failed:", _context3.t0.response ? _context3.t0.response.data : _context3.t0.message);
          return _context3.abrupt("return", res.status(500).json({
            success: false,
            message: "Label generation failed"
          }));

        case 19:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 15]]);
});
module.exports = router;
//# sourceMappingURL=orders.dev.js.map
