"use strict";

var path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
}); // console.log("ENV EMAIL:", process.env.SHIPROCKET_EMAIL);
// console.log("ENV PASS:", process.env.SHIPROCKET_PASSWORD);


var app = require("./app");

var port = Number(process.env.PORT || 5000);
app.listen(port, function () {
  console.log("Fastion backend listening on port ".concat(port));
});
//# sourceMappingURL=index.dev.js.map
