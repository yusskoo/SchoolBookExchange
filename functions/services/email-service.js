const nodemailer = require("nodemailer");
const config = require("../config/env");

// Lazy initialization or ensure config is loaded
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.gmail.user,
    pass: config.gmail.pass,
  },
});

exports.sendTransactionNotification = async (email, bookTitle, scoreChange) => {
  if (!email) return;
  const mailOptions = {
    from: `"校園二手書平台" <${config.gmail.user}>`,
    to: email,
    subject: "🎉 您的書籍已成交！",
    text: `恭喜！您的書籍「${bookTitle || "二手書"}」已完成交易。您的信用分數已增加 ${scoreChange} 分！`,
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log(`通知信已發送至: ${email}`);
  } catch (err) {
    console.error("發信失敗:", err);
  }
};
