"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var fs = require("fs");

var path = require("path");

var admin = require("firebase-admin");

var collectionName = process.env.ORDERS_COLLECTION || "order";

function getCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  var defaultPath = path.join(__dirname, "../../firebase-key.json");
  var filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) : defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error("Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, " + "or add a service account file at ".concat(defaultPath, "."));
  }

  var raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

if (!admin.apps.length) {
  var serviceAccount = getCredentials();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

var db = admin.firestore();

function saveOrderToFirestore(order) {
  var ref, data;
  return regeneratorRuntime.async(function saveOrderToFirestore$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          ref = db.collection(collectionName).doc();
          data = _objectSpread({}, order, {
            id: ref.id,
            shippingStatus: order.shippingStatus || "PENDING",
            createdAt: new Date().toISOString()
          });
          _context.next = 4;
          return regeneratorRuntime.awrap(ref.set(data));

        case 4:
          return _context.abrupt("return", data);

        case 5:
        case "end":
          return _context.stop();
      }
    }
  });
}

function getOrderById(orderId) {
  var doc;
  return regeneratorRuntime.async(function getOrderById$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.next = 2;
          return regeneratorRuntime.awrap(db.collection(collectionName).doc(orderId).get());

        case 2:
          doc = _context2.sent;

          if (doc.exists) {
            _context2.next = 5;
            break;
          }

          return _context2.abrupt("return", null);

        case 5:
          return _context2.abrupt("return", _objectSpread({
            id: doc.id
          }, doc.data()));

        case 6:
        case "end":
          return _context2.stop();
      }
    }
  });
}

function updateOrderShiprocketData(orderId, updates) {
  return regeneratorRuntime.async(function updateOrderShiprocketData$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(db.collection(collectionName).doc(orderId).update(_objectSpread({}, updates, {
            updatedAt: new Date().toISOString()
          })));

        case 2:
        case "end":
          return _context3.stop();
      }
    }
  });
}

function updateOrderByShipmentStatus(shipmentId, updates) {
  var snap, doc;
  return regeneratorRuntime.async(function updateOrderByShipmentStatus$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(db.collection(collectionName).where("shiprocketShipmentId", "==", shipmentId).limit(1).get());

        case 2:
          snap = _context4.sent;

          if (!snap.empty) {
            _context4.next = 5;
            break;
          }

          return _context4.abrupt("return", false);

        case 5:
          doc = snap.docs[0];
          _context4.next = 8;
          return regeneratorRuntime.awrap(doc.ref.update(_objectSpread({}, updates, {
            updatedAt: new Date().toISOString()
          })));

        case 8:
          return _context4.abrupt("return", true);

        case 9:
        case "end":
          return _context4.stop();
      }
    }
  });
}

module.exports = {
  saveOrderToFirestore: saveOrderToFirestore,
  getOrderById: getOrderById,
  updateOrderShiprocketData: updateOrderShiprocketData,
  updateOrderByShipmentStatus: updateOrderByShipmentStatus
};
//# sourceMappingURL=firebaseService.dev.js.map
