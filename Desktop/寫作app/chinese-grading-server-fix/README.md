# 中文科命題寫作批改系統 - 後端服務器

這是香港中學中文科命題寫作批改系統的後端 API 服務器，用於處理 OCR 文字提取和 AI 自動批改。

## 功能

- ✅ OCR 文字提取（支持圖片和文檔）
- ✅ AI 自動批改作文
- ✅ 全班寫作分析
- ✅ 支持 OpenAI 和 Google Gemini API

## Render 部署教學（圖文步驟）

### 第一步：註冊 Render 賬號

1. 訪問 [https://render.com](https://render.com)
2. 點擊 **"Get Started for Free"**
3. 選擇 **"Continue with GitHub"**（推薦）
4. 授權 Render 訪問您的 GitHub 賬號

### 第二步：創建 GitHub 倉庫

1. 訪問 [https://github.com/new](https://github.com/new)
2. **Repository name**: 輸入 `chinese-grading-server`
3. **Description**: 可選，例如 "中文科批改系統後端"
4. 選擇 **Public**（公開）
5. 點擊 **Create repository**

### 第三步：上傳代碼到 GitHub

#### 方法 A：使用 Git 命令行（推薦）

在您的電腦上打開終端，執行：

```bash
# 1. 進入這個 server 文件夾
cd chinese-grading-server

# 2. 初始化 Git
git init

# 3. 添加所有文件
git add .

# 4. 提交
git commit -m "Initial commit"

# 5. 連接到您的 GitHub 倉庫
# 將 YOUR_USERNAME 替換為您的 GitHub 用戶名
git remote add origin https://github.com/YOUR_USERNAME/chinese-grading-server.git

# 6. 上傳代碼
git push -u origin main
```

#### 方法 B：直接上傳文件（簡單）

1. 在 GitHub 倉庫頁面，點擊 **"uploading an existing file"**
2. 將這個 `server` 文件夾中的所有文件拖放到頁面
3. 點擊 **Commit changes**

### 第四步：在 Render 部署

1. 登入 [Render Dashboard](https://dashboard.render.com)
2. 點擊藍色按鈕 **"New +"**
3. 選擇 **"Web Service"**
4. 在列表中找到您的倉庫 `chinese-grading-server`，點擊 **Connect**

#### 填寫部署設定：

| 欄位 | 值 |
|------|-----|
| **Name** | `chinese-grading-server` |
| **Region** | `Singapore (Southeast Asia)` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

5. 點擊頁面底部的 **"Create Web Service"**

### 第五步：等待部署完成

- 部署過程約需 2-5 分鐘
- 您會看到日誌輸出
- 當看到 `Your service is live` 表示成功

### 第六步：獲取服務器網址

部署成功後，您會看到類似的網址：
```
https://chinese-grading-server.onrender.com
```

**記下這個網址，您需要在前端設定中使用它！**

### 第七步：測試服務器

在瀏覽器訪問：
```
https://chinese-grading-server.onrender.com
```

如果看到以下回應，表示成功：
```json
{
  "status": "OK",
  "message": "中文科批改系統 API 服務器運行中",
  "timestamp": "2024-..."
}
```

---

## 更新前端設定

1. 打開前端項目的 `src/lib/api.ts`
2. 找到這一行：
```typescript
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```
3. 改為您的 Render 網址：
```typescript
export const BACKEND_URL = 'https://chinese-grading-server.onrender.com';
```
4. 重新構建並部署前端

---

## API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/` | GET | 健康檢查 |
| `/api/test` | POST | 測試 API 連接 |
| `/api/extract` | POST | OCR 提取文字 |
| `/api/grade` | POST | 批改作文 |
| `/api/analyze-class` | POST | 全班分析 |

---

## 常見問題

### Q: 部署失敗怎麼辦？

1. 檢查 Build Command 是否為 `npm install`
2. 檢查 Start Command 是否為 `npm start`
3. 查看 Render 日誌找出錯誤信息

### Q: 服務器休眠問題

Render 免費方案會在 15 分鐘無請求後休眠。首次訪問可能需要等待 30 秒喚醒。

### Q: 如何更新代碼？

1. 修改本地代碼
2. `git add . && git commit -m "更新說明"`
3. `git push`
4. Render 會自動重新部署

---

## 本地測試

如果您想在本地測試後端：

```bash
# 1. 進入目錄
cd chinese-grading-server

# 2. 安裝依賴
npm install

# 3. 啟動服務器
npm start

# 4. 訪問 http://localhost:3001
```

---

## 技術支持

如有問題，請檢查：
1. GitHub 倉庫是否正確創建
2. 代碼是否完整上傳
3. Render 設定是否正確
