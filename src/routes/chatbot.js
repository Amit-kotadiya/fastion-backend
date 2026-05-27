
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const POLICIES = require("../policies");

const db = admin.firestore();

// COLLECTION NAMES
const COLLECTIONS = {
    products: "products",
    orders: "orders",
    blogs: "blogs",
    categories: "category",
};

async function fetchFirebaseContext() {
    const context = {};

    // Products
    try {
        const snap = await db.collection(COLLECTIONS.products).limit(100).get();
        context.products = [];
        snap.forEach(doc => {
            const p = doc.data();
            context.products.push({
                name: p.title || p.name || "",
                price: p.price || "",
                category: p.category || "",
                description: (p.description || "").substring(0, 100),
            });
        });
    } catch (e) { context.products = []; }

    // Categories
    try {
        const snap = await db.collection(COLLECTIONS.categories).get();
        context.categories = [];
        snap.forEach(doc => {
            const c = doc.data();
            context.categories.push(c.name || c.title || doc.id);
        });
    } catch (e) { context.categories = []; }

    return context;
}

// Full system prompt build
function buildSystemPrompt(firebaseCtx) {
    let prompt = `
Aap BlueDavis Men's Wear ke professional AI shopping assistant hain.
Neeche di gayi REAL website information se SIRF jawab do.

🏪 STORE INFO:
- Store: BlueDavis Men's Wear
- Location: Amazing Star, Surat, Gujarat
- Timing: Mon–Sat 10AM–8PM
- Phone: +91-9429222441
- Website: fastion-alpha.vercel.app

💳 PAYMENT METHODS:
- UPI (GPay, PhonePe, Paytm)
- Credit / Debit Card
- Net Banking
- Cash on Delivery (COD) available NAHI hai
`;

    // Firebase categories
    if (firebaseCtx.categories?.length > 0) {
        prompt += `\n🗂️ CATEGORIES:\n`;
        firebaseCtx.categories.forEach(c => { prompt += `- ${c}\n`; });
    }

    // Firebase products
    if (firebaseCtx.products?.length > 0) {
        prompt += `\n🛍️ PRODUCTS (${firebaseCtx.products.length} items):\n`;
        firebaseCtx.products.forEach(p => {
            prompt += `- ${p.name}`;
            if (p.price) prompt += ` | ₹${p.price}`;
            if (p.category) prompt += ` | ${p.category}`;
            if (p.description) prompt += ` | ${p.description}`;
            prompt += `\n`;
        });
    }

    // Policies from file
    prompt += `\n📋 WEBSITE POLICIES:\n${POLICIES}\n`;

    prompt += `
⚠️ STRICT RULES:
- SIRF upar di gayi information se jawab do
- Kuch nahi pata toh: "Iske liye +91-9429222441 pe contact karein" kaho
- Made-up ya galat information bilkul mat do
- Hinglish mein baat karo
- 2-3 sentences mein concise answer do
`;

    return prompt;
}

router.post("/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        const firebaseCtx = await fetchFirebaseContext();
        const systemPrompt = buildSystemPrompt(firebaseCtx);

        const contents = [
            {
                role: "user",
                parts: [{ text: systemPrompt }]
            },
            {
                role: "model",
                parts: [{ text: "Samajh gaya! Main BlueDavis ki real information se accurate jawab dunga." }]
            }
        ];

        messages.forEach(msg => {
            contents.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            });
        });

        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
        });

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            res.json({
                content: [{ text: data.candidates[0].content.parts[0].text }]
            });
        } else {
            console.error("Gemini error:", JSON.stringify(data, null, 2));
            res.status(500).json({ error: "No response from Gemini" });
        }

    } catch (error) {
        console.error("Chatbot error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;