/**
 * ============================================
 * 行事曆模組 (Calendar Handler)
 * ============================================
 *
 * 主要功能:
 * 1. 從 Google Calendar 公開行事曆抓取考試資訊
 * 2. 解析 ICS 格式並篩選考試事件
 * 3. 計算考試倒數天數
 * 4. 提供降級機制（Fallback）
 *
 * 資料來源: 正心高中公開行事曆
 */

// TODO: 實作行事曆快取機制（減少 API 呼叫）
// TODO: 支援多校行事曆（可配置）
// TODO: 加入更多事件類型（段考、模擬考等）
// TODO: 實作行事曆訂閱功能

const functions = require("firebase-functions");
const https = require("https");

// ============================================
// 取得考試倒數資訊 (Callable Function)
// ============================================
/**
 * Pseudocode:
 * 1. 從 Google Calendar 下載 ICS 檔案（使用 HTTPS）
 * 2. 設定 10 秒逾時保護
 * 3. 成功：解析 ICS 並篩選考試事件
 * 4. 失敗：使用預設的降級資料（Fallback）
 * 5. 回傳最近 5 場考試的倒數資訊
 *
 * 錯誤處理:
 * - 網路錯誤 → 使用 Fallback
 * - 解析錯誤 → 使用 Fallback
 * - 逾時 → 使用 Fallback
 *
 * TODO: 實作重試機制（失敗時自動重試 1-2 次）
 * TODO: 記錄失敗原因供後續分析
 */
exports.getExamCountdown = functions.https.onCall((data, context) => {
  return new Promise((resolve, reject) => {
    // Google Calendar 公開行事曆的 ICS 連結
    const calendarUrl = "https://calendar.google.com/calendar/ical/shsh.ylc.edu.tw_fcpdcjkto9mpulh1gg2eetr4s4%40group.calendar.google.com/public/basic.ics";

    const log = (msg) => {
      console.log(msg);
    };

    log(`Starting download via https: ${calendarUrl}`);

    // 設定 10 秒逾時
    const TIMEOUT_MS = 10000;
    let isHandled = false; // 防止重複處理（逾時和錯誤可能同時觸發）

    // ========================================
    // Pseudocode: 使用 HTTPS 下載 ICS 檔案
    // ========================================
    const request = https.get(calendarUrl, (res) => {
      if (isHandled) return;
      let icsData = "";

      // 接收資料片段
      res.on("data", (chunk) => {
        icsData += chunk;
      });

      // 下載完成
      res.on("end", () => {
        if (isHandled) return;
        isHandled = true;
        log(`Download complete. Size: ${icsData.length} bytes.`);

        try {
          // 解析 ICS 並篩選考試
          const result = processEvents(icsData, log);
          resolve(result);
        } catch (err) {
          // 解析失敗，使用降級資料
          log(`Processing error: ${err.message}. Using fallback.`);
          resolve(getFallbackExams());
        }
      });
    }).on("error", (err) => {
      // 網路錯誤處理
      if (isHandled) return;
      isHandled = true;
      log(`HTTPS Error: ${err.message}. Using fallback.`);
      resolve(getFallbackExams());
    });

    // ========================================
    // Pseudocode: 逾時保護機制
    // ========================================
    setTimeout(() => {
      if (isHandled) return;
      isHandled = true;
      request.destroy(); // 中斷連線
      log(`Request timed out after ${TIMEOUT_MS}ms. Using fallback.`);
      resolve(getFallbackExams());
    }, TIMEOUT_MS);
  });
});

// ============================================
// 降級資料（Fallback）
// ============================================
/**
 * Pseudocode:
 * - 當無法從 Google Calendar 取得資料時使用
 * - 提供預先驗證的考試日期資料
 * - 計算每場考試的剩餘天數
 *
 * TODO: 將 Fallback 資料移至 Firestore（方便動態更新）
 * TODO: 定期檢查 Fallback 資料是否過期
 */
function getFallbackExams() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 預先驗證的考試資料
  const mockExams = [
    {title: "高三第三次定期評量", date: "20260108", displayDate: "01/08-01/09"},
    {title: "第三次定期評量", date: "20260116", displayDate: "01/16-01/19"},
    {title: "學科能力測驗", date: "20260117", displayDate: "01/17-01/19"},
    {title: "第三次定期評量", date: "20260119", displayDate: "01/16-01/19"},
  ];

  // Pseudocode: 計算每場考試的剩餘天數
  const upcoming = mockExams.map((exam) => {
    // 手動解析 YYYYMMDD 格式
    const y = parseInt(exam.date.substring(0, 4));
    const m = parseInt(exam.date.substring(4, 6)) - 1; // 月份從 0 開始
    const d = parseInt(exam.date.substring(6, 8));
    const examDate = new Date(y, m, d);

    const diffTime = examDate - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      title: exam.title,
      date: exam.date,
      daysLeft: Math.max(0, daysLeft), // 確保不會是負數
      displayDate: exam.displayDate || `${(m + 1).toString().padStart(2, "0")}/${d.toString().padStart(2, "0")}`,
    };
  }).sort((a, b) => a.daysLeft - b.daysLeft); // 按剩餘天數排序（最近的在前）

  return {exams: upcoming};
}

// ============================================
// 處理 ICS 事件資料
// ============================================
/**
 * Pseudocode:
 * 1. 解析 ICS 檔案為事件陣列
 * 2. 篩選包含考試關鍵字的未來事件
 * 3. 按日期排序並取前 5 場
 * 4. 計算每場考試的剩餘天數和顯示格式
 *
 * 關鍵字: 段考、學測、會考、模擬考、評量、學科能力測驗
 *
 * TODO: 使關鍵字可配置（不同學校可能用詞不同）
 * TODO: 加入事件類型分類（段考、模擬考等）
 */
function processEvents(icsData, log) {
  const events = parseICS(icsData);
  const targetKeywords = ["段考", "學測", "會考", "模擬考", "評量", "學科能力測驗"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  log(`Parsed ${events.length} events. Today: ${today.toISOString()}`);

  // ========================================
  // Pseudocode: 篩選未來且符合關鍵字的考試
  // ========================================
  const futureExams = events.filter((event) => {
    if (!event.dtstart) return false;
    const eventDate = parseICSDate(event.dtstart);

    if (eventDate < today) return false; // 過去的活動跳過

    // 檢查是否包含考試關鍵字
    const hasKeyword = targetKeywords.some((keyword) => event.summary && event.summary.includes(keyword));
    if (hasKeyword) {
      log(`Match found: ${event.summary} on ${event.dtstart}`);
    }
    return hasKeyword;
  }).sort((a, b) => {
    // 按日期排序（最近的在前）
    return parseICSDate(a.dtstart) - parseICSDate(b.dtstart);
  });

  log(`Found ${futureExams.length} future exams.`);

  if (futureExams.length === 0) {
    log("[Calendar] No future exams found matching keywords:", targetKeywords);
    return {exams: []};
  }

  // ========================================
  // Pseudocode: 處理前 5 場考試
  // ========================================
  const upcoming = futureExams.slice(0, 5).map((exam) => {
    const examDate = parseICSDate(exam.dtstart);
    const diffTime = examDate - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 確保日期格式一致（8 位數字）
    const cleanDate = (exam.dtstart || "").substring(0, 8);

    // ========================================
    // Pseudocode: 計算顯示日期（處理多日事件）
    // ========================================
    let displayDate = formatSimpleDate(examDate);
    if (exam.dtend) {
      const endDate = parseICSDate(exam.dtend);
      const durationMs = endDate - examDate;
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (durationMs > oneDayMs) {
        // 多日事件：顯示為 MM/DD~MM/DD
        // 注意 DTEND 是不包含的（exclusive），所以要減去一天
        const inclusiveEndDate = new Date(endDate.getTime() - oneDayMs);
        displayDate = `${formatSimpleDate(examDate)}~${formatSimpleDate(inclusiveEndDate)}`;
      }
    }

    return {
      title: exam.summary,
      date: cleanDate,
      displayDate: displayDate,
      daysLeft: daysLeft,
    };
  });

  return {exams: upcoming};
}

// ========================================
// 輔助函式：格式化日期為 MM/DD
// ========================================
function formatSimpleDate(date) {
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${m}/${d}`;
}

// ============================================
// 簡易 ICS 解析器
// ============================================
/**
 * Pseudocode:
 * 1. 將 ICS 檔案按行分割
 * 2. 尋找 BEGIN:VEVENT 和 END:VEVENT 標記
 * 3. 提取 SUMMARY（標題）、DTSTART（開始日期）、DTEND（結束日期）
 * 4. 回傳事件陣列
 *
 * 限制: 僅支援基本的 ICS 格式，不處理複雜的重複事件
 *
 * TODO: 使用完整的 ICS 解析函式庫（如 ical.js）
 * TODO: 支援重複事件（RRULE）
 */
function parseICS(icsData) {
  const events = [];
  const lines = icsData.split(/\r\n|\n|\r/);
  let currentEvent = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      currentEvent = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (currentEvent) events.push(currentEvent);
      currentEvent = null;
    } else if (currentEvent) {
      // 提取事件欄位
      if (line.startsWith("SUMMARY:")) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith("DTSTART")) {
        const parts = line.split(":");
        currentEvent.dtstart = parts[1];
      } else if (line.startsWith("DTEND")) {
        const parts = line.split(":");
        currentEvent.dtend = parts[1];
      }
    }
  }
  return events;
}

// ========================================
// 輔助函式：解析 ICS 日期格式
// ========================================
/**
 * Pseudocode:
 * - ICS 日期格式為 YYYYMMDD 或 YYYYMMDDTHHmmssZ
 * - 提取年月日並建立 Date 物件
 *
 * @param {string} icsDateString - ICS 日期字串（如 "20260108"）
 * @return {Date} JavaScript Date 物件
 */
function parseICSDate(icsDateString) {
  if (!icsDateString) return new Date();
  const year = parseInt(icsDateString.substring(0, 4));
  const month = parseInt(icsDateString.substring(4, 6)) - 1; // 月份從 0 開始
  const day = parseInt(icsDateString.substring(6, 8));
  return new Date(year, month, day);
}
