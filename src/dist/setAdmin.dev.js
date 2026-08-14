"use strict";

// Backend/src/setAdmin.js
require("./services/firebaseService"); // isse admin app already initialize ho jayega


var admin = require("firebase-admin");

function setAdmin() {
  var email, user;
  return regeneratorRuntime.async(function setAdmin$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          email = "kotadiyabalu475@gmail.com";
          _context.prev = 1;
          _context.next = 4;
          return regeneratorRuntime.awrap(admin.auth().getUserByEmail(email));

        case 4:
          user = _context.sent;
          _context.next = 7;
          return regeneratorRuntime.awrap(admin.auth().setCustomUserClaims(user.uid, {
            admin: true
          }));

        case 7:
          console.log("\u2705 Admin claim set for ".concat(email, " (uid: ").concat(user.uid, ")"));
          _context.next = 13;
          break;

        case 10:
          _context.prev = 10;
          _context.t0 = _context["catch"](1);
          console.error("❌ Error:", _context.t0.message);

        case 13:
          process.exit(0);

        case 14:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[1, 10]]);
}

setAdmin();
//# sourceMappingURL=setAdmin.dev.js.map
