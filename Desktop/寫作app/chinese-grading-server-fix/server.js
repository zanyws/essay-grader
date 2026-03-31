const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

// 嘗試載入 mammoth 用於處理 Word 文件
let mammoth = null;
try {
  mammoth = require('mammoth');
  console.log('Mammoth loaded successfully for Word processing');
} catch (e) {
  console.log('Mammoth not available, Word files will be processed via API');
}

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// 健康檢查
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '中文科批改系統 API 服務器運行中',
    timestamp: new Date().toISOString()
  });
});

// 測試 API 連接
app.post('/api/test', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    if (apiType === 'gemini') {
      const result = await testGeminiConnection(apiKey, model);
      return res.json(result);
    } else if (apiType === 'custom') {
      if (!baseURL) {
        return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      }
      const result = await testCustomConnection(apiKey, baseURL, model);
      return res.json(result);
    } else if (apiType === 'openai') {
      const result = await testOpenAIConnection(apiKey, model);
      return res.json(result);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({ success: false, message: error.message || '測試失敗' });
  }
});

// OCR 提取文字 - 支持多篇文章分篇
app.post('/api/extract', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL, fileType, fileData, text } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    if (!fileData && !text) {
      return res.status(400).json({ success: false, message: '沒有提供文件或文字' });
    }

    console.log('Extract request:', { apiType, fileType, hasFileData: !!fileData, hasText: !!text });

    let result;
    if (apiType === 'gemini') {
      result = await extractWithGemini(apiKey, model, fileData, text, fileType);
    } else if (apiType === 'custom') {
      if (!baseURL) {
        return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      }
      result = await extractWithCustom(apiKey, baseURL, model, fileData, text, fileType);
    } else if (apiType === 'openai') {
      result = await extractWithOpenAI(apiKey, model, fileData, text, fileType);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Extract error:', error);
    res.status(500).json({ success: false, message: error.message || '提取失敗' });
  }
});

// 提取題目與評分準則
app.post('/api/extract-question-criteria', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL, fileType, fileData, text } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    if (!fileData && !text) {
      return res.status(400).json({ success: false, message: '沒有提供文件或文字' });
    }

    console.log('Extract question/criteria request:', { apiType, fileType, hasFileData: !!fileData, hasText: !!text });

    let result;
    if (apiType === 'gemini') {
      result = await extractQuestionCriteriaWithGemini(apiKey, model, fileData, text, fileType);
    } else if (apiType === 'custom') {
      if (!baseURL) {
        return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      }
      result = await extractQuestionCriteriaWithCustom(apiKey, baseURL, model, fileData, text, fileType);
    } else if (apiType === 'openai') {
      result = await extractQuestionCriteriaWithOpenAI(apiKey, model, fileData, text, fileType);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Extract question/criteria error:', error);
    res.status(500).json({ success: false, message: error.message || '提取失敗' });
  }
});

// 合併端點：同一請求提取學生作品文字 + 整理評分準則（題目/資料內容/評分準則）
app.post('/api/extract-and-organize', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL, fileType, fileData, text,
            pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    console.log('Extract-and-organize request:', { apiType, fileType, hasFileData: !!fileData, hasText: !!text });

    let result;
    if (apiType === 'gemini') {
      result = await extractAndOrganizeWithGemini(apiKey, model, fileData, text, fileType, pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk);
    } else if (apiType === 'custom') {
      if (!baseURL) return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      result = await extractAndOrganizeWithCustom(apiKey, baseURL, model, fileData, text, fileType, pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk);
    } else if (apiType === 'openai') {
      result = await extractAndOrganizeWithOpenAI(apiKey, model, fileData, text, fileType, pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Extract-and-organize error:', error);
    res.status(500).json({ success: false, message: error.message || '處理失敗' });
  }
});

// 批改作文
app.post('/api/grade', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL, essayText, question, customCriteria, gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    if (!essayText) {
      return res.status(400).json({ success: false, message: '作文內容不能為空' });
    }

    const maxLength = 15000;
    const truncatedText = essayText.length > maxLength 
      ? essayText.substring(0, maxLength) + '\n\n[文章過長，已截斷]' 
      : essayText;

    let result;
    if (apiType === 'gemini') {
      result = await gradeWithGemini(apiKey, model, truncatedText, question, customCriteria, gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements);
    } else if (apiType === 'custom') {
      if (!baseURL) {
        return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      }
      result = await gradeWithCustom(apiKey, baseURL, model, truncatedText, question, customCriteria, gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements);
    } else if (apiType === 'openai') {
      result = await gradeWithOpenAI(apiKey, model, truncatedText, question, customCriteria, gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Grade error:', error);
    res.status(500).json({ success: false, message: error.message || '批改失敗' });
  }
});

// 生成實用寫作模擬卷（新邏輯：上傳模擬卷→生成新模擬卷）
app.post('/api/generate-practical-exam', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL, fileData, fileType, text, genre, systemPrompt: clientSystemPrompt } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    if (!fileData && !text) {
      return res.status(400).json({ success: false, message: '請上傳模擬卷文件' });
    }

    if (!genre) {
      return res.status(400).json({ success: false, message: '請選擇文體' });
    }

    let result;
    if (apiType === 'gemini') {
      result = await generatePracticalExamWithGemini(apiKey, model, fileData, text, fileType, genre, clientSystemPrompt);
    } else if (apiType === 'custom') {
      if (!baseURL) {
        return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      }
      result = await generatePracticalExamWithCustom(apiKey, baseURL, model, fileData, text, fileType, genre, clientSystemPrompt);
    } else if (apiType === 'openai') {
      result = await generatePracticalExamWithOpenAI(apiKey, model, fileData, text, fileType, genre, clientSystemPrompt);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Generate exam error:', error);
    res.status(500).json({ success: false, message: error.message || '生成失敗' });
  }
});

// 全班分析
app.post('/api/analyze-class', async (req, res) => {
  try {
    const { apiKey, apiType, model, baseURL, reports, question, gradingMode } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API 密鑰不能為空' });
    }

    const maxReports = 30;
    const limitedReports = reports.slice(0, maxReports);

    let result;
    if (apiType === 'gemini') {
      result = await analyzeClassWithGemini(apiKey, model, limitedReports, question, gradingMode);
    } else if (apiType === 'custom') {
      if (!baseURL) {
        return res.status(400).json({ success: false, message: '自定義 API 需要提供 API 基礎 URL' });
      }
      result = await analyzeClassWithCustom(apiKey, baseURL, model, limitedReports, question, gradingMode);
    } else if (apiType === 'openai') {
      result = await analyzeClassWithOpenAI(apiKey, model, limitedReports, question, gradingMode);
    } else {
      return res.status(400).json({ success: false, message: '未知的 API 類型: ' + apiType });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Analyze class error:', error);
    res.status(500).json({ success: false, message: error.message || '分析失敗' });
  }
});

// ============ 輔助函數 ============

function normalizeGeminiModelName(modelName) {
  if (!modelName) return 'gemini-2.0-flash';
  let name = modelName.startsWith('models/') ? modelName.substring(7) : modelName;
  const modelMap = {
    'gemini-1.5-flash': 'gemini-1.5-flash-latest',
    'gemini-1.5-pro': 'gemini-1.5-pro-latest',
    'gemini-1.0-pro': 'gemini-1.0-pro-latest',
    'gemini-pro': 'gemini-1.0-pro-latest',
  };
  if (modelMap[name]) return modelMap[name];
  if (name.includes('-latest') || /-\d{3}$/.test(name)) return name;
  return name;
}

// Gemini 安全設置 - 解除過濾
const GEMINI_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

// 安全解析 JSON - 增強版
function safeJSONParse(text, context = '') {
  if (!text || typeof text !== 'string') {
    throw new Error(`AI 返回內容為空或格式錯誤 (${context})`);
  }
  
  console.log(`Parsing JSON (${context}):`, text.substring(0, 200) + '...');
  
  try {
    // 1. 去除 markdown 代碼塊標記
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/gi, '')
      .trim();
    
    // 2. 嘗試直接解析
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 3. 嘗試提取 JSON 對象（找第一個 { 和最後一個 }）
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e2) {
          console.log('Extracted JSON parse failed, trying repair...');
        }
      }
      
      // 4. 嘗試修復常見問題：去除尾部逗號
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      
      // 5. 嘗試修復未閉合的字符串
      const openQuotes = (cleaned.match(/"/g) || []).length;
      if (openQuotes % 2 !== 0) {
        cleaned += '"';
      }
      
      try {
        return JSON.parse(cleaned);
      } catch (e3) {
        throw new Error(`無法解析 JSON: ${text.substring(0, 100)}...`);
      }
    }
  } catch (error) {
    console.error('JSON parse error:', error, 'Original text:', text.substring(0, 500));
    throw new Error(`無法解析 AI 返回的 JSON 格式: ${error.message}`);
  }
}

// ============ Gemini API 函數 ============

async function testGeminiConnection(apiKey, modelName = 'gemini-2.0-flash') {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=5`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const availableModels = data.models?.map(m => m.name) || [];
    const isModelAvailable = availableModels.some(m => m === model || m.endsWith(normalizedModelName));

    return {
      success: true,
      message: isModelAvailable 
        ? `Gemini API 連接成功！模型 "${normalizedModelName}" 可用`
        : `API 連接成功！但模型 "${normalizedModelName}" 可能不可用`,
      model: normalizedModelName
    };
  } catch (error) {
    return handleGeminiError(error, normalizedModelName);
  }
}

async function extractWithGemini(apiKey, modelName, fileData, text, fileType) {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;
  
  console.log('extractWithGemini:', { model, fileType, hasFileData: !!fileData, hasText: !!text });
  
  // 檢查是否為 Word 文件
  const isWord = fileType && (
    fileType === 'application/msword' || 
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType.includes('word') ||
    fileType.includes('doc')
  );
  
  // 如果是 Word 文件，必須使用 mammoth 提取文本
  if (isWord && fileData) {
    if (!mammoth) {
      throw new Error('Word 文件處理需要 mammoth 庫，請確保已安裝 mammoth 套件 (npm install mammoth)');
    }
    try {
      console.log('Processing Word file with mammoth');
      const buffer = Buffer.from(fileData, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      console.log('Word file extracted, length:', result.value.length);
      text = result.value;
      fileData = null; // 清除 fileData，使用提取的文本
    } catch (wordError) {
      console.error('Mammoth extraction failed:', wordError);
      throw new Error(`無法提取 Word 文件內容: ${wordError.message}`);
    }
  }
  
  const prompt = `你是一個專業的OCR文字識別助手。請從圖片或文檔中提取學生的作文文字。

【重要】分辨文章數量的規則：
- 如果文件中只有一篇學生作文，請只返回一篇文章
- 如果文件中有多篇學生作文（例如多個學生的作品、多頁不同學生的作文），請識別並分開每一篇
- 判斷標準：不同學生姓名、明顯的分隔線、不同的標題通常表示不同文章
- 如果只有一個學生姓名且內容連貫，請視為一篇文章

對於每一篇，請提取：
1. 學生姓名（通常在文章開頭或標題處）
2. 學生學號/班級（如果有）
3. 作文正文內容

提取要求：
- 保持原文的段落格式
- 只提取作文正文，不要包含題目（除非題目是文章的一部分）
- 保持所有標點符號
- 不要修改任何文字，包括錯別字

請以JSON格式返回，如果有多篇文章，請返回數組：
{
  "articles": [
    {
      "text": "第一篇作文全文",
      "name": "學生姓名1",
      "studentId": "學號1"
    }
  ]
}

如果只有一篇文章，也使用相同的格式返回。`;

  let requestBody;
  const isImage = fileType && fileType.startsWith('image/');
  const isPDF = fileType && (fileType === 'application/pdf' || fileType.includes('pdf'));
  
  console.log('Type check:', { isImage, isPDF, isWord: !!isWord, fileType, hasFileData: !!fileData, hasText: !!text });

  if (fileData && (isImage || isPDF)) {
    const mimeType = isPDF ? 'application/pdf' : fileType;
    console.log('Using inline_data mode with mimeType:', mimeType);
    
    requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: fileData
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      },
      safetySettings: GEMINI_SAFETY_SETTINGS
    };
  } else {
    console.log('Using text mode');
    const content = text || '';
    requestBody = {
      contents: [{
        parts: [{
          text: prompt + '\n\n請提取以下文本中的學生作文內容：\n\n' + content
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      },
      safetySettings: GEMINI_SAFETY_SETTINGS
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API 請求失敗');
  }

  const data = await response.json();
  
  // 檢查是否有內容被阻擋
  if (data.promptFeedback?.blockReason) {
    throw new Error(`內容被阻擋: ${data.promptFeedback.blockReason}`);
  }
  
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    // 檢查 finishReason
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      throw new Error(`Gemini API 返回異常: ${finishReason}`);
    }
    throw new Error('Gemini API 返回內容為空');
  }

  const result = safeJSONParse(content, 'extract');
  
  // 支持多篇文章返回
  if (result.articles && Array.isArray(result.articles) && result.articles.length > 0) {
    const firstArticle = result.articles[0];
    return {
      text: firstArticle.text || '',
      name: firstArticle.name || '',
      studentId: firstArticle.studentId || '',
      articles: result.articles
    };
  }
  
  return {
    text: result.text || '',
    name: result.name || '',
    studentId: result.studentId || '',
    articles: result.articles
  };
}

// 提取題目與評分準則
async function extractQuestionCriteriaWithGemini(apiKey, modelName, fileData, text, fileType) {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;
  
  const prompt = `你是一個專業的教育文件分析助手。請從文件中提取作文題目和評分準則。

請分析文件內容，識別並提取：
1. 題目：作文的題目要求
2. 評分準則：如果有提供評分準則，請完整提取；如果沒有，請返回空字符串

請以JSON格式返回：
{
  "question": "提取的題目內容",
  "criteria": "提取的評分準則（如無則為空字符串）"
}`;

  let requestBody;
  const isImage = fileType && fileType.startsWith('image/');
  const isPDF = fileType && (fileType === 'application/pdf' || fileType.includes('pdf'));

  if (fileData && (isImage || isPDF)) {
    const mimeType = isPDF ? 'application/pdf' : fileType;
    requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: fileData
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      },
      safetySettings: GEMINI_SAFETY_SETTINGS
    };
  } else {
    requestBody = {
      contents: [{
        parts: [{
          text: prompt + '\n\n請分析以下內容：\n\n' + (text || '')
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      },
      safetySettings: GEMINI_SAFETY_SETTINGS
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API 請求失敗');
  }

  const data = await response.json();
  
  if (data.promptFeedback?.blockReason) {
    throw new Error(`內容被阻擋: ${data.promptFeedback.blockReason}`);
  }
  
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Gemini API 返回內容為空');
  }

  return safeJSONParse(content, 'extract-question-criteria');
}

// 合併：提取學生作品 + 整理評分準則（Gemini）
async function extractAndOrganizeWithGemini(apiKey, modelName, fileData, text, fileType, pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk = false) {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;

  const hasStudent = fileData || text;
  const hasCriteria = pastedQuestion || pastedMaterial || pastedCriteria;

  const criteriaSection = `題目：\n${pastedQuestion || '（未提供）'}\n\n資料內容：\n${pastedMaterial || '（未提供）'}\n\n評分準則：\n${pastedCriteria || '（未提供）'}`;

  let promptText;
  if (hasStudent && hasCriteria) {
    promptText = `你是一個專業的教育助手，請同時完成以下兩個任務：

【任務一：提取學生作文】
從提供的文件或文字中提取學生作文的正文文字，識別學生姓名和學號（如有）。${ignoreRedInk ? '\n請忽略所有紅筆批改內容，只提取學生原本的黑筆文字。' : ''}

【任務二：整理評分準則】
根據以下批改資料，整理出結構化的評分準則：
${criteriaSection}

請從上述資料中分析並提取：
1. 資訊分考核項目：學生作文必須提及的關鍵資訊點（通常2-4項）
2. 內容發展細項數量：描述內容發展齊全的要求（例如：2個建議、4個建議細項、3項同學意見）
3. 整理後的題目：簡潔的題目要求

請以JSON格式返回：
{
  "studentText": "提取的學生作文正文",
  "studentName": "學生姓名（如識別不到則留空）",
  "studentId": "學號（如識別不到則留空）",
  "question": "整理後的題目",
  "infoPoints": ["資訊考核項目1", "資訊考核項目2", "資訊考核項目3"],
  "devLabel": "內容發展細項數量描述"
}`;
  } else if (hasCriteria) {
    promptText = `你是一個專業的教育助手，請整理以下批改資料：

${criteriaSection}

請從上述資料中分析並提取：
1. 資訊分考核項目：學生作文必須提及的關鍵資訊點（通常2-4項）
2. 內容發展細項數量：描述內容發展齊全的要求（例如：2個建議、4個建議細項、3項同學意見）
3. 整理後的題目：簡潔的題目要求

請以JSON格式返回：
{
  "studentText": "",
  "studentName": "",
  "studentId": "",
  "question": "整理後的題目",
  "infoPoints": ["資訊考核項目1", "資訊考核項目2", "資訊考核項目3"],
  "devLabel": "內容發展細項數量描述"
}`;
  } else {
    throw new Error('未提供批改資料');
  }

  const isImage = fileType && fileType.startsWith('image/');
  const isPDF = fileType && (fileType === 'application/pdf' || fileType.includes('pdf'));

  let parts = [{ text: promptText }];
  if (fileData && (isImage || isPDF)) {
    parts.push({ inline_data: { mime_type: isPDF ? 'application/pdf' : fileType, data: fileData } });
  } else if (text) {
    parts[0].text += '\n\n學生作文文字：\n' + text;
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 65536, responseMimeType: 'application/json' },
    safetySettings: GEMINI_SAFETY_SETTINGS
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API 請求失敗');
  }

  const data = await response.json();
  if (data.promptFeedback?.blockReason) throw new Error(`內容被阻擋: ${data.promptFeedback.blockReason}`);
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini API 返回內容為空');
  return safeJSONParse(content, 'extract-and-organize');
}

// 合併：提取學生作品 + 整理評分準則（OpenAI）
async function extractAndOrganizeWithOpenAI(apiKey, modelName, fileData, text, fileType, pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk = false) {
  const model = modelName || 'gpt-4o';

  const hasStudent = fileData || text;
  const hasCriteria = pastedQuestion || pastedMaterial || pastedCriteria;
  const criteriaSection = `題目：\n${pastedQuestion || '（未提供）'}\n\n資料內容：\n${pastedMaterial || '（未提供）'}\n\n評分準則：\n${pastedCriteria || '（未提供）'}`;

  let systemPrompt;
  if (hasStudent && hasCriteria) {
    systemPrompt = `你是一個專業的教育助手，請同時完成兩個任務：
【任務一】從文件或文字中提取學生作文正文，識別學生姓名和學號（如有）。${ignoreRedInk ? '請忽略紅筆批改，只提取學生原本的黑筆文字。' : ''}
【任務二】根據以下批改資料整理評分準則：\n${criteriaSection}
提取：1.資訊分考核項目（2-4項） 2.內容發展細項數量描述 3.整理後的題目
返回JSON：{"studentText":"","studentName":"","studentId":"","question":"","infoPoints":[],"devLabel":""}`;
  } else {
    systemPrompt = `你是一個專業的教育助手，請整理以下批改資料：\n${criteriaSection}
提取：1.資訊分考核項目（2-4項） 2.內容發展細項數量描述 3.整理後的題目
返回JSON：{"studentText":"","studentName":"","studentId":"","question":"","infoPoints":[],"devLabel":""}`;
  }

  let messages;
  const isImage = fileType && fileType.startsWith('image/');
  if (fileData && isImage) {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: [
        { type: 'text', text: '請分析此圖片並完成兩個任務。' },
        { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
      ]}
    ];
  } else {
    const userText = text ? `學生作文：\n${text}` : '（無學生作文文字）';
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 4000, response_format: { type: 'json_object' } })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 請求失敗');
  }
  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI API 返回內容為空');
  return JSON.parse(content);
}

// 合併：提取學生作品 + 整理評分準則（Custom）
async function extractAndOrganizeWithCustom(apiKey, baseURL, modelName, fileData, text, fileType, pastedQuestion, pastedMaterial, pastedCriteria, ignoreRedInk = false) {
  const model = modelName || 'gpt-4o';
  const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;

  const hasCriteria = pastedQuestion || pastedMaterial || pastedCriteria;
  const criteriaSection = `題目：\n${pastedQuestion || '（未提供）'}\n\n資料內容：\n${pastedMaterial || '（未提供）'}\n\n評分準則：\n${pastedCriteria || '（未提供）'}`;

  const systemPrompt = (fileData || text)
    ? `你是一個專業的教育助手，請同時完成兩個任務：【任務一】從文件或文字中提取學生作文正文。${ignoreRedInk ? '忽略紅筆批改。' : ''}【任務二】整理批改資料：\n${criteriaSection}\n返回JSON：{"studentText":"","studentName":"","studentId":"","question":"","infoPoints":[],"devLabel":""}`
    : `整理以下批改資料：\n${criteriaSection}\n返回JSON：{"studentText":"","studentName":"","studentId":"","question":"","infoPoints":[],"devLabel":""}`;

  let messages;
  const isImage = fileType && fileType.startsWith('image/');
  if (fileData && isImage) {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: [
        { type: 'text', text: '請分析此圖片並完成兩個任務。' },
        { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
      ]}
    ];
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text ? `學生作文：\n${text}` : '（無學生作文文字）' }
    ];
  }

  const response = await fetch(`${normalizedURL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 4000, response_format: { type: 'json_object' } })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API 請求失敗');
  }
  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) throw new Error('API 返回內容為空');
  return JSON.parse(content);
}

async function gradeWithGemini(apiKey, modelName, essayText, question, customCriteria, gradingMode = 'secondary', contentPriority = false, enhancementDirection = 'auto', genre = '', infoPoints = [], devItems = {}, formatRequirements = []) {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;
  
  const systemPrompt = buildGradingPrompt(gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements);
  const userPrompt = buildUserPrompt(essayText, question, customCriteria, gradingMode, genre);

  const requestBody = {
    contents: [{
      parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
    }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json'
    },
    safetySettings: GEMINI_SAFETY_SETTINGS
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API 請求失敗');
  }

  const data = await response.json();
  
  // 檢查是否有內容被阻擋
  if (data.promptFeedback?.blockReason) {
    throw new Error(`內容被阻擋: ${data.promptFeedback.blockReason}`);
  }
  
  let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    // 嘗試從其他候選人獲取內容
    if (data.candidates && data.candidates.length > 1) {
      for (let i = 1; i < data.candidates.length; i++) {
        const altContent = data.candidates[i]?.content?.parts?.[0]?.text;
        if (altContent) {
          console.log('Using alternative candidate:', i);
          content = altContent;
          break;
        }
      }
    }
    
    if (!content) {
      const finishReason = data.candidates?.[0]?.finishReason;
      throw new Error(`Gemini API 返回內容為空 (finishReason: ${finishReason || 'unknown'})`);
    }
  }

  return parseGradingResult(content, essayText, gradingMode);
}

// 生成實用寫作模擬卷（新邏輯）
async function generatePracticalExamWithGemini(apiKey, modelName, fileData, text, fileType, genre, clientSystemPrompt) {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;
  
  const genreNames = {
    speech: '演講辭',
    letter: '書信/公開信',
    proposal: '建議書',
    report: '報告',
    commentary: '評論文章',
    article: '專題文章'
  };

  const prompt = (clientSystemPrompt || '') + `

你是一位專業的DSE中文科試題設計專家。請分析用戶上傳的模擬卷，理解其主題和結構，然後生成一份全新的模擬卷。

【重要要求】
1. AI分析上傳的模擬卷，理解其主題和結構
2. 生成一份全新的模擬卷，包括題目、評分參考和示範文章
3. 新模擬卷保持相同的主題方向，但內容完全不同
4. 新模擬卷必須符合用戶選擇的文體格式要求
5. 用戶選擇的文體是：${genreNames[genre] || genre}

【資料內容格式要求 - 必須遵守】
- 資料內容必須以簡短段落、對話、列點的形式呈現
- 不要使用一大段的連續文字
- 可以使用：簡短對話、要點列舉、分段說明、表格數據等形式
- 每個資料內容約200-300字，分為多個小段落

【評分參考格式要求 - 必須遵守】
- 內容訊息（2分）：以表格形式列出各項內容要點，包括主題、背景、意義等
- 內容發展（8分）：以表格形式列出各項內容細項、意見、回應等
- 格式要求：以表格形式列出格式評分標準
- 行文組織的評分不用呈現

【示範文章要求】
- 示範文章總字數不得超過550字
- 文章結構要求：
  * 開首：不多於80字（簡潔引入主題）
  * 第二段：約200字（主要論點/內容發展）
  * 第三段：約200字（進一步闡述/例子）
  * 結尾：不多於70字（簡潔總結）
- 必須符合該文體的格式要求
- 能獲得高分的完整文章

【輸出格式 - 必須是有效的JSON】
{
  "examPaper": {
    "title": "試卷標題（如：DSE 中文卷二甲部：實用寫作）",
    "time": "考試時間（如：45分鐘）",
    "marks": "佔分（如：50分）",
    "instructions": ["考生須知1", "考生須知2"],
    "question": "題目描述（詳細說明寫作任務）",
    "material1": {
      "title": "資料一標題",
      "content": "資料一內容（以簡短段落、對話、列點形式呈現，約200-300字）"
    },
    "material2": {
      "title": "資料二標題",
      "content": "資料二內容（以簡短段落、對話、列點形式呈現，約200-300字）"
    }
  },
  "markingScheme": {
    "contentInfo": {
      "title": "內容訊息（2分）",
      "table": [
        { "item": "主題/議題", "description": "準確點明主題" },
        { "item": "背景", "description": "交代清楚背景" },
        { "item": "意義/目的", "description": "說明寫作目的" }
      ]
    },
    "contentDevelopment": {
      "title": "內容發展（8分）",
      "table": [
        { "item": "內容細項1", "description": "具體說明要求", "score": "2分" },
        { "item": "內容細項2", "description": "具體說明要求", "score": "2分" },
        { "item": "意見/回應", "description": "表達清晰意見", "score": "2分" },
        { "item": "整體發展", "description": "內容完整連貫", "score": "2分" }
      ]
    },
    "formatRequirements": {
      "title": "格式要求",
      "table": [
        { "item": "格式項目1", "requirement": "具體要求", "score": "扣分標準" },
        { "item": "格式項目2", "requirement": "具體要求", "score": "扣分標準" }
      ]
    }
  },
  "modelEssay": "示範文章（一篇符合該文體格式、能獲得高分的完整文章，字數不得超過599字）"
}

請確保返回的是有效的JSON格式，不要包含任何markdown代碼塊標記。`;

  let requestBody;
  const isImage = fileType && fileType.startsWith('image/');
  const isPDF = fileType && (fileType === 'application/pdf' || fileType.includes('pdf'));

  if (fileData && (isImage || isPDF)) {
    const mimeType = isPDF ? 'application/pdf' : fileType;
    requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: fileData
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      },
      safetySettings: GEMINI_SAFETY_SETTINGS
    };
  } else {
    requestBody = {
      contents: [{
        parts: [{
          text: prompt + '\n\n請根據以下模擬卷內容生成新模擬卷：\n\n' + (text || '')
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 65536,
        responseMimeType: 'application/json'
      },
      safetySettings: GEMINI_SAFETY_SETTINGS
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error response:', errorText);
    throw new Error(`Gemini API 請求失敗: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.promptFeedback?.blockReason) {
    throw new Error(`內容被阻擋: ${data.promptFeedback.blockReason}`);
  }
  
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Gemini API 返回內容為空');
  }

  return safeJSONParse(content, 'generate-exam');
}

async function analyzeClassWithGemini(apiKey, modelName, reports, question, gradingMode = 'secondary') {
  const normalizedModelName = normalizeGeminiModelName(modelName);
  const model = `models/${normalizedModelName}`;
  
  const stats = {
    totalStudents: reports.length,
    averageScore: reports.reduce((sum, r) => sum + r.totalScore, 0) / reports.length,
  };

  let systemPrompt;
  if (gradingMode === 'primary') {
    systemPrompt = `你是一位專業的香港小學中文科教師，正在分析全班學生的寫作表現。

請根據學生的評分數據，從以下五個方面進行分析：
1. 切題與內容分析
2. 感受與立意分析
3. 組織與結構分析
4. 語言運用分析
5. 文類與格式分析

最後提供針對性的寫作教學建議。

請以JSON格式返回：
{
  "materialAnalysis": "選材分析內容",
  "relevanceAnalysis": "扣題分析內容",
  "themeAnalysis": "立意分析內容",
  "techniqueAnalysis": "寫作手法分析內容",
  "teachingSuggestion": "寫作教學建議內容"
}`;
  } else if (gradingMode === 'practical') {
    systemPrompt = `你是一位專業的香港中學中文科教師，正在分析全班學生的實用寫作表現。

請根據學生的評分數據，從以下方面進行分析：
1. 內容資訊分析
2. 拓展分析
3. 語氣分析
4. 組織結構分析

最後提供針對性的寫作教學建議。

請以JSON格式返回：
{
  "materialAnalysis": "內容資訊分析",
  "relevanceAnalysis": "拓展分析",
  "themeAnalysis": "語氣分析",
  "techniqueAnalysis": "組織結構分析",
  "teachingSuggestion": "寫作教學建議內容"
}`;
  } else {
    systemPrompt = `你是一位專業的香港中學中文科教師，正在分析全班學生的寫作表現。

請根據學生的評分數據，從以下四個方面進行分析：
1. 選材分析：學生選取素材的類型、優點和問題
2. 扣題分析：學生對題目的理解程度、常見問題和改進建議
3. 立意分析：學生立意的深度分佈、優點和問題
4. 寫作手法分析：學生使用的寫作手法、優點和問題

最後提供針對性的寫作教學建議。

請以JSON格式返回：
{
  "materialAnalysis": "選材分析內容",
  "relevanceAnalysis": "扣題分析內容",
  "themeAnalysis": "立意分析內容",
  "techniqueAnalysis": "寫作手法分析內容",
  "teachingSuggestion": "寫作教學建議內容"
}`;
  }

  const userPrompt = `請分析以下全班寫作數據：

## 題目
${question}

## 統計數據
- 總人數: ${stats.totalStudents}
- 平均分: ${stats.averageScore.toFixed(1)}

## 學生分數詳情
${reports.map(r => `- ${r.studentWork?.name || '未命名'}: 總分${r.totalScore}`).join('\n')}

請以專業教師的角度進行分析，並以JSON格式返回結果。`;

  const requestBody = {
    contents: [{
      parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
    }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json'
    },
    safetySettings: GEMINI_SAFETY_SETTINGS
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API 請求失敗');
  }

  const data = await response.json();
  
  if (data.promptFeedback?.blockReason) {
    throw new Error(`內容被阻擋: ${data.promptFeedback.blockReason}`);
  }
  
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Gemini API 返回內容為空');
  }

  return safeJSONParse(content, 'analyze-class');
}

// ============ OpenAI API 函數 ============

async function testOpenAIConnection(apiKey, modelName = 'gpt-4o') {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const availableModels = data.data?.map(m => m.id) || [];
    const isModelAvailable = availableModels.some(m => m === modelName);

    return {
      success: true,
      message: isModelAvailable 
        ? `OpenAI API 連接成功！模型 "${modelName}" 可用`
        : `API 連接成功！但模型 "${modelName}" 可能不可用`,
      model: modelName
    };
  } catch (error) {
    return handleOpenAIError(error, modelName);
  }
}

async function extractWithOpenAI(apiKey, modelName, fileData, text, fileType) {
  const model = modelName || 'gpt-4o';
  
  // 檢查是否為 Word 文件
  const isWord = fileType && (
    fileType === 'application/msword' || 
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType.includes('word') ||
    fileType.includes('doc')
  );
  
  // 如果是 Word 文件，必須使用 mammoth 提取文本
  if (isWord && fileData) {
    if (!mammoth) {
      throw new Error('Word 文件處理需要 mammoth 庫，請確保已安裝 mammoth 套件 (npm install mammoth)');
    }
    try {
      console.log('Processing Word file with mammoth (OpenAI)');
      const buffer = Buffer.from(fileData, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      console.log('Word file extracted, length:', result.value.length);
      text = result.value;
      fileData = null;
    } catch (wordError) {
      console.error('Mammoth extraction failed:', wordError);
      throw new Error(`無法提取 Word 文件內容: ${wordError.message}`);
    }
  }
  
  const systemPrompt = `你是一個專業的OCR文字識別助手。請從圖片或文檔中提取學生的作文文字。

【重要】分辨文章數量的規則：
- 如果文件中只有一篇學生作文，請只返回一篇文章
- 如果文件中有多篇學生作文，請識別並分開每一篇
- 判斷標準：不同學生姓名、明顯的分隔線、不同的標題通常表示不同文章

提取要求：
1. 保持原文的段落格式
2. 識別學生姓名和學號（通常在文章開頭或標題處）
3. 只提取作文正文，不要包含題目（除非題目是文章的一部分）
4. 保持所有標點符號
5. 不要修改任何文字，包括錯別字

請以JSON格式返回：
{
  "articles": [
    {
      "text": "作文全文",
      "name": "學生姓名（如無則留空）",
      "studentId": "學生學號（如無則留空）"
    }
  ]
}`;

  let messages;
  
  if (fileData && fileType && fileType.startsWith('image/')) {
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請提取這張圖片中的學生作文文字，並識別姓名和學號。' },
          { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
        ]
      }
    ];
  } else {
    const content = text || '';
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `請提取以下文本中的學生作文內容：\n\n${content}` }
    ];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OpenAI API 返回內容為空');
  }

  const result = JSON.parse(content);
  
  if (result.articles && Array.isArray(result.articles) && result.articles.length > 0) {
    const firstArticle = result.articles[0];
    return {
      text: firstArticle.text || '',
      name: firstArticle.name || '',
      studentId: firstArticle.studentId || '',
      articles: result.articles
    };
  }
  
  return {
    text: result.text || '',
    name: result.name || '',
    studentId: result.studentId || ''
  };
}

async function extractQuestionCriteriaWithOpenAI(apiKey, modelName, fileData, text, fileType) {
  const model = modelName || 'gpt-4o';
  
  const systemPrompt = `你是一個專業的教育文件分析助手。請從文件中提取作文題目和評分準則。

請分析文件內容，識別並提取：
1. 題目：作文的題目要求
2. 評分準則：如果有提供評分準則，請完整提取；如果沒有，請返回空字符串

請以JSON格式返回：
{
  "question": "提取的題目內容",
  "criteria": "提取的評分準則（如無則為空字符串）"
}`;

  let messages;
  
  if (fileData && fileType && fileType.startsWith('image/')) {
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請分析這張圖片，提取題目和評分準則。' },
          { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
        ]
      }
    ];
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `請分析以下內容，提取題目和評分準則：\n\n${text || ''}` }
    ];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OpenAI API 返回內容為空');
  }

  return JSON.parse(content);
}

async function gradeWithOpenAI(apiKey, modelName, essayText, question, customCriteria, gradingMode = 'secondary', contentPriority = false, enhancementDirection = 'auto', genre = '', infoPoints = [], devItems = {}, formatRequirements = []) {
  const model = modelName || 'gpt-4o';
  
  const systemPrompt = buildGradingPrompt(gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements);
  const userPrompt = buildUserPrompt(essayText, question, customCriteria, gradingMode, genre);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OpenAI API 返回內容為空');
  }

  return parseGradingResult(content, essayText, gradingMode);
}

async function generatePracticalExamWithOpenAI(apiKey, modelName, fileData, text, fileType, genre, clientSystemPrompt) {
  const model = modelName || 'gpt-4o';
  
  const genreNames = {
    speech: '演講辭',
    letter: '書信/公開信',
    proposal: '建議書',
    report: '報告',
    commentary: '評論文章',
    article: '專題文章'
  };

  const systemPrompt = (clientSystemPrompt || '') + `

你是一位專業的DSE中文科試題設計專家。請分析用戶上傳的模擬卷，理解其主題和結構，然後生成一份全新的模擬卷。

【重要要求】
1. 新模擬卷必須保持與原卷相同的主題/主題方向
2. 但內容必須完全不同（不同的情境、不同的資料、不同的具體要求）
3. 用戶選擇的文體是：${genreNames[genre] || genre}
4. 新模擬卷必須符合該文體的格式要求

【資料內容格式要求 - 必須遵守】
- 資料內容必須以簡短段落、對話、列點的形式呈現
- 不要使用一大段的連續文字
- 可以使用：簡短對話、要點列舉、分段說明、表格數據等形式
- 每個資料內容約200-300字，分為多個小段落

【評分參考格式要求 - 必須遵守】
- 內容訊息（2分）：以表格形式列出各項內容要點，包括主題、背景、意義等
- 內容發展（8分）：以表格形式列出各項內容細項、意見、回應等
- 格式要求：以表格形式列出格式評分標準
- 行文組織的評分不用呈現

【示範文章要求】
- 示範文章總字數不得超過550字
- 文章結構要求：
  * 開首：不多於80字（簡潔引入主題）
  * 第二段：約200字（主要論點/內容發展）
  * 第三段：約200字（進一步闡述/例子）
  * 結尾：不多於70字（簡潔總結）
- 必須符合該文體的格式要求
- 能獲得高分的完整文章

【輸出格式 - 必須是有效的JSON】
{
  "examPaper": {
    "title": "試卷標題",
    "time": "考試時間",
    "marks": "佔分",
    "instructions": ["考生須知1", "考生須知2"],
    "question": "題目描述",
    "material1": { "title": "資料一標題", "content": "資料一內容（以簡短段落、對話、列點形式）" },
    "material2": { "title": "資料二標題", "content": "資料二內容（以簡短段落、對話、列點形式）" }
  },
  "markingScheme": {
    "contentInfo": { "title": "內容訊息（2分）", "table": [{"item": "項目", "description": "說明"}] },
    "contentDevelopment": { "title": "內容發展（8分）", "table": [{"item": "項目", "description": "說明", "score": "分數"}] },
    "formatRequirements": { "title": "格式要求", "table": [{"item": "項目", "requirement": "要求", "score": "扣分"}] }
  },
  "modelEssay": "示範文章（字數不得超過599字）"
}

請以JSON格式返回，不要包含任何markdown代碼塊標記。`;

  let messages;
  
  if (fileData && fileType && fileType.startsWith('image/')) {
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請分析這張模擬卷圖片，理解其主題，然後生成一份全新的模擬卷。' },
          { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
        ]
      }
    ];
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `請根據以下模擬卷內容生成新模擬卷：\n\n${text || ''}` }
    ];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OpenAI API 返回內容為空');
  }

  const result = JSON.parse(content);
  return {
    examPaper: result.examPaper || {
      title: 'DSE 中文卷二甲部：實用寫作',
      time: '45分鐘',
      marks: '50分',
      instructions: [],
      question: '',
      material1: { title: '', content: '' },
      material2: { title: '', content: '' },
    },
    markingScheme: result.markingScheme || {
      content: { infoPoints: [], developmentPoints: [] },
      organization: { formatRequirements: [], toneRequirements: [] },
    },
  };
}

async function analyzeClassWithOpenAI(apiKey, modelName, reports, question, gradingMode = 'secondary') {
  const model = modelName || 'gpt-4o';
  
  const stats = {
    totalStudents: reports.length,
    averageScore: reports.reduce((sum, r) => sum + r.totalScore, 0) / reports.length,
  };

  let systemPrompt;
  if (gradingMode === 'primary') {
    systemPrompt = `你是一位專業的香港小學中文科教師，正在分析全班學生的寫作表現。請以JSON格式返回分析結果。`;
  } else if (gradingMode === 'practical') {
    systemPrompt = `你是一位專業的香港中學中文科教師，正在分析全班學生的實用寫作表現。請以JSON格式返回分析結果。`;
  } else {
    systemPrompt = `你是一位專業的香港中學中文科教師，正在分析全班學生的寫作表現。請以JSON格式返回分析結果。`;
  }

  const userPrompt = `請分析以下全班寫作數據：

## 題目
${question}

## 統計數據
- 總人數: ${stats.totalStudents}
- 平均分: ${stats.averageScore.toFixed(1)}

## 學生分數詳情
${reports.map(r => `- ${r.studentWork?.name || '未命名'}: 總分${r.totalScore}`).join('\n')}

請以專業教師的角度進行分析，並以JSON格式返回結果。`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('OpenAI API 返回內容為空');
  }

  return JSON.parse(content);
}

// ============ 自定義 API 函數 ============

async function testCustomConnection(apiKey, baseURL, modelName) {
  try {
    const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
    
    const response = await fetch(`${normalizedURL}/models`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const availableModels = data.data?.map(m => m.id) || [];
    const isModelAvailable = availableModels.some(m => m === modelName);

    return {
      success: true,
      message: isModelAvailable 
        ? `API 連接成功！模型 "${modelName}" 可用`
        : `API 連接成功！但模型 "${modelName}" 可能不可用`,
      model: modelName
    };
  } catch (error) {
    return handleOpenAIError(error, modelName);
  }
}

async function extractWithCustom(apiKey, baseURL, modelName, fileData, text, fileType) {
  const model = modelName || 'gpt-4o';
  const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
  
  // 檢查是否為 Word 文件
  const isWord = fileType && (
    fileType === 'application/msword' || 
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType.includes('word') ||
    fileType.includes('doc')
  );
  
  // 如果是 Word 文件，必須使用 mammoth 提取文本
  if (isWord && fileData) {
    if (!mammoth) {
      throw new Error('Word 文件處理需要 mammoth 庫，請確保已安裝 mammoth 套件 (npm install mammoth)');
    }
    try {
      console.log('Processing Word file with mammoth (Custom API)');
      const buffer = Buffer.from(fileData, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      console.log('Word file extracted, length:', result.value.length);
      text = result.value;
      fileData = null;
    } catch (wordError) {
      console.error('Mammoth extraction failed:', wordError);
      throw new Error(`無法提取 Word 文件內容: ${wordError.message}`);
    }
  }
  
  const systemPrompt = `你是一個專業的OCR文字識別助手。請從圖片或文檔中提取學生的作文文字。

提取要求：
1. 保持原文的段落格式
2. 識別學生姓名和學號（通常在文章開頭或標題處）
3. 只提取作文正文，不要包含題目（除非題目是文章的一部分）
4. 保持所有標點符號
5. 不要修改任何文字，包括錯別字

請以JSON格式返回：
{
  "articles": [
    {
      "text": "作文全文",
      "name": "學生姓名（如無則留空）",
      "studentId": "學生學號（如無則留空）"
    }
  ]
}`;

  let messages;
  
  if (fileData && fileType && fileType.startsWith('image/')) {
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請提取這張圖片中的學生作文文字，並識別姓名和學號。' },
          { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
        ]
      }
    ];
  } else {
    const content = text || '';
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `請提取以下文本中的學生作文內容：\n\n${content}` }
    ];
  }

  const response = await fetch(`${normalizedURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('API 返回內容為空');
  }

  const result = JSON.parse(content);
  
  if (result.articles && Array.isArray(result.articles) && result.articles.length > 0) {
    const firstArticle = result.articles[0];
    return {
      text: firstArticle.text || '',
      name: firstArticle.name || '',
      studentId: firstArticle.studentId || '',
      articles: result.articles
    };
  }
  
  return {
    text: result.text || '',
    name: result.name || '',
    studentId: result.studentId || ''
  };
}

async function extractQuestionCriteriaWithCustom(apiKey, baseURL, modelName, fileData, text, fileType) {
  const model = modelName || 'gpt-4o';
  const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
  
  const systemPrompt = `你是一個專業的教育文件分析助手。請從文件中提取作文題目和評分準則。

請以JSON格式返回：
{
  "question": "提取的題目內容",
  "criteria": "提取的評分準則（如無則為空字符串）"
}`;

  let messages;
  
  if (fileData && fileType && fileType.startsWith('image/')) {
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請分析這張圖片，提取題目和評分準則。' },
          { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
        ]
      }
    ];
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `請分析以下內容：\n\n${text || ''}` }
    ];
  }

  const response = await fetch(`${normalizedURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('API 返回內容為空');
  }

  return JSON.parse(content);
}

async function gradeWithCustom(apiKey, baseURL, modelName, essayText, question, customCriteria, gradingMode = 'secondary', contentPriority = false, enhancementDirection = 'auto', genre = '', infoPoints = [], devItems = {}, formatRequirements = []) {
  const model = modelName || 'gpt-4o';
  const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
  
  const systemPrompt = buildGradingPrompt(gradingMode, contentPriority, enhancementDirection, genre, infoPoints, devItems, formatRequirements);
  const userPrompt = buildUserPrompt(essayText, question, customCriteria, gradingMode, genre);

  const response = await fetch(`${normalizedURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('API 返回內容為空');
  }

  return parseGradingResult(content, essayText, gradingMode);
}

async function generatePracticalExamWithCustom(apiKey, baseURL, modelName, fileData, text, fileType, genre, clientSystemPrompt) {
  const model = modelName || 'gpt-4o';
  const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
  
  const genreNames = {
    speech: '演講辭',
    letter: '書信/公開信',
    proposal: '建議書',
    report: '報告',
    commentary: '評論文章',
    article: '專題文章'
  };

  const systemPrompt = (clientSystemPrompt || '') + `

你是一位專業的DSE中文科試題設計專家。請分析用戶上傳的模擬卷，理解其主題和結構，然後生成一份全新的模擬卷。

【重要要求】
1. 新模擬卷必須保持與原卷相同的主題/主題方向
2. 但內容必須完全不同（不同的情境、不同的資料、不同的具體要求）
3. 用戶選擇的文體是：${genreNames[genre] || genre}
4. 新模擬卷必須符合該文體的格式要求

【資料內容格式要求 - 必須遵守】
- 資料內容必須以簡短段落、對話、列點的形式呈現
- 不要使用一大段的連續文字
- 可以使用：簡短對話、要點列舉、分段說明、表格數據等形式
- 每個資料內容約200-300字，分為多個小段落

【評分參考格式要求 - 必須遵守】
- 內容訊息（2分）：以表格形式列出各項內容要點，包括主題、背景、意義等
- 內容發展（8分）：以表格形式列出各項內容細項、意見、回應等
- 格式要求：以表格形式列出格式評分標準
- 行文組織的評分不用呈現

【示範文章要求】
- 示範文章總字數不得超過550字
- 文章結構要求：
  * 開首：不多於80字（簡潔引入主題）
  * 第二段：約200字（主要論點/內容發展）
  * 第三段：約200字（進一步闡述/例子）
  * 結尾：不多於70字（簡潔總結）
- 必須符合該文體的格式要求
- 能獲得高分的完整文章

【輸出格式 - 必須是有效的JSON】
{
  "examPaper": {
    "title": "試卷標題",
    "time": "考試時間",
    "marks": "佔分",
    "instructions": ["考生須知1", "考生須知2"],
    "question": "題目描述",
    "material1": { "title": "資料一標題", "content": "資料一內容（以簡短段落、對話、列點形式）" },
    "material2": { "title": "資料二標題", "content": "資料二內容（以簡短段落、對話、列點形式）" }
  },
  "markingScheme": {
    "contentInfo": { "title": "內容訊息（2分）", "table": [{"item": "項目", "description": "說明"}] },
    "contentDevelopment": { "title": "內容發展（8分）", "table": [{"item": "項目", "description": "說明", "score": "分數"}] },
    "formatRequirements": { "title": "格式要求", "table": [{"item": "項目", "requirement": "要求", "score": "扣分"}] }
  },
  "modelEssay": "示範文章（字數不得超過599字）"
}

請以JSON格式返回，不要包含任何markdown代碼塊標記。`;

  let messages;
  
  if (fileData && fileType && fileType.startsWith('image/')) {
    messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請分析這張模擬卷圖片，生成新模擬卷。' },
          { type: 'image_url', image_url: { url: `data:${fileType};base64,${fileData}` } }
        ]
      }
    ];
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `請根據以下模擬卷內容生成新模擬卷：\n\n${text || ''}` }
    ];
  }

  const response = await fetch(`${normalizedURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('API 返回內容為空');
  }

  const result = JSON.parse(content);
  return {
    examPaper: result.examPaper || {
      title: 'DSE 中文卷二甲部：實用寫作',
      time: '45分鐘',
      marks: '50分',
      instructions: [],
      question: '',
      material1: { title: '', content: '' },
      material2: { title: '', content: '' },
    },
    markingScheme: result.markingScheme || {
      content: { infoPoints: [], developmentPoints: [] },
      organization: { formatRequirements: [], toneRequirements: [] },
    },
  };
}

async function analyzeClassWithCustom(apiKey, baseURL, modelName, reports, question, gradingMode = 'secondary') {
  const model = modelName || 'gpt-4o';
  const normalizedURL = baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`;
  
  const stats = {
    totalStudents: reports.length,
    averageScore: reports.reduce((sum, r) => sum + r.totalScore, 0) / reports.length,
  };

  let systemPrompt;
  if (gradingMode === 'primary') {
    systemPrompt = `你是一位專業的香港小學中文科教師，正在分析全班學生的寫作表現。請以JSON格式返回分析結果。`;
  } else if (gradingMode === 'practical') {
    systemPrompt = `你是一位專業的香港中學中文科教師，正在分析全班學生的實用寫作表現。請以JSON格式返回分析結果。`;
  } else {
    systemPrompt = `你是一位專業的香港中學中文科教師，正在分析全班學生的寫作表現。請以JSON格式返回分析結果。`;
  }

  const userPrompt = `請分析以下全班寫作數據：

## 題目
${question}

## 統計數據
- 總人數: ${stats.totalStudents}
- 平均分: ${stats.averageScore.toFixed(1)}

## 學生分數詳情
${reports.map(r => `- ${r.studentWork?.name || '未命名'}: 總分${r.totalScore}`).join('\n')}

請以專業教師的角度進行分析，並以JSON格式返回結果。`;

  const response = await fetch(`${normalizedURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API 請求失敗');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('API 返回內容為空');
  }

  return JSON.parse(content);
}

// ============ 錯誤處理函數 ============

function handleGeminiError(error, modelName) {
  const message = error.message || '未知錯誤';
  
  if (message.includes('quota') || message.includes('exceeded') || message.includes('429')) {
    return { success: false, message: 'Gemini API 配額已用完，請檢查您的 Google AI Studio 配額或稍後再試' };
  }
  
  if (message.includes('not found') || message.includes('model')) {
    return { success: false, message: `模型 "${modelName}" 不存在或無權訪問，請確認模型名稱正確` };
  }
  
  if (message.includes('401') || message.includes('Unauthorized') || message.includes('API key not valid')) {
    return { success: false, message: 'API 密鑰無效，請檢查您的 Gemini API 密鑰是否正確' };
  }
  
  if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
    return { success: false, message: '無法連接到 Gemini 服務器，請檢查網絡連接' };
  }
  
  if (message.includes('token') || message.includes('Token') || message.includes('1048576')) {
    return { success: false, message: '輸入內容太長，超過了 Token 限制。請嘗試：1) 使用更小的文件 2) 分段處理 3) 使用支持更大上下文的模型' };
  }
  
  return { success: false, message: `連接失敗: ${message}` };
}

function handleOpenAIError(error, modelName) {
  const message = error.message || '未知錯誤';
  
  if (message.includes('quota') || message.includes('exceeded') || message.includes('429')) {
    return { success: false, message: 'API 配額已用完，請檢查您的賬戶配額' };
  }
  
  if (message.includes('not found') || message.includes('model')) {
    return { success: false, message: `模型 "${modelName}" 不存在或無權訪問` };
  }
  
  if (message.includes('401') || message.includes('Unauthorized')) {
    return { success: false, message: 'API 密鑰無效，請檢查您的 API 密鑰' };
  }
  
  if (message.includes('token') || message.includes('Token')) {
    return { success: false, message: '輸入內容太長，超過了 Token 限制。請嘗試：1) 使用更小的文件 2) 分段處理 3) 使用支持更大上下文的模型' };
  }
  
  return { success: false, message: `連接失敗: ${message}` };
}

// ============ Prompt 和解析函數 ============

function buildGradingPrompt(gradingMode = 'secondary', contentPriority = false, enhancementDirection = 'auto', genre = '', infoPoints = [], devItems = {}, formatRequirements = []) {
  if (gradingMode === 'primary') {
    return buildPrimaryGradingPrompt();
  } else if (gradingMode === 'practical') {
    return buildPracticalGradingPrompt(genre, infoPoints, devItems, formatRequirements);
  } else {
    return buildSecondaryGradingPrompt(contentPriority, enhancementDirection);
  }
}

function buildSecondaryGradingPrompt(contentPriority = false, enhancementDirection = 'auto') {
  const enhancementInstruction = enhancementDirection === 'narrative' 
    ? '增潤時優先考慮記敘和抒情元素，讓文章更有情感感染力'
    : enhancementDirection === 'argumentative'
    ? '增潤時優先考慮說理和論證元素，讓文章更有說服力'
    : enhancementDirection === 'descriptive'
    ? '增潤時優先考慮描寫元素（景物描寫或人物描寫），讓文章更具畫面感和形象性'
    : '根據文章類型自動判斷增潤方向（景物描寫/人物描寫/記敘抒情/議論說理）';

  const contentPriorityInstruction = contentPriority 
    ? '【以內容為主評分】請優先根據內容質量給分，結構分數可根據內容表現適度調整，但內容與結構分數一般不應相差超過2級' 
    : '【標準評分】請按照HKDSE標準評分準則進行評分';

  return `你是一位專業的香港中學中文科教師，正在批改HKDSE中文卷二乙部命題寫作。

${contentPriorityInstruction}

## 評分準則（必須嚴格遵守）

### 內容（40分）- 品第制 1-10分
評分重點：立意深度、取材恰當度、闡述飽滿度

具體標準：
- 上上(10分): 立意極豐富深刻，取材極恰當，闡述極飽滿。能深入探討題目，觀點獨到，例子精準有力。
- 上中(9分): 立意極豐富尚算深刻，取材極恰當，闡述飽滿。觀點清晰，論證充分。
- 上下(8分): 立意豐富尚算深刻，取材恰當，闡述飽滿。有個人見解，例子適切。
- 中上(7分): 立意平穩具體，取材合理平穩，闡述合理。符合題目要求，內容完整。
- 中中上(6分): 立意一般恰當，取材一般，闡述一般。基本符合題目，但深度不足。
- 中中下(5分): 立意尚具單薄，取材單薄，闡述浮淺。內容簡單，缺乏深度。
- 中下(4分): 立意十分單薄，取材薄弱，闡述極浮淺。內容貧乏。
- 下上(3分): 立意模糊不太相干，取材不扣連，闡述欠奉。偏離題目。
- 下中(2分): 立意十分模糊錯亂，取材混亂，闡述空泛。嚴重離題。
- 下下(1分): 無立意或錯亂極多，取材闡述闕如。完全離題或無法理解。

### 表達（30分）- 品第制 1-10分
評分重點：詞彙運用、文句流暢度、修辭手法

具體標準：
- 上上(10分): 用詞極精確豐富，文句極簡潔流暢，手法純熟靈活。詞藻優美，句式多變，修辭恰當。
- 上中(9分): 用詞極精確豐富，文句極簡潔流暢，手法純熟。
- 上下(8分): 用詞精確豐富，文句簡潔流暢，手法靈活。
- 中上(7分): 用詞準確平穩，文句通順偶有瑕疵，手法尚算靈活。
- 中中上(6分): 用詞大致準確，文句大致通順有沙石，表達一般。
- 中中下(5分): 用詞尚算準確，文句尚算通順有明顯語病，表達浮淺。
- 中下(4分): 用詞粗疏，文句不通順失誤多，表達薄弱。
- 下上(3分): 用詞不準，文句欠通順，表達混亂。
- 下中(2分): 用詞句式嚴重錯誤，表達極混亂。
- 下下(1分): 文句無法達意。

### 結構（20分）- 品第制 1-10分
評分重點：結構完整性、詳略安排、鋪排有序

具體標準：
- 上上(10分): 結構極完整，詳略極得宜，鋪排主次有序。起承轉合自然，段落分明。
- 上中(9分): 結構極完整，詳略得宜，鋪排有序。
- 上下(8分): 結構完整，詳略得宜，鋪排有序。
- 中上(7分): 結構大致完整，詳略大致合宜，過渡尚算自然。
- 中中上(6分): 結構尚具完整，詳略一般有輕微失衡。
- 中中下(5分): 結構尚具，詳略稍失衡，偶有散亂。
- 中下(4分): 尚具組織，詳略明顯失衡，鋪排失當。
- 下上(3分): 組織散亂，詳略嚴重失衡。
- 下中(2分): 毫無組織，鋪排極混亂。
- 下下(1分): 完全無結構。

### 標點（10分）- 5-10分
- 10分: 標點符號運用正確無誤
- 9分: 偶有失誤（1-2處）
- 8分: 有少許失誤（3-4處）
- 7分: 有失誤（5-6處）
- 6分: 失誤較多（7-8處）
- 5分: 有明顯問題（9處以上）

## 核心評分準則（必須嚴格遵守）
1. 【離題扣分規則】如文章離題，內容分數不應高於下上品（即不高於3分）
2. 內容與結構分數一般不應相差超過2級
3. 若內容離題（3分及以下），結構最高只能評至7分
4. 標點分數下限為5分
5. 請根據文章的實際表現給分，不要過度寬鬆或嚴苛

## 增潤文章要求（重要）
${enhancementInstruction}
- **保留選材扣題**：增潤時必須保留學生原有的選材，但將其修整得符合題目要求，不能替換為全新素材
- 增潤後的文章應保持學生的原意和風格
- 修正語病和錯別字
- 提升表達質量，但避免過度堆砌詞藻
- 保持人文情懷，避免AI感

## 輸出格式
請以JSON格式返回，確保所有字段都存在：
{
  "grading": {
    "content": 6,
    "expression": 6,
    "structure": 6,
    "punctuation": 7
  },
  "overallComment": "簡潔易明的總評，2-3段，指出主要優點和可改善之處",
  "contentFeedback": {
    "strengths": ["內容優點1", "內容優點2"],
    "improvements": ["內容改善建議1", "內容改善建議2"]
  },
  "expressionFeedback": {
    "strengths": ["表達優點1", "表達優點2"],
    "improvements": ["表達改善建議1", "表達改善建議2"]
  },
  "structureFeedback": {
    "strengths": ["結構優點1", "結構優點2"],
    "improvements": ["結構改善建議1", "結構改善建議2"]
  },
  "punctuationFeedback": {
    "strengths": ["標點優點"],
    "improvements": ["標點改善建議"]
  },
  "enhancedText": "增潤後的完整文章，避免AI堆砌感，要有人文情懷",
  "enhancementNotes": ["修改說明1：具體說明修改了什麼", "修改說明2"],
  "modelEssay": "一篇符合HKDSE上上品標準的奪星文章示範，展示如何更好地處理這個題目"
}`;
}

function buildPrimaryGradingPrompt() {
  return `你是一位專業的香港小學中文科教師，正在批改小學命題寫作。

## 評分準則（必須嚴格遵守）

### 切題與內容（30分）- 等級制 0-4級
評分重點：切合題旨、內容具體、素材運用

具體標準：
- 4級(24-30分): 內容切題，具體充實，能圍繞主題展開，有適當的例子和細節
- 3級(18-23分): 內容大致切題，尚算具體，能圍繞主題但深度不足
- 2級(9-17分): 內容尚切題但不夠具體，有離題或空洞的情況
- 1級(1-8分): 內容不切題或過於簡略，嚴重離題或內容貧乏
- 0級(0分): 完全沒有內容或完全離題

### 感受與立意（20分）- 等級制 0-4級
評分重點：情感真摯、立意清晰、個人體會

具體標準：
- 4級(16-20分): 感受真摯深刻，立意清晰，有個人獨特體會
- 3級(12-15分): 感受真摯，立意尚清晰，有個人體會
- 2級(6-11分): 感受一般，立意不夠清晰，體會較淺
- 1級(1-5分): 感受虛假或缺乏，立意模糊，沒有個人體會
- 0級(0分): 完全沒有感受或立意

### 組織與結構（20分）- 等級制 0-4級
評分重點：段落分明、详略得當、過渡自然

具體標準：
- 4級(16-20分): 結構完整，段落分明，详略得當，過渡自然
- 3級(12-15分): 結構尚完整，段落尚分明，详略大致得當
- 2級(6-11分): 結構一般，段落不夠分明，详略有失衡
- 1級(1-5分): 結構散亂，段落不清，详略嚴重失衡
- 0級(0分): 完全沒有結構

### 語言運用（20分）- 等級制 0-4級
評分重點：詞彙運用、句式多樣、文句通順

具體標準：
- 4級(16-20分): 詞彙豐富，句式多樣，文句流暢，修辭恰當
- 3級(12-15分): 詞彙尚豐富，句式有變化，文句通順
- 2級(6-11分): 詞彙一般，句式單一，文句有語病
- 1級(1-5分): 詞彙貧乏，句式單調，文句不通
- 0級(0分): 完全無法表達

### 文類與格式（10分）- 等級制 0-4級
評分重點：符合文類要求、格式正確

具體標準：
- 4級(8-10分): 完全符合文類要求，格式正確
- 3級(6-7分): 大致符合文類要求，格式大致正確
- 2級(3-5分): 尚算符合文類要求，格式有錯誤
- 1級(1-2分): 不符合文類要求，格式錯誤嚴重
- 0級(0分): 完全不符合文類要求

## 輸出格式
請以JSON格式返回：
{
  "grading": {
    "content": 3,
    "feeling": 3,
    "structure": 3,
    "language": 3,
    "format": 3
  },
  "overallComment": "簡潔易明的總評",
  "contentFeedback": {
    "strengths": ["優點1"],
    "improvements": ["改善建議1"]
  },
  "feelingFeedback": {
    "strengths": ["優點1"],
    "improvements": ["改善建議1"]
  },
  "structureFeedback": {
    "strengths": ["優點1"],
    "improvements": ["改善建議1"]
  },
  "languageFeedback": {
    "strengths": ["優點1"],
    "improvements": ["改善建議1"]
  },
  "formatFeedback": {
    "strengths": ["優點1"],
    "improvements": ["改善建議1"]
  },
  "enhancedText": "增潤後的文章",
  "enhancementNotes": ["修改說明1"],
  "modelEssay": "示範文章"
}`;
}

function buildPracticalGradingPrompt(genre = '', infoPoints = [], devItems = {}, formatRequirements = []) {

  // 文體名稱對照
  const genreNames = {
    speech: '演講辭', letter: '書信／公開信', proposal: '建議書',
    report: '報告', commentary: '評論文章', article: '專題文章'
  };
  const genreName = genreNames[genre] || genre || '實用文';

  // 行文語氣效果（按文體）
  const toneGuide = {
    speech:     '以「說明效果」為主：語氣親切，具感染力，能有效游說聽眾支持計劃。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；態度冷靜得體，修飾恰當，說明效果佳，頗能吸引聽眾關注。\n- 7–8分：措詞準確，行文達意流暢；態度冷靜，頗能說明計劃。\n- 5–6分：措詞大致準確，行文大致達意；態度尚算冷靜，說明效果一般。\n- 3–4分：措詞大致準確，行文達意；語氣頗多不當。\n- 1–2分：措詞、行文未能達意；語氣極多不當。\n- 0分：空白卷或答案完全錯誤。',
    letter:     '以「游說／呼籲效果」為主（自薦信則以「自薦效果」為主）：語氣誠懇有禮，符合書信場合。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；態度誠懇，修飾恰當，游說效果佳。\n- 7–8分：措詞準確，行文達意流暢；態度誠懇，頗具游說效果。\n- 5–6分：措詞大致準確，行文大致達意；態度尚算誠懇，游說效果一般。\n- 3–4分：措詞大致準確，行文達意；語氣頗多不當。\n- 1–2分：措詞、行文未能達意；語氣極多不當。\n- 0分：空白卷或答案完全錯誤。',
    proposal:   '以「說服效果」為主：語氣客觀正式，建議具體可行，具說服力。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；態度客觀，建議具體，說服效果佳。\n- 7–8分：措詞準確，行文達意流暢；態度客觀，頗具說服效果。\n- 5–6分：措詞大致準確，行文大致達意；說服效果一般。\n- 3–4分：措詞大致準確，行文達意；語氣頗多不當。\n- 1–2分：措詞、行文未能達意；語氣極多不當。\n- 0分：空白卷或答案完全錯誤。',
    report:     '以「客觀匯報效果」為主：語氣正式客觀，資料呈現清晰有條理，避免主觀情感語句。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；語氣客觀正式，資料呈現清晰，匯報效果佳。\n- 7–8分：措詞準確，行文達意流暢；語氣客觀，匯報效果頗佳。\n- 5–6分：措詞大致準確，行文大致達意；語氣尚算客觀，匯報效果一般。\n- 3–4分：措詞大致準確，行文達意；語氣頗多不當。\n- 1–2分：措詞、行文未能達意；語氣極多不當。\n- 0分：空白卷或答案完全錯誤。',
    commentary: '以「論證效果」為主：語氣客觀持平，立場清晰，論證有力。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；立場清晰，論證有力，論證效果佳。\n- 7–8分：措詞準確，行文達意流暢；立場大致清晰，論證效果頗佳。\n- 5–6分：措詞大致準確，行文大致達意；論證效果一般。\n- 3–4分：措詞大致準確，行文達意；語氣頗多不當。\n- 1–2分：措詞、行文未能達意；語氣極多不當。\n- 0分：空白卷或答案完全錯誤。',
    article:    '以「說明效果」為主：語氣客觀，有說服力，能有效呼籲讀者。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；語氣客觀，說明清晰，頗能呼籲讀者。\n- 7–8分：措詞準確，行文達意流暢；語氣尚算客觀，說明效果頗佳。\n- 5–6分：措詞大致準確，行文大致達意；說明效果一般。\n- 3–4分：措詞大致準確，行文達意；語氣頗多不當。\n- 1–2分：措詞、行文未能達意；語氣極多不當。\n- 0分：空白卷或答案完全錯誤。',
  };
  const toneSection = toneGuide[genre] || '語氣須切合文體、對象及場合，以措詞行文為主。\n評分標準：\n- 9–10分：措詞準確，行文簡潔流暢；語氣切合文體，效果佳。\n- 7–8分：措詞準確，行文達意流暢；語氣大致切合文體。\n- 5–6分：措詞大致準確，行文大致達意；語氣尚算切合。\n- 1–2分：措詞、行文未能達意；語氣頗多不當。\n- 0分：空白卷或答案完全錯誤。';

  // 資訊分考核項目
  const infoCount = infoPoints.length || 3;
  const infoList = infoPoints.length > 0
    ? infoPoints.map((p, i) => `  ${i + 1}. ${p}`).join('\n')
    : '  1. 計劃名稱／活動名稱\n  2. 計劃目的／背景\n  3. 寫作身份／動機';
  const infoScoreDesc = `以下 ${infoCount} 項資料齊全得 2 分；只有 ${infoCount - 1} 項得 1 分；${infoCount - 2} 項或以下得 0 分。`;

  // 內容發展細項
  const devDefaults = {
    speech:     { label: '2項措施、4個措施細項、3項同學意見', fullCount: '2項措施＋4個措施細項＋3項同學意見', partCount: '部分細項' },
    letter:     { label: '2項個人條件、4個條件細項、3項同學意見', fullCount: '2項個人條件＋4個條件細項＋3項同學意見', partCount: '部分細項' },
    proposal:   { label: '2個建議、4個建議細項、3項同學意見', fullCount: '2個建議＋4個建議細項＋3項同學意見', partCount: '部分細項' },
    report:     { label: '2個調查類別、4個調查意見、2個改善建議', fullCount: '2個調查類別＋4個調查意見＋2個改善建議', partCount: '部分類別或意見' },
    commentary: { label: '2個目標、4項活動、4項同學意見', fullCount: '2個目標＋4項活動＋4項同學意見', partCount: '部分細項' },
    article:    { label: '2個目標、4項活動細項、4項意見', fullCount: '2個目標＋4項活動細項＋4項意見', partCount: '部分細項' },
  };
  const devDefault = devDefaults[genre] || { label: '相關細項', fullCount: '全部細項', partCount: '部分細項' };
  const devLabel = (devItems && devItems.label) ? devItems.label : devDefault.label;
  const devFull = (devItems && devItems.fullCount) ? devItems.fullCount : devDefault.fullCount;
  const devPart = (devItems && devItems.partCount) ? devItems.partCount : devDefault.partCount;

  // 格式要求
  const formatDefaults = {
    speech:     ['稱謂（先尊後卑）', '自我介紹', '文末致謝語（多謝各位）'],
    letter:     ['上款／稱謂', '署名及啟告語', '日期'],
    proposal:   ['上款', '標題（置中）', '署名', '日期'],
    report:     ['稱謂／上款', '標題（置中）', '署名及啟告語', '日期'],
    commentary: ['標題', '署名及身份'],
    article:    ['標題', '署名及身份'],
  };
  const formatItems = (formatRequirements && formatRequirements.length > 0)
    ? formatRequirements
    : (formatDefaults[genre] || ['相關格式元素']);
  const formatList = formatItems.map(f => `  • ${f}`).join('\n');

  return `你是一位專業的香港中學中文科教師，正在批改HKDSE中文卷二甲部（${genreName}）實用寫作。
所有評語必須使用繁體中文。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
評分準則（必須嚴格遵守）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
總分：50分
內容（30分）= （資訊分 + 內容發展分）× 3
行文語氣（10分）
組織（10分）

━━━━━━━━━━━━
一、資訊分（最高 2 分）
━━━━━━━━━━━━
評分邏輯：${infoScoreDesc}
必須涵蓋的背景資訊項目：
${infoList}

評分說明：
- 2分：以上全部項目均提及，且準確
- 1分：只提及其中 ${infoCount - 1} 項
- 0分：只提及 ${infoCount - 2} 項或以下，或完全沒有

━━━━━━━━━━━━
二、內容發展分（最高 8 分）
━━━━━━━━━━━━
本題具體細項要求：${devLabel}

評分標準：
┌──────────────────────────────┬──────────────────────────────────────────┬──────┐
│ 內容項目                     │ 觀點、闡述                               │ 分數 │
├──────────────────────────────┼──────────────────────────────────────────┼──────┤
│ 齊全（${devFull}）           │ 針對性回應；觀點明確合理；理據充足，     │ 7–8分│
│                              │ 闡述周全。                               │      │
│                              │ 一般回應；觀點大致明確合理；理據、       │ 5–6分│
│                              │ 闡述一般。                               │      │
│                              │ 部分回應；觀點模糊／不合理。             │ 3–4分│
│                              │ 甚少回應／缺回應；觀點極不合理。         │ 1–2分│
├──────────────────────────────┼──────────────────────────────────────────┼──────┤
│ 大致齊全（${devPart}）       │ 針對性回應；觀點明確合理；理據充足，     │ 5–6分│
│                              │ 闡述周全。                               │      │
│                              │ 一般回應；觀點大致明確合理；理據、       │ 3–4分│
│                              │ 闡述一般。                               │      │
│                              │ 甚少回應／缺回應；觀點極不合理。         │ 1–2分│
├──────────────────────────────┼──────────────────────────────────────────┼──────┤
│ 少量、不齊全（極少細項）     │ 針對性回應；觀點明確合理；理據充足，     │ 3–4分│
│                              │ 闡述清晰。                               │      │
│                              │ 部分回應；觀點模糊／不合理。             │ 1–2分│
├──────────────────────────────┼──────────────────────────────────────────┼──────┤
│ 欠缺                         │ 甚少回應／缺回應；觀點闕如／極不合理。  │ 0分  │
└──────────────────────────────┴──────────────────────────────────────────┴──────┘

評分時必須：
1. 先判斷學生涵蓋了哪些細項（齊全／大致齊全／少量不齊全／欠缺）
2. 再根據回應質量（觀點、理據、闡述）在對應分數範圍內給分
3. 重點評估學生能否把資料一的細項與資料二的情境交織回應，並加以合理拓展

━━━━━━━━━━━━
三、行文語氣（最高 10 分）
━━━━━━━━━━━━
文體：${genreName}
${toneSection}

━━━━━━━━━━━━
四、組織（最高 10 分）
━━━━━━━━━━━━
評分重點：結構完整性、詳略得宜、要點扣連

格式核對（欠缺以下必備格式元素須扣分）：
${formatList}
扣分規則：欠缺 1–2 項扣 1 分；欠缺 3 項或以上扣 2 分；添加多餘格式（如不應有的祝頌語、日期等）扣 2 分

組織評分標準：
- 9–10分：結構完整；詳略得宜，鋪排有序；內容要點之間緊密扣連。（如有格式問題按上述規則扣分）
- 7–8分：結構完整；詳略得宜，鋪排有序。
- 5–6分：結構大致完整；詳略大致合宜，鋪排大致有序。
- 3–4分（尚完整）：結構完整；詳略得宜，鋪排有序。／結構大致完整；詳略大致合宜，鋪排大致有序。
- 1–2分：散亂／甚混亂：組織散亂；詳略失衡，鋪排失當。
- 0分：空白卷或毫無組織可言。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
輸出格式（必須是有效的JSON）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "grading": {
    "info": 2,
    "development": 6,
    "tone": 7,
    "organization": 8
  },
  "overallComment": "整體評語（繁體中文，3–5句）",
  "infoFeedback": {
    "strengths": ["優點（繁體中文）"],
    "improvements": ["改善建議（繁體中文）"]
  },
  "developmentFeedback": {
    "strengths": ["優點（繁體中文）"],
    "improvements": ["改善建議（繁體中文）"]
  },
  "toneFeedback": {
    "strengths": ["優點（繁體中文）"],
    "improvements": ["改善建議（繁體中文）"]
  },
  "organizationFeedback": {
    "strengths": ["優點（繁體中文）"],
    "improvements": ["改善建議（繁體中文）"]
  },
  "formatIssues": ["具體格式問題（繁體中文）"],
  "enhancedText": "增潤後的文章（繁體中文）",
  "enhancementNotes": ["修改說明（繁體中文）"],
  "modelEssay": "示範文章（繁體中文）"
}`;
}

function buildUserPrompt(essayText, question, customCriteria, gradingMode = 'secondary', genre = '') {
  const genreNames = {
    speech: '演講辭', letter: '書信／公開信', proposal: '建議書',
    report: '報告', commentary: '評論文章', article: '專題文章'
  };
  const genreNote = (gradingMode === 'practical' && genre)
    ? `
## 文體
${genreNames[genre] || genre}
` : '';

  return `請批改以下學生實用文（若為命題寫作則批改作文）：
${genreNote}
## 題目
${question || '（未提供題目）'}

## 學生作文
${essayText}

${customCriteria ? `## 上傳的評分準則（請結合系統評分準則一同使用）
${customCriteria}
` : ''}
請嚴格按照評分準則進行批改，給出具體、有建設性的繁體中文評語，並以JSON格式返回結果。`;
}

function parseGradingResult(content, essayText, gradingMode = 'secondary') {
  const result = safeJSONParse(content, 'grade');

  if (gradingMode === 'primary') {
    const grading = {
      content: Math.max(1, Math.min(4, Math.round(result.grading?.content || 3))),
      feeling: Math.max(1, Math.min(4, Math.round(result.grading?.feeling || 3))),
      structure: Math.max(1, Math.min(4, Math.round(result.grading?.structure || 3))),
      language: Math.max(1, Math.min(4, Math.round(result.grading?.language || 3))),
      format: Math.max(1, Math.min(4, Math.round(result.grading?.format || 3))),
    };

    const scoreTable = {
      content: [0, 9, 18, 24, 30],
      feeling: [0, 6, 12, 16, 20],
      structure: [0, 6, 12, 16, 20],
      language: [0, 6, 12, 16, 20],
      format: [0, 3, 6, 8, 10],
    };

    const totalScore = scoreTable.content[grading.content] + 
                      scoreTable.feeling[grading.feeling] +
                      scoreTable.structure[grading.structure] +
                      scoreTable.language[grading.language] +
                      scoreTable.format[grading.format];

    const buildFeedback = (fb) => ({
      strengths: Array.isArray(fb?.strengths) ? fb.strengths : [],
      improvements: Array.isArray(fb?.improvements) ? fb.improvements : []
    });

    return {
      grading,
      totalScore,
      gradeLevel: getPrimaryGradeLabel(totalScore),
      overallComment: result.overallComment || '',
      contentFeedback: buildFeedback(result.contentFeedback),
      feelingFeedback: buildFeedback(result.feelingFeedback),
      structureFeedback: buildFeedback(result.structureFeedback),
      languageFeedback: buildFeedback(result.languageFeedback),
      formatFeedback: buildFeedback(result.formatFeedback),
      enhancedText: result.enhancedText || essayText,
      enhancementNotes: Array.isArray(result.enhancementNotes) ? result.enhancementNotes : [],
      modelEssay: result.modelEssay || ''
    };
  } else if (gradingMode === 'practical') {
    const grading = {
      info: Math.max(0, Math.min(6, Math.round(result.grading?.info || 4))),
      development: Math.max(0, Math.min(16, Math.round(result.grading?.development || 10))),
      tone: Math.max(0, Math.min(10, Math.round(result.grading?.tone || 6))),
      organization: Math.max(0, Math.min(10, Math.round(result.grading?.organization || 6))),
    };

    const contentScore = (grading.info + grading.development);
    const organizationScore = grading.tone + grading.organization;
    const totalScore = contentScore + organizationScore;

    const buildFeedback = (fb) => ({
      strengths: Array.isArray(fb?.strengths) ? fb.strengths : [],
      improvements: Array.isArray(fb?.improvements) ? fb.improvements : []
    });

    return {
      grading,
      contentScore,
      organizationScore,
      totalScore,
      overallComment: result.overallComment || '',
      infoFeedback: buildFeedback(result.infoFeedback),
      developmentFeedback: buildFeedback(result.developmentFeedback),
      toneFeedback: buildFeedback(result.toneFeedback),
      organizationFeedback: buildFeedback(result.organizationFeedback),
      formatIssues: Array.isArray(result.formatIssues) ? result.formatIssues : [],
      enhancedText: result.enhancedText || essayText,
      enhancementNotes: Array.isArray(result.enhancementNotes) ? result.enhancementNotes : [],
      modelEssay: result.modelEssay || ''
    };
  } else {
    // secondary
    const grading = {
      content: Math.max(1, Math.min(10, Math.round(result.grading?.content || 6))),
      expression: Math.max(1, Math.min(10, Math.round(result.grading?.expression || 6))),
      structure: Math.max(1, Math.min(10, Math.round(result.grading?.structure || 6))),
      punctuation: Math.max(5, Math.min(10, Math.round(result.grading?.punctuation || 7)))
    };

    const totalScore = (grading.content * 4) + (grading.expression * 3) + 
                      (grading.structure * 2) + grading.punctuation;

    const buildFeedback = (fb) => ({
      strengths: Array.isArray(fb?.strengths) ? fb.strengths : [],
      improvements: Array.isArray(fb?.improvements) ? fb.improvements : []
    });

    const getGradeLabel = (score) => {
      if (score >= 90) return '上上';
      if (score >= 85) return '上中';
      if (score >= 80) return '上下';
      if (score >= 70) return '中上';
      if (score >= 60) return '中中';
      if (score >= 50) return '中下';
      if (score >= 40) return '下上';
      if (score >= 30) return '下中';
      if (score >= 10) return '下下';
      return '極差';
    };

    return {
      grading,
      totalScore,
      gradeLabel: getGradeLabel(totalScore),
      overallComment: result.overallComment || '',
      contentFeedback: buildFeedback(result.contentFeedback),
      expressionFeedback: buildFeedback(result.expressionFeedback),
      structureFeedback: buildFeedback(result.structureFeedback),
      punctuationFeedback: buildFeedback(result.punctuationFeedback),
      enhancedText: result.enhancedText || essayText,
      enhancementNotes: Array.isArray(result.enhancementNotes) ? result.enhancementNotes : [],
      modelEssay: result.modelEssay || ''
    };
  }
}

function getPrimaryGradeLabel(totalScore) {
  if (totalScore >= 85) return '優異';
  if (totalScore >= 70) return '良好';
  if (totalScore >= 50) return '一般';
  return '有待改善';
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`中文科批改系統 API 服務器`);
  console.log(`運行於端口: ${PORT}`);
  console.log(`========================================`);
});
