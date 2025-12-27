const dotenv = require("dotenv");
// Load env vars
dotenv.config();

module.exports = {
  gmail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
};
