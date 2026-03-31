# 部署檢查清單

## 部署前檢查

- [ ] 已註冊 GitHub 賬號
- [ ] 已註冊 Render 賬號（使用 GitHub 登入）
- [ ] 已創建 GitHub 倉庫 `chinese-grading-server`
- [ ] 已將代碼上傳到 GitHub

## Render 設定檢查

- [ ] Name: `chinese-grading-server`
- [ ] Region: `Singapore (Southeast Asia)`
- [ ] Branch: `main`
- [ ] Runtime: `Node`
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Plan: `Free`

## 部署後檢查

- [ ] 服務狀態顯示 "Live"
- [ ] 訪問 `https://your-service.onrender.com` 顯示成功消息
- [ ] 記下完整的服務器網址

## 前端設定檢查

- [ ] 更新 `src/lib/api.ts` 中的 `BACKEND_URL`
- [ ] 重新構建前端
- [ ] 重新部署前端
- [ ] 測試 API 連接功能

## 測試檢查

- [ ] 上傳圖片文件，測試 OCR 提取
- [ ] 測試作文批改功能
- [ ] 測試全班分析功能
