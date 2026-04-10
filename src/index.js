const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});


const app = require("./app");

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`Fastion backend listening on port ${port}`);
});