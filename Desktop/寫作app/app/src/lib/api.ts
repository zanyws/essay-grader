import type { 
  SecondaryReport, 
  PrimaryReport, 
  PracticalReport,
  GeneratedExam,
  APIConfig 
} from '@/types';

// API 類型
export type APIType = 'openai' | 'gemini' | 'custom';

// 後端服務器配置
export const BACKEND_URL = 'https://chinese-grading-server.onrender.com';

// Gemini 默認配置
export const GEMINI_CONFIG = {
  model: 'gemini-2.0-flash',
};

// OpenAI 默認配置
export const OPENAI_CONFIG = {
  model: 'gpt-4o',
};

// Deepseek 默認配置
export const DEEPSEEK_CONFIG = {
  model: 'deepseek-chat',
  baseURL: 'https://api.deepseek.com/v1',
};

// 檢查 API 是否可用
export function isAPIAvailable(apiKey: string): boolean {
  return !!apiKey && apiKey.length > 10;
}

// 測試 API 連接
export async function testAPIConnection(config: APIConfig): Promise<{
  success: boolean;
  message: string;
  model?: string;
}> {
  if (!isAPIAvailable(config.apiKey)) {
    return { success: false, message: 'API 密鑰無效或為空' };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey,
        apiType: config.apiType,
        model: config.model,
        baseURL: config.baseURL,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, message: data.message || '測試失敗' };
    }

    return data;
  } catch (error: any) {
    console.error('Test API connection error:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      return { 
        success: false, 
        message: `無法連接到後端服務器 (${BACKEND_URL})，請確認後端服務器已啟動` 
      };
    }
    
    return { success: false, message: `連接失敗: ${error.message || '未知錯誤'}` };
  }
}

// OCR 提取文字（支援多篇自動分辨）
export async function extractTextWithAPI(
  fileContent: string,
  fileType: string,
  config: APIConfig,
  ignoreRedInk: boolean = false
): Promise<{
  text: string;
  name: string;
  studentId: string;
  articles?: { text: string; name: string; studentId: string }[];
}> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');
    const useInlineData = isImage || isPDF;
    
    const requestBody: any = {
      apiKey: config.apiKey,
      apiType: config.apiType,
      model: config.model,
      baseURL: config.baseURL,
      fileType: fileType,
      ignoreRedInk: ignoreRedInk,
    };

    if (useInlineData) {
      const base64Data = fileContent.includes(',') 
        ? fileContent.split(',')[1] 
        : fileContent;
      requestBody.fileData = base64Data;
    } else {
      requestBody.text = fileContent;
    }

    const response = await fetch(`${BACKEND_URL}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '提取文字失敗');
    }

    return {
      text: data.text || '',
      name: data.name || '',
      studentId: data.studentId || '',
      articles: data.articles,
    };
  } catch (error: any) {
    console.error('Extract text error:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      throw new Error(`無法連接到後端服務器 (${BACKEND_URL})，請確認後端服務器已啟動`);
    }
    
    throw new Error(error.message || '提取文字失敗');
  }
}

// 中學命題寫作批改
export async function gradeSecondaryEssayWithAPI(
  essayText: string,
  question: string,
  customCriteria: string,
  config: APIConfig,
  options: {
    contentPriority?: boolean;
    enhancementDirection?: 'auto' | 'narrative' | 'argumentative' | 'descriptive';
  } = {}
): Promise<SecondaryReport> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey,
        apiType: config.apiType,
        model: config.model,
        baseURL: config.baseURL,
        essayText: essayText,
        question: question,
        customCriteria: customCriteria,
        gradingMode: 'secondary',
        contentPriority: options.contentPriority,
        enhancementDirection: options.enhancementDirection,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '批改失敗');
    }

    const grading = {
      content: Math.max(1, Math.min(10, Math.round(data.grading?.content || 6))) as 1|2|3|4|5|6|7|8|9|10,
      expression: Math.max(1, Math.min(10, Math.round(data.grading?.expression || 6))) as 1|2|3|4|5|6|7|8|9|10,
      structure: Math.max(1, Math.min(10, Math.round(data.grading?.structure || 6))) as 1|2|3|4|5|6|7|8|9|10,
      punctuation: Math.max(5, Math.min(10, Math.round(data.grading?.punctuation || 7))),
    };

    const totalScore = (grading.content * 4) + (grading.expression * 3) + 
                      (grading.structure * 2) + grading.punctuation;

    const buildFeedback = (fb: any) => ({
      strengths: Array.isArray(fb?.strengths) ? fb.strengths : [],
      improvements: Array.isArray(fb?.improvements) ? fb.improvements : [],
    });

    return {
      studentWork: {} as any,
      grading,
      totalScore,
      gradeLabel: getSecondaryGradeLabel(totalScore),
      overallComment: data.overallComment || '',
      contentFeedback: buildFeedback(data.contentFeedback),
      expressionFeedback: buildFeedback(data.expressionFeedback),
      structureFeedback: buildFeedback(data.structureFeedback),
      punctuationFeedback: buildFeedback(data.punctuationFeedback),
      enhancedText: data.enhancedText || essayText,
      enhancementNotes: Array.isArray(data.enhancementNotes) ? data.enhancementNotes : [],
      modelEssay: data.modelEssay || '',
    };
  } catch (error: any) {
    console.error('Grade essay error:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      throw new Error(`無法連接到後端服務器 (${BACKEND_URL})，請確認後端服務器已啟動`);
    }
    
    throw new Error(error.message || '批改失敗');
  }
}

// 小學命題寫作批改
export async function gradePrimaryEssayWithAPI(
  essayText: string,
  question: string,
  customCriteria: string,
  config: APIConfig
): Promise<PrimaryReport> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey,
        apiType: config.apiType,
        model: config.model,
        baseURL: config.baseURL,
        essayText: essayText,
        question: question,
        customCriteria: customCriteria,
        gradingMode: 'primary',
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '批改失敗');
    }

    const grading = {
      content: Math.max(1, Math.min(4, Math.round(data.grading?.content || 3))) as 1|2|3|4,
      feeling: Math.max(1, Math.min(4, Math.round(data.grading?.feeling || 3))) as 1|2|3|4,
      structure: Math.max(1, Math.min(4, Math.round(data.grading?.structure || 3))) as 1|2|3|4,
      language: Math.max(1, Math.min(4, Math.round(data.grading?.language || 3))) as 1|2|3|4,
      format: Math.max(1, Math.min(4, Math.round(data.grading?.format || 3))) as 1|2|3|4,
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

    const buildFeedback = (fb: any) => ({
      strengths: Array.isArray(fb?.strengths) ? fb.strengths : [],
      improvements: Array.isArray(fb?.improvements) ? fb.improvements : [],
    });

    return {
      studentWork: {} as any,
      grading,
      totalScore,
      gradeLevel: getPrimaryGradeLevel(totalScore),
      overallComment: data.overallComment || '',
      contentFeedback: buildFeedback(data.contentFeedback),
      feelingFeedback: buildFeedback(data.feelingFeedback),
      structureFeedback: buildFeedback(data.structureFeedback),
      languageFeedback: buildFeedback(data.languageFeedback),
      formatFeedback: buildFeedback(data.formatFeedback),
      enhancedText: data.enhancedText || essayText,
      enhancementNotes: Array.isArray(data.enhancementNotes) ? data.enhancementNotes : [],
      modelEssay: data.modelEssay || '',
    };
  } catch (error: any) {
    console.error('Grade primary essay error:', error);
    throw new Error(error.message || '批改失敗');
  }
}

// 實用寫作評分細項類型
export interface PracticalDevItems {
  label?: string;
  fullCount?: string;
  partCount?: string;
}

// 實用寫作批改
export async function gradePracticalEssayWithAPI(
  essayText: string,
  question: string,
  customCriteria: string,
  config: APIConfig,
  options: {
    genre?: string;
    infoPoints?: string[];
    devItems?: PracticalDevItems;
    formatRequirements?: string[];
  } = {}
): Promise<PracticalReport> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey,
        apiType: config.apiType,
        model: config.model,
        baseURL: config.baseURL,
        essayText: essayText,
        question: question,
        customCriteria: customCriteria,
        gradingMode: 'practical',
        genre: options.genre || '',
        infoPoints: options.infoPoints || [],
        devItems: options.devItems || {},
        formatRequirements: options.formatRequirements || [],
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '批改失敗');
    }

    const grading = {
      info: Math.max(0, Math.min(2, Math.round(data.grading?.info || 1))),
      development: Math.max(0, Math.min(8, Math.round(data.grading?.development || 5))),
      tone: Math.max(0, Math.min(10, Math.round(data.grading?.tone || 6))),
      organization: Math.max(0, Math.min(10, Math.round(data.grading?.organization || 6))),
    };

    const contentScore = (grading.info + grading.development) * 3;
    const organizationScore = grading.tone + grading.organization;
    const totalScore = contentScore + organizationScore;

    const buildFeedback = (fb: any) => ({
      strengths: Array.isArray(fb?.strengths) ? fb.strengths : [],
      improvements: Array.isArray(fb?.improvements) ? fb.improvements : [],
    });

    return {
      studentWork: {} as any,
      grading,
      contentScore,
      organizationScore,
      totalScore,
      overallComment: data.overallComment || '',
      infoFeedback: buildFeedback(data.infoFeedback),
      developmentFeedback: buildFeedback(data.developmentFeedback),
      toneFeedback: buildFeedback(data.toneFeedback),
      organizationFeedback: buildFeedback(data.organizationFeedback),
      formatIssues: Array.isArray(data.formatIssues) ? data.formatIssues : [],
      enhancedText: data.enhancedText || essayText,
      enhancementNotes: Array.isArray(data.enhancementNotes) ? data.enhancementNotes : [],
      modelEssay: data.modelEssay || '',
    };
  } catch (error: any) {
    console.error('Grade practical essay error:', error);
    throw new Error(error.message || '批改失敗');
  }
}

// 合併：提取學生作品文字 + 整理評分準則（題目/資料內容/評分準則），節省一次 API 請求
export async function extractAndOrganizeWithAPI(
  studentContent: { fileContent?: string; fileType?: string; text?: string },
  criteriaText: { pastedQuestion: string; pastedMaterial: string; pastedCriteria: string },
  config: APIConfig,
  ignoreRedInk: boolean = false
): Promise<{
  studentText: string;
  studentName: string;
  studentId: string;
  question: string;
  infoPoints: string[];
  devLabel: string;
}> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const { fileContent, fileType, text } = studentContent;
    const isImage = fileType?.startsWith('image/') ?? false;
    const isPDF = fileType === 'application/pdf' || (fileType?.includes('pdf') ?? false);
    const useInlineData = isImage || isPDF;

    const requestBody: any = {
      apiKey: config.apiKey,
      apiType: config.apiType,
      model: config.model,
      baseURL: config.baseURL,
      fileType: fileType || 'text/plain',
      ignoreRedInk,
      ...criteriaText,
    };

    if (fileContent && useInlineData) {
      requestBody.fileData = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
    } else if (text) {
      requestBody.text = text;
    } else if (fileContent) {
      requestBody.text = fileContent;
    }

    const response = await fetch(`${BACKEND_URL}/api/extract-and-organize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || '整理失敗');
    }

    return {
      studentText: data.studentText || '',
      studentName: data.studentName || '',
      studentId: data.studentId || '',
      question: data.question || '',
      infoPoints: data.infoPoints || [],
      devLabel: data.devLabel || '',
    };
  } catch (error: any) {
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      throw new Error(`無法連接到後端服務器 (${BACKEND_URL})，請確認後端服務器已啟動`);
    }
    throw new Error(error.message || '整理失敗');
  }
}

// 提取題目與評分準則
export async function extractQuestionCriteriaWithAPI(
  fileContent: string,
  fileType: string,
  config: APIConfig
): Promise<{
  question: string;
  criteria: string;
}> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');
    const useInlineData = isImage || isPDF;
    
    const requestBody: any = {
      apiKey: config.apiKey,
      apiType: config.apiType,
      model: config.model,
      baseURL: config.baseURL,
      fileType: fileType,
    };

    if (useInlineData) {
      const base64Data = fileContent.includes(',') 
        ? fileContent.split(',')[1] 
        : fileContent;
      requestBody.fileData = base64Data;
    } else {
      requestBody.text = fileContent;
    }

    const response = await fetch(`${BACKEND_URL}/api/extract-question-criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '提取失敗');
    }

    return {
      question: data.question || '',
      criteria: data.criteria || '',
    };
  } catch (error: any) {
    console.error('Extract question/criteria error:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      throw new Error(`無法連接到後端服務器 (${BACKEND_URL})，請確認後端服務器已啟動`);
    }
    
    throw new Error(error.message || '提取失敗');
  }
}

const GENRE_LABELS: Record<string, string> = {
  speech: '演講辭',
  letter: '書信／公開信',
  proposal: '建議書',
  report: '報告',
  commentary: '評論文章',
  article: '專題文章',
};

// 六種文體詳細格式要求、扣分陷阱及內容發展細項數量要求
const GENRE_FORMAT_GUIDE: Record<string, string> = {
  speech: `【演講辭必備格式】
- 稱謂：開首必須有稱謂，按「先尊後卑」次序排列（例如：校長、各位老師、各位同學）
- 自我介紹：引入正文前交代身份（例如：大家好，我是學生會主席……）
- 文末致謝：演講結束時須有結束語（例如：多謝各位）
【扣分陷阱】
- 切勿添加書信格式，如「鈞鑒」、「敬啟者」、「此致」、「祝頌語」等
【行文語氣評分重點】
- 以「說明效果」為主：語氣親切、具感染力，能有效游說聽眾
【內容發展細項數量（供評分參考使用）】
- 資料一應提供：2項核心措施＋2項配套措施（共4項，列於表格）
- 資料二應提供：3項同學意見（1則支持、2則疑慮）＋1則寫作者宣布演講
- 評分參考細項：2項措施、4個措施細項、3項同學意見`,

  letter: `【書信／公開信必備格式】
- 上款／稱謂：頂格寫明收信人（致個人：王老師鈞鑒／張主席道鑒；致群體：各位同學／親愛的同學們）
- 祝頌語：視乎情境與對象靈活處理，位置在正文結束後、署名之前，頂格書寫（例如：順祝各位身體健康！）
- 署名及啟告語：祝頌語之後，右下方寫明發文者身份及姓名（例如：學生會主席林美珊謹啟）
- 日期：署名下方頂格寫上完整的年、月、日（例如：二零二六年一月二十日）
【格式注意】
- 祝頌語與署名必須分行，祝頌語頂格，署名靠右
- 日期在署名之下，頂格書寫
【扣分陷阱】
- 切勿在開首寫「本文旨在說明」或使用演講辭的自我介紹格式（如：大家好，我是……）
- 切勿把祝頌語與署名寫在同一行
【行文語氣評分重點】
- 視乎題目類型：自薦信以「自薦效果」為主；公開信／一般書信以「游說／呼籲效果」為主
- 語氣誠懇、有禮，符合書信的正式場合
【內容發展細項數量（供評分參考使用）】
- 資料一應提供：篩選條件2項＋相關細項說明（列於宣傳單張）
- 資料二應提供：3項同學意見（疑慮或看法）＋1則寫作者宣布撰文
- 評分參考細項：2項個人條件、4個條件細項（經歷及履歷）、3項同學意見`,

  proposal: `【建議書必備格式】
- 上款：頂格寫明提交對象（例如：圖書館主任張老師）
- 標題：置中書寫，精要概括建議書主題（例如：有關「電子閱讀推廣計劃」的建議）
- 署名：文末右下方寫明身份及姓名（例如：文學社社長周子晴）
- 日期：署名下方頂格書寫完整的年、月、日
【扣分陷阱】
- 建議書屬公務文書，不應添加「祝頌語」
【行文語氣評分重點】
- 以「說服效果」為主：語氣客觀、正式，建議具體可行
【內容發展細項數量（供評分參考使用）】
- 資料一應提供：2個建議方向＋4個建議細項（列於表格）
- 資料二應提供：3項同學意見（疑慮或支持）＋1則寫作者宣布撰文
- 評分參考細項：2個建議、4個建議細項、3項同學意見`,

  report: `【報告必備格式】
- 稱謂／上款：頂格交代報告呈交的對象（例如：陳校長／黃老師台鑒）
- 標題：置中書寫，列明報告主題（例如：「校園問卷調查」工作報告）
- 署名及啟告語：文末右下方寫明身份及姓名（例如：學生會會長王子樂謹啟）
- 日期：署名下方頂格寫上完整的年、月、日
【扣分陷阱】
- 切勿加入「多謝各位」、「祝頌語」或「專此」等非報告格式用語
【報告文體特性（非常重要）】
- 報告的核心任務是「匯報調查結果＋提出改善建議」，具有調查性質
- 題目情境應是：學生會或某機構進行了調查，現就調查結果作報告，並提出建議
- 資料一應是「調查問卷結果」或「意見收集結果」，呈現調查數據或統計
- 而非活動通告或宣傳單張（那是演講辭或書信的資料一）
- 語氣應客觀、正式，避免主觀情感語句（如「本人深信」、「令人鼓舞」）
【行文語氣評分重點】
- 以「客觀匯報效果」為主：語氣正式、客觀，資料呈現清晰有條理
【內容發展細項數量（供評分參考使用）】
- 資料一應提供：調查結果2個類別（每類2–3項具體數據，列於表格）
- 資料二應提供：4項同學意見（正反皆有）＋1則寫作者宣布撰寫報告
- 評分參考細項：2個調查類別、4個調查意見、2個改善建議`,

  commentary: `【評論文章必備格式】
- 標題：必須有標題以交代文章主題（例如：功課輔導立意佳　微調細節收效大）
- 署名及身份：列明撰文者姓名及身份，可寫在標題正下方或文章末尾（例如：學生會會長周詩涵）
【扣分陷阱】
- 評論屬「文章」類別，切勿加上書信的「上款」、「祝頌語」，也不需要「多謝各位」及「日期」
【行文語氣評分重點】
- 以「論證效果」為主：語氣客觀持平，立場清晰，論證有力
【內容發展細項數量（供評分參考使用）】
- 資料一應提供：計劃目標2個＋活動4項（列於表格）
- 資料二應提供：4項同學意見（正反皆有）＋1則寫作者宣布撰文
- 評分參考細項：2個目標、4項活動、4項同學意見`,

  article: `【專題文章必備格式】
- 標題：交代文章主題（例如：舞台展現自我　合作成就精彩）
- 署名及身份：寫在標題右下方或文末（例如：戲劇學會主席蘇樂行）
【扣分陷阱】
- 切勿加上「上款」、「祝頌語」及「日期」，否則被視為添加多餘格式扣2分
【行文語氣評分重點】
- 以「說明效果」為主：語氣客觀、有說服力，能有效呼籲讀者
【內容發展細項數量（供評分參考使用）】
- 資料一應提供：計劃目標2個＋活動4項（列於表格）
- 資料二應提供：4項居民或同學意見（正反皆有）＋1則寫作者宣布撰文
- 評分參考細項：2個目標、4項活動細項、4項意見`,
};

// 生成實用寫作模擬卷（新邏輯：上傳模擬卷→生成新模擬卷）
export async function generatePracticalExamWithAPI(
  fileContent: string,
  fileType: string,
  genre: string,
  config: APIConfig
): Promise<GeneratedExam> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效，請在右上角設定正確的 API 密鑰');
  }

  try {
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf' || fileType.includes('pdf');
    const useInlineData = isImage || isPDF;

    const genreLabel = GENRE_LABELS[genre] || genre;
    const genreFormatGuide = GENRE_FORMAT_GUIDE[genre] || '';

    // 詳細的 DSE 香港中文卷二甲部 prompt 指引（根據真實考卷規律設計）
    const systemPrompt = `你是香港 DSE 中文科卷二甲部（實用寫作）的出題專家，專門設計符合考評局要求的模擬試卷。

【你的任務】
根據用戶提供的參考模擬卷，理解其主題方向，然後設計一份全新的模擬試卷，文體為「${genreLabel}」。新試卷必須保持與參考卷相同的主題方向（如環保、閱讀推廣、健康生活、社區服務等），讓學生就相同主題作第二次練習，加強拓展能力。但情境、計劃名稱、機構名稱、具體活動內容和人物姓名必須完全不同，避免重複。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
一、題目設計（必須嚴格遵守以下公式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

題目必須包含以下五個要素，缺一不可：

① 情境背景：[學校名稱]將[發起某計劃或活動，或引起討論]
   【報告文體例外】情境應為「[機構]就[某議題]進行了問卷調查／意見收集，現就結果作報告」
② 身份：試以[學校名稱][職銜][中文姓名（三字）]的名義
③ 文體及發表場合：撰寫[${genreLabel}]，[具體發表場合，如：在早會時段說明／刊登於校報《XX通訊》]
④ 寫作任務一：[說明計劃的意義／分析計劃的利弊／就計劃提出看法]
   【報告文體例外】任務一應為「就調查結果作報告，說明[調查議題]的現況」
⑤ 寫作任務二：並[鼓勵同學積極參與／建議校方作出改善／回應同學的意見]
   【報告文體例外】任務二應為「根據調查結果，提出改善建議」
⑥ 字數：（全文不得多於550字，標點符號計算在內。）

題目範例格式：
「[學校名稱]將於本學年參與[機構名稱]的「[計劃名稱]」計劃，試以[學校名稱][職銜][姓名]的名義，撰寫[文體及場合]，[任務一]，並[任務二]。（全文不得多於550字，標點符號計算在內。）」

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
二、資料一設計（官方文件形式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

標題格式：「資料一：[機構名稱]「[計劃名稱]」[文件類型（宣傳單張／計劃通告／海報節錄）]」

【報告文體例外（非常重要）】
若文體為報告，資料一必須是「問卷調查結果」或「意見收集統計」，而非活動通告：
- 標題格式改為：「資料一：[學校名稱]「[計劃名稱]」問卷調查結果（節錄）」
- 內容呈現：調查背景1–2句＋結果表格（兩欄：調查項目｜結果數據），共2個類別各2–3項結果
- 語氣客觀，以數據呈現，例如「逾六成同學認為……」「約四成同學表示……」

【其他文體資料一格式】
內容必須包含：
- 機構名稱（置中標題）
- 計劃名稱（置中副標題）
- 背景說明：1–2句，說明社會背景或問題，引出計劃目的
- 計劃目的：1句，說明計劃希望達到的效果
- 活動內容表格：必須有表格，兩欄（活動名稱｜內容），共2–3行
  • 每項活動名稱簡潔（4–8字）
  • 每項活動內容具體（10–20字），說明活動如何進行
- 其他資訊（可選）：申請條件、截止日期、聯絡方式等

字數要求：正文約60–90字，加表格，總體不超過130字（嚴格控制，不可過長）
重要：資料一的活動細項必須直接支援寫作任務一，讓考生有具體資料可引用

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
三、資料二設計（學生討論記錄形式）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

標題格式：「資料二：[學校名稱][討論平台名稱（學生網上論壇／群組對話／討論區）]（節錄）」

內容必須包含：
- 討論主題標題：「主題：你對「[計劃名稱]」有甚麼看法？」
- 共4則留言，格式：[姓名（班別）] [時間 HH:MM] [留言內容]
- 四則留言的意見分佈及對應關係（非常重要）：
  • 第1則：針對資料一「活動一」提出疑慮（例如：擔心活動是否可行、對自己是否適合）
  • 第2則：針對資料一「活動二」提出疑慮或另一項具體質疑
  • 第3則：支持或認同計劃的整體意義（正面意見）
  • 第4則：必須是題目中的寫作者本人，宣布將撰寫本次文章
    例如：「我將在[下星期的早會時段／本期《XX通訊》]就這個計劃[介紹計劃的意義／提出我的看法]，並回應大家的意見。」

【關鍵設計原則：資料一與資料二必須有對應關係】
- 留言一的疑慮 → 對應資料一表格中活動一，考生可用活動一的具體細項來回應
- 留言二的疑慮 → 對應資料一表格中活動二，考生可用活動二的具體細項來回應
- 確保每則疑慮都能用資料一的具體活動內容加以回應和拓展
- 這樣考生在正文一可以「引用活動一細項→回應留言一疑慮→深層拓展」
  在正文二可以「引用活動二細項→回應留言二疑慮→深層拓展」

字數要求：每則留言20–40字，總體約120–160字

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
五、評分參考生成要求（必須嚴格遵守）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【資訊分（最高 2 分）】
列出本題必須涵蓋的 3 項背景資訊（從題目和資料中提取），例如：活動名稱、計劃目的、寫作動機／身份、呼籲等。
評分描述固定為：「以上 3 項資料齊全，給 2 分；只有以上 2 項資料，給 1 分；只有以上 1 項或沒有資料，給 0 分。」

【內容發展分（最高 8 分）】
先按文體列出具體細項數量（這些數字會出現在評分描述表的第一欄「內容項目」中）：
- 演講辭：2項措施、4個措施細項、3項同學意見
- 書信：2項個人條件、4個條件細項（經歷及履歷）、3項同學意見
- 建議書：2個建議、4個建議細項、3項同學意見
- 報告：2個調查類別、4個調查意見、2個改善建議
- 評論文章：2個目標、4項活動、4項同學意見
- 專題文章：2個目標、4項活動細項、4項意見

然後生成評分描述表，按細項數量分四級：
┌─────────────────┬───────────────────────────────────────┬──────┐
│ 內容項目        │ 觀點、闡述                            │ 分數 │
├─────────────────┼───────────────────────────────────────┼──────┤
│ 齊全            │ 針對性回應；觀點明確、合理；理據充足，│7–8分 │
│（全部細項）     │ 闡述周全。                            │      │
│                 │ 一般回應；觀點大致明確合理；理據、    │5–6分 │
│                 │ 闡述一般。                            │      │
│                 │ 部分回應；觀點模糊／不合理。          │3–4分 │
│                 │ 甚少回應／缺回應；觀點極不合理。      │1–2分 │
├─────────────────┼───────────────────────────────────────┼──────┤
│ 大致齊全        │ 針對性回應；觀點明確、合理；理據充足，│5–6分 │
│（部分細項）     │ 闡述周全。                            │      │
│                 │ 一般回應；觀點大致明確合理；理據、    │3–4分 │
│                 │ 闡述一般。                            │      │
│                 │ 甚少回應／缺回應；觀點極不合理。      │1–2分 │
├─────────────────┼───────────────────────────────────────┼──────┤
│ 少量、不齊全    │ 針對性回應；觀點明確、合理；理據充足，│3–4分 │
│（極少細項）     │ 闡述清晰。                            │      │
│                 │ 部分回應；觀點模糊／不合理。          │1–2分 │
├─────────────────┼───────────────────────────────────────┼──────┤
│ 欠缺            │ 甚少回應／缺回應；觀點闕如／極不合理。│ 0分  │
└─────────────────┴───────────────────────────────────────┴──────┘

【行文語氣（最高 10 分）】
根據${genreLabel}調整「語氣效果」的描述：
- 演講辭：「說明效果」（語氣親切、具感染力）
- 書信／公開信：視乎題目類型，自薦信用「自薦效果」，公開信用「游說／呼籲效果」（語氣誠懇、有禮）
- 建議書：「說服效果」（語氣客觀正式，建議具體可行）
- 報告：「客觀匯報效果」（語氣正式客觀，資料呈現清晰，避免主觀情感語句）
- 評論文章：「論證效果」（語氣客觀持平，立場清晰）
- 專題文章：「說明效果」（語氣客觀、有說服力）

生成四級評分描述（準確簡潔流暢，語氣切合 → 大致準確達意 → 未能達意 → 空白）

【組織（最高 10 分）】
根據${genreLabel}列出具體格式核對項目（checkbox形式），例如：
- 書信：□ 欠／錯上款　□ 欠／錯署名　□ 欠／錯啟告語　□ 欠／錯日期
- 演講辭：□ 欠稱謂　□ 欠自我介紹　□ 欠文末致謝
- 建議書：□ 欠上款　□ 欠標題　□ 欠署名　□ 欠日期
- 報告：□ 欠上款　□ 欠標題　□ 欠署名　□ 欠日期
- 評論文章：□ 欠標題　□ 欠署名及身份
- 專題文章：□ 欠標題　□ 欠署名及身份
並說明：欠缺 1–2 項扣 1 分，3 項或以上扣 2 分；添加多餘格式扣 2 分

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
六、${genreLabel}格式要求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${genreFormatGuide}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
七、示範文章設計要求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 嚴格按以下段落結構撰寫，總字數550–599字：
   - 開首：約80字（交代身份、背景、計劃名稱及寫作目的，引入正文）
   - 正文一：約200字，結構必須是：
     ① 引用資料一「活動一」的名稱及具體細項（基本資訊）
     ② 針對資料二「留言一」的疑慮，用活動一的細項加以回應
     ③ 深層拓展：說明活動一對人的具體意義或效果（超出資料本身的引申）
   - 正文二：約200字，結構必須是：
     ① 引用資料一「活動二」的名稱及具體細項（基本資訊）
     ② 針對資料二「留言二」的疑慮，用活動二的細項加以回應
     ③ 深層拓展：說明活動二對人的具體意義或效果（超出資料本身的引申）
   - 結尾：約70字（總結計劃的整體意義，呼籲積極參與）

   【正文結構關鍵原則】
   - 資料一和資料二必須交織在同一段落中，而非分段處理
   - 正文一和正文二各自圍繞「一項活動＋一則意見」展開
   - 拓展部分必須超出資料所列的字面內容，說明活動如何具體影響人、改變人
   - 正文中不應點名具體人物（如「陳小明同學認為……」），應以泛指代替（如「有同學擔心……」、「另有同學認為……」）

2. 必須包含${genreLabel}所有必備格式元素
3. 凡屬於「拓展闡述」的句子（即結合資料細項、個人經歷或具體例子加以展開，超出資料字面內容的引申），必須用【拓展】和【/拓展】純文字標記包住，例如：
   「歷奇活動」中設有攀石、繩網陣等挑戰，並有專業教練「因材施教」。【拓展】這些活動培養了本人的解難能力和創造力，使本人在面對學業問題時有信心迎難而上，努力克服學習上的困難。【/拓展】
4. 示範文章只輸出純文字加上述【拓展】標記，不加任何 HTML 或 Markdown 格式`;

    const requestBody: any = {
      apiKey: config.apiKey,
      apiType: config.apiType,
      model: config.model,
      baseURL: config.baseURL,
      fileType: fileType,
      genre: genre,
      genreLabel: genreLabel,
      systemPrompt: systemPrompt,
      promptVersion: '2.0',
    };

    if (useInlineData) {
      const base64Data = fileContent.includes(',') 
        ? fileContent.split(',')[1] 
        : fileContent;
      requestBody.fileData = base64Data;
    } else {
      requestBody.text = fileContent;
    }

    const response = await fetch(`${BACKEND_URL}/api/generate-practical-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // 檢查響應內容類型
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 500));
      throw new Error('服務器返回格式錯誤，請稍後重試');
    }

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '生成失敗');
    }

    // Debug：記錄後端返回的 markingScheme 結構
    console.log('[generatePracticalExam] raw markingScheme:', JSON.stringify(data.markingScheme, null, 2));

    // 深層防護：確保所有巢狀欄位都有預設值，避免 undefined crash
    const safeExamPaper = {
      title: data.examPaper?.title || 'DSE 中文卷二甲部：實用寫作',
      time: '45分鐘',  // 固定為45分鐘，不使用 AI 返回值
      marks: '50分',  // 固定為50分，不使用 AI 返回值
      instructions: Array.isArray(data.examPaper?.instructions) ? data.examPaper.instructions : [],
      question: data.examPaper?.question || '',
      material1: {
        title: data.examPaper?.material1?.title || '材料一',
        content: data.examPaper?.material1?.content || '',
      },
      material2: {
        title: data.examPaper?.material2?.title || '材料二',
        content: data.examPaper?.material2?.content || '',
      },
    };

    // 後端真實結構：
    // markingScheme.contentInfo.table = [{item, description}]
    // markingScheme.contentDevelopment.table = [{item, description, score}]
    // markingScheme.formatRequirements.table = [{item, requirement, score}]
    const ms = data.markingScheme || {};

    // 把後端的 table 陣列轉換成前端顯示用的字串陣列
    const toInfoPoints = (table: any[]): string[] =>
      Array.isArray(table) ? table.map(r => `${r.item}：${r.description || r.requirement || ''}`) : [];

    // 內容發展：顯示具體細項（item + description），過濾掉 undefined
    const toDevPoints = (table: any[]): string[] =>
      Array.isArray(table)
        ? table
            .filter(r => r.item && r.item !== 'undefined' && r.description && r.description !== 'undefined')
            .map(r => {
              const score = r.score && r.score !== 'undefined' ? `【${r.score}】` : '';
              return `${score}${r.item}：${r.description}`;
            })
        : [];

    const toFormatPoints = (table: any[]): string[] =>
      Array.isArray(table)
        ? table
            .filter(r => r.item && r.item !== 'undefined')
            .map(r => `${r.item}：${r.requirement || r.description || ''}${r.score ? `（${r.score}）` : ''}`)
        : [];

    const safeMarkingScheme = {
      content: {
        infoPoints: toInfoPoints(
          ms.contentInfo?.table ||
          ms.content?.infoPoints ||
          ms.infoPoints ||
          []
        ),
        developmentPoints: toDevPoints(
          ms.contentDevelopment?.table ||
          ms.content?.developmentPoints ||
          ms.developmentPoints ||
          []
        ),
      },
      organization: {
        formatRequirements: toFormatPoints(
          ms.formatRequirements?.table ||
          ms.organization?.formatRequirements ||
          ms.formatRequirements ||
          []
        ),
        toneRequirements: toFormatPoints(
          ms.toneRequirements?.table ||
          ms.organization?.toneRequirements ||
          ms.toneRequirements ||
          []  // 後端暫不返回語氣要求，由 formatRequirements 統一顯示
        ),
      },
    };

    return {
      examPaper: safeExamPaper,
      markingScheme: safeMarkingScheme,
      modelEssay: data.modelEssay || '',
    };
  } catch (error: any) {
    console.error('Generate exam error:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
      throw new Error(`無法連接到後端服務器 (${BACKEND_URL})，請確認後端服務器已啟動`);
    }
    
    throw new Error(error.message || '生成失敗');
  }
}

// 生成全班分析報告
export async function generateClassAnalysisWithAPI(
  reports: any[],
  question: string,
  config: APIConfig,
  gradingMode: 'secondary' | 'primary' | 'practical' = 'secondary'
): Promise<{
  materialAnalysis: string;
  relevanceAnalysis: string;
  themeAnalysis: string;
  techniqueAnalysis: string;
  teachingSuggestion: string;
}> {
  if (!isAPIAvailable(config.apiKey)) {
    throw new Error('API 密鑰無效');
  }

  try {
    const simplifiedReports = reports.map(r => ({
      totalScore: r.totalScore,
      grading: r.grading,
      studentWork: { name: r.studentWork?.name || '未命名' },
    }));

    const response = await fetch(`${BACKEND_URL}/api/analyze-class`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey,
        apiType: config.apiType,
        model: config.model,
        baseURL: config.baseURL,
        reports: simplifiedReports,
        question: question,
        gradingMode: gradingMode,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || '分析失敗');
    }

    return {
      materialAnalysis: data.materialAnalysis || '',
      relevanceAnalysis: data.relevanceAnalysis || '',
      themeAnalysis: data.themeAnalysis || '',
      techniqueAnalysis: data.techniqueAnalysis || '',
      teachingSuggestion: data.teachingSuggestion || '',
    };
  } catch (error: any) {
    console.error('Analyze class error:', error);
    throw new Error(error.message || '分析失敗');
  }
}

// 輔助函數
function getSecondaryGradeLabel(totalScore: number): string {
  if (totalScore >= 90) return '上上';
  if (totalScore >= 85) return '上中';
  if (totalScore >= 80) return '上下';
  if (totalScore >= 70) return '中上';
  if (totalScore >= 60) return '中中';
  if (totalScore >= 50) return '中下';
  if (totalScore >= 40) return '下上';
  if (totalScore >= 30) return '下中';
  if (totalScore >= 10) return '下下';
  return '極差';
}

function getPrimaryGradeLevel(totalScore: number): string {
  if (totalScore >= 85) return '優異';
  if (totalScore >= 70) return '良好';
  if (totalScore >= 50) return '一般';
  return '有待改善';
}
