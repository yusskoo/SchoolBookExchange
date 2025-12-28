# 初始化學校資料腳本說明

## 用途
將學校網域白名單從硬編碼改為 Firestore 管理後，需要初始化學校資料。

## 執行步驟

### 1. 下載服務帳戶金鑰
1. 前往 Firebase Console
2. 專案設定 → 服務帳戶
3. 產生新的私密金鑰
4. 下載 JSON 檔案並儲存為 `serviceAccountKey.json`

### 2. 設定環境變數

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="D:\SchoolBookExchange\functions\serviceAccountKey.json"
```

**Linux/Mac:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### 3. 執行腳本
```bash
cd functions/scripts
node init-schools.js
```

## 資料結構

學校資料儲存在 `schools` collection，格式如下：

```javascript
{
  id: 'shsh',                    // 文件 ID
  domain: 'shsh.ylc.edu.tw',    // 學校信箱網域
  name: '正心高中',              // 簡稱
  fullName: '天主教私立正心高級中學', // 全名
  enabled: true,                 // 是否啟用
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 新增學校

編輯 `init-schools.js`，在 `schools` 陣列中新增學校資料：

```javascript
{
  id: 'school_id',
  domain: 'school.edu.tw',
  name: '學校簡稱',
  fullName: '學校全名',
  enabled: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}
```

## 停用學校

在 Firestore Console 中，將該學校的 `enabled` 欄位設為 `false` 即可。

## 注意事項

⚠️ **重要**：
- 此腳本為一次性初始化，請勿重複執行（會覆蓋現有資料）
- `serviceAccountKey.json` 包含敏感資訊，請勿上傳至 Git
- 已加入 `.gitignore` 中
