const dotenv = require("dotenv");
// Load env vars from .env file (for local development)
dotenv.config();

/**
 * ============================================
 * 環境變數與金鑰配置 (Config Handler)
 * ============================================
 * 
 * 用途：
 * 集中管理所有敏感資訊（Secrets）和環境變數。
 * 
 * 安全性注意：
 * 1. 絕不在此檔案中硬編碼 (Hardcode) 任何金鑰！
 * 2. 開發環境請使用 .env 檔案
 * 3. 生產環境請使用 Firebase Secrets 或 Cloud Secret Manager
 */
module.exports = {
  gmail: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  line: {
    // 優先從環境變數讀取，不再支援硬編碼
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  },
};
