# **程式碼開發說明 (Code.md)**

## **1\. 目錄結構 (Directory Structure)**

說明專案資料夾的組織方式，方便開發者快速定位程式碼。

/src  
  /assets         \# 靜態資源（圖片、字體等）  
  /components     \# 共用組件  
  /hooks          \# 自定義 React Hooks / 組合式邏輯  
  /services       \# API 請求與第三方服務  
  /store          \# 狀態管理 (Redux, Pinia, etc.)  
  /utils          \# 工具函數  
  /views          \# 頁面組件  
/tests            \# 測試檔案  
/docs             \# 技術文件

## **2\. 命名規範 (Naming Conventions)**

### **2.1 檔案與資料夾**

* **組件資料夾**：使用 PascalCase（例如：UserProfile/）。  
* **一般檔案**：使用 kebab-case（例如：user-service.js）。  
* **測試檔案**：\*.test.js 或 \*.spec.js。

### **2.2 程式碼變數**

* **變數與函式**：使用 camelCase（例如：getUserData）。  
* **常數**：使用全大寫與底線（例如：MAX\_RETRY\_COUNT）。  
* **類別/介面**：使用 PascalCase（例如：UserEntity）。

## **3\. 開發流程 (Development Workflow)**

### **3.1 Git 分支策略**

* main：穩定生產版本。  
* develop：日常開發集成版本。  
* feature/\*：新功能開發分支。  
* hotfix/\*：緊急修復分支。

### **3.2 Commit Message 規範**

請遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

* feat: 新增功能  
* fix: 修復錯誤  
* docs: 僅修改文件  
* style: 不影響程式碼邏輯的格式修改（空白、分號等）  
* refactor: 程式碼重構（既非修正也非新增功能）

## **4\. 程式碼風格 (Code Style)**

* **縮排**：使用 2 個空格。  
* **註釋**：  
  * 複雜邏輯必須撰寫行內註釋。  
  * 函式需包含 JSDoc 說明（輸入參數、回傳值）。  
* **Linting**：專案強制執行 ESLint 與 Prettier 檢查。

## **5\. API 設計與調用 (API Guidelines)**

* 所有的 API 調用應封裝在 src/services 中。  
* 必須處理 try...catch 錯誤情況。  
* 回傳格式應統一（例如：{ data, error, status }）。

## **6\. 環境配置 (Environment Variables)**

請確保 .env 檔案包含以下必要變數，但 **切勿** 將其提交至 Git：

* API\_BASE\_URL: 後端介面網址  
* APP\_MODE: 運行模式 (development / production)