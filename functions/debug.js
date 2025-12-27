const functions = require("firebase-functions");
console.log("Functions SDK keys:", Object.keys(functions));
console.log("functions.auth:", functions.auth);
if (functions.auth) {
  console.log("functions.auth.user:", functions.auth.user);
}
console.log("functions.https:", functions.https);
