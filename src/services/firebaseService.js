const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const collectionName = process.env.ORDERS_COLLECTION || "order";

function getCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const defaultPath = path.join(__dirname, "../../firebase-key.json");
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : defaultPath;

  if (!fs.existsSync(filePath)) {
    throw new Error(
      "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, " +
      `or add a service account file at ${defaultPath}.`
    );
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

if (!admin.apps.length) {
  const serviceAccount = getCredentials();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function saveOrderToFirestore(order) {
  const ref = db.collection(collectionName).doc();
  const data = {
    ...order,
    id: ref.id,
    shippingStatus: order.shippingStatus || "PENDING",
    createdAt: new Date().toISOString(),
  };
  await ref.set(data);
  return data;
}

async function getOrderById(orderId) {
  const doc = await db.collection(collectionName).doc(orderId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

async function updateOrderShiprocketData(orderId, updates) {
  await db.collection(collectionName).doc(orderId).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}


async function updateOrderByShipmentStatus(shipmentId, updates) {
  const collRef = db.collection(collectionName);

  let snap = await collRef
    .where("shiprocketShipmentId", "==", String(shipmentId))
    .limit(1)
    .get();

  if (snap.empty && !Number.isNaN(Number(shipmentId))) {
    snap = await collRef
      .where("shiprocketShipmentId", "==", Number(shipmentId))
      .limit(1)
      .get();
  }

  if (snap.empty) {
    console.warn("⚠️ updateOrderByShipmentStatus: no order matched shipmentId =", shipmentId);
    return false;
  }

  const doc = snap.docs[0];
  await doc.ref.update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  console.log("✅ updateOrderByShipmentStatus: updated order", doc.id, "for shipmentId", shipmentId);
  return true;
}

module.exports = {
  saveOrderToFirestore,
  getOrderById,
  updateOrderShiprocketData,
  updateOrderByShipmentStatus,
};