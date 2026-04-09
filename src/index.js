const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

// console.log("ENV EMAIL:", process.env.SHIPROCKET_EMAIL);
// console.log("ENV PASS:", process.env.SHIPROCKET_PASSWORD);

const app = require("./app");

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`Fastion backend listening on port ${port}`);
});