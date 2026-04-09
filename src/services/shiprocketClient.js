const axios = require("axios");

let cachedToken = null;
let tokenExpiry = 0;

function getBaseUrl() {
  const baseUrl = process.env.SHIPROCKET_BASE_URL;
  if (!baseUrl) {
    throw new Error("SHIPROCKET_BASE_URL is not configured");
  }
  return baseUrl.replace(/\/+$/, "");
}

async function getShiprocketToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new Error("Shiprocket credentials are not configured");
  }

  const url = `${getBaseUrl()}/v1/external/auth/login`;
  const { data } = await axios.post(url, { email, password });

  const token = data && data.token;
  if (!token) {
    throw new Error("Shiprocket auth failed: token missing in response");
  }

  cachedToken = token;
  tokenExpiry = now + 8 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

async function shiprocketRequest(method, urlPath, body = null) {
  const token = await getShiprocketToken();
  const url = `${getBaseUrl()}${urlPath}`;

  const { data } = await axios({
    method,
    url,
    data: body,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  return data;
}

module.exports = {
  shiprocketRequest,
};
