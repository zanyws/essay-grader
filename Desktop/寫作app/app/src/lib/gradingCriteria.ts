// ========== 中學命題寫作評分準則 ==========

export interface GradingCriteria {
  content: {
    max: number;
    weight: number;
    description: string;
  };
  expression: {
    max: number;
    weight: number;
    description: string;
  };
  structure: {
    max: number;
    weight: number;
    description: string;
  };
  punctuation: {
    max: number;
    weight: number;
    description: string;
  };
}

// 標準中學評分準則
export const SECONDARY_CRITERIA: GradingCriteria = {
  content: { max: 10, weight: 4, description: '立意、選材、扣題' },
  expression: { max: 10, weight: 3, description: '語言運用、修辭技巧、文句通順' },
  structure: { max: 10, weight: 2, description: '組織、分段、過渡' },
  punctuation: { max: 10, weight: 1, description: '標點運用正確', },
};

// 以內容為主的評分準則（結構品級受限於內容品級）
export const SECONDARY_CONTENT_PRIORITY_CRITERIA: GradingCriteria = {
  content: { max: 10, weight: 4, description: '立意、選材、扣題（優先評定）' },
  expression: { max: 10, weight: 3, description: '語言運用、修辭技巧、文句通順' },
  structure: { max: 10, weight: 2, description: '組織、分段、過渡（不應高於內容超過1級）' },
  punctuation: { max: 10, weight: 1, description: '標點運用正確' },
};

// 獲取品級標籤
export function getGradeLabel(score: number): string {
  const labels: Record<number, string> = {
    10: '上上', 9: '上中', 8: '上下', 7: '中上', 6: '中中（上）',
    5: '中中（下）', 4: '中下', 3: '下上', 2: '下中', 1: '下下', 0: '極差'
  };
  return labels[Math.max(0, Math.min(10, Math.round(score)))] || '中中';
}

// 驗證分數關聯性（內容優先模式）
export function validateGrading(content: number, structure: number): { valid: boolean; message?: string } {
  // 結構品級不應高於內容品級超過1級
  if (structure > content + 1) {
    return {
      valid: false,
      message: `內容為${getGradeLabel(content)}，結構不應高於${getGradeLabel(Math.min(10, content + 1))}`
    };
  }
  return { valid: true };
}

// 獲取結構最高分（根據內容品級）
export function getMaxStructureScore(contentScore: number): number {
  return Math.min(10, contentScore + 1);
}

// ========== 小學命題寫作評分準則 ==========

export interface PrimaryCriteria {
  content: { name: string; max: number; weight: number; description: string };
  feeling: { name: string; max: number; weight: number; description: string };
  structure: { name: string; max: number; weight: number; description: string };
  language: { name: string; max: number; weight: number; description: string };
  format: { name: string; max: number; weight: number; description: string };
}

// 小學品級標籤（9等+0分）
export const PRIMARY_GRADE_LABELS: Record<number, string> = {
  9: '上上', 8: '上中', 7: '上下', 6: '中上', 5: '中中（上）',
  4: '中中（下）', 3: '中下', 2: '下上', 1: '下中', 0: '0分'
};

// 小學評分準則 - 根據文體分類
export const PRIMARY_CRITERIA_BY_GENRE = {
  // 記敘文評分準則
  narrative: {
    content: { 
      name: '內容（40分）', 
      max: 4, 
      weight: 30, 
      description: '故事有明確人物、時地、起因、經過、高潮、結局，事件完整，有細節與內心感受，可見成長或反思。' 
    },
    feeling: { 
      name: '表達（30分）', 
      max: 4, 
      weight: 20, 
      description: '句子通順，有細節描寫（表情、對話、動作），有一定書面語及簡單修辭。' 
    },
    structure: { 
      name: '結構（20分）', 
      max: 4, 
      weight: 20, 
      description: '有明確開頭引入、經過發展、高潮、結尾體會，段落清楚，事件依順序鋪排。' 
    },
    language: { 
      name: '語言運用', 
      max: 4, 
      weight: 0, 
      description: '併入表達範疇評分' 
    },
    format: { 
      name: '標點（10分）', 
      max: 4, 
      weight: 10, 
      description: 'AI不考慮字體，只考慮標點，下限為5分，若沒有標點則0分。' 
    },
  },
  // 描寫文評分準則
  descriptive: {
    content: { 
      name: '內容（40分）', 
      max: 4, 
      weight: 30, 
      description: '緊扣題目，能多角度、多感官描寫，細節豐富（視覺、聲音、氣味、觸感等），能寫出景物或人物的特點，有感受或小小感想。' 
    },
    feeling: { 
      name: '表達（30分）', 
      max: 4, 
      weight: 20, 
      description: '句子通順，有描寫詞語（形容詞、動詞），用詞較豐富，語句流暢，可有少量修辭。' 
    },
    structure: { 
      name: '結構（20分）', 
      max: 4, 
      weight: 20, 
      description: '有清晰組織，可按遠近／上下／四季／時間／情感層次來展開，每段集中一重點，有頭尾呼應。' 
    },
    language: { 
      name: '語言運用', 
      max: 4, 
      weight: 0, 
      description: '併入表達範疇評分' 
    },
    format: { 
      name: '標點（10分）', 
      max: 4, 
      weight: 10, 
      description: 'AI不考慮字體，只考慮標點，下限為5分，若沒有標點則0分。' 
    },
  },
  // 議論文評分準則
  argumentative: {
    content: { 
      name: '內容（40分）', 
      max: 4, 
      weight: 30, 
      description: '明確表明立場（贊成／反對／中立），有1-2個清楚理由，理由具體，有簡單例子或自身經驗，整體切題，有結論句。' 
    },
    feeling: { 
      name: '表達（30分）', 
      max: 4, 
      weight: 20, 
      description: '文句通順，能用「因為……所以……」「我認為」等表達立場與理由，用詞較準確。' 
    },
    structure: { 
      name: '結構（20分）', 
      max: 4, 
      weight: 20, 
      description: '有清楚三段：1）開頭表明立場；2）中段說明1-2個理由；3）結尾簡單總結。' 
    },
    language: { 
      name: '語言運用', 
      max: 4, 
      weight: 0, 
      description: '併入表達範疇評分' 
    },
    format: { 
      name: '標點（10分）', 
      max: 4, 
      weight: 10, 
      description: 'AI不考慮字體，只考慮標點，下限為5分，若沒有標點則0分。' 
    },
  },
};

// 預設使用記敘文評分準則（向後兼容）
export const PRIMARY_CRITERIA: PrimaryCriteria = PRIMARY_CRITERIA_BY_GENRE.narrative;

// 小學品級分數換算
export const PRIMARY_SCORE_TABLE: Record<string, number[]> = {
  content: [0, 9, 18, 24, 30],
  feeling: [0, 6, 12, 16, 20],
  structure: [0, 6, 12, 16, 20],
  language: [0, 6, 12, 16, 20],
  format: [0, 3, 6, 8, 10],
};

// 小學品級標籤
export function getPrimaryGradeLabel(level: number): string {
  const labels: Record<number, string> = {
    4: '優異',
    3: '良好', 
    2: '一般',
    1: '有待改善'
  };
  return labels[level] || '一般';
}

// 計算小學總分
export function calculatePrimaryTotal(grading: {
  content: number;
  feeling: number;
  structure: number;
  language: number;
  format: number;
}): number {
  return PRIMARY_SCORE_TABLE.content[grading.content] +
         PRIMARY_SCORE_TABLE.feeling[grading.feeling] +
         PRIMARY_SCORE_TABLE.structure[grading.structure] +
         PRIMARY_SCORE_TABLE.language[grading.language] +
         PRIMARY_SCORE_TABLE.format[grading.format];
}

// ========== 實用寫作評分準則 ==========

export interface PracticalCriteria {
  info: { name: string; max: number; weight: number; description: string };
  development: { name: string; max: number; weight: number; description: string };
  tone: { name: string; max: number; weight: number; description: string };
  organization: { name: string; max: number; weight: number; description: string };
}

export const PRACTICAL_CRITERIA: PracticalCriteria = {
  info: {
    name: '資訊分',
    max: 2,
    weight: 6, // 實際分數 = 得分 × 3
    description: '涵蓋3項核心資訊得2分，2項得1分'
  },
  development: {
    name: '內容發展分',
    max: 8,
    weight: 24, // 實際分數 = 得分 × 3
    description: '針對性回應、觀點明確、理據充足'
  },
  tone: {
    name: '行文語氣',
    max: 10,
    weight: 10,
    description: '措辭準確、態度合宜、游說效果'
  },
  organization: {
    name: '組織',
    max: 10,
    weight: 10,
    description: '結構完整、詳略得宜、格式正確'
  },
};

// 實用寫作文體格式要求
export const PRACTICAL_FORMAT_REQUIREMENTS: Record<string, {
  name: string;
  required: string[];
  deductions: { items: number; points: number }[];
  traps: string[];
}> = {
  speech: {
    name: '演講辭',
    required: ['稱謂（先尊後卑）', '自我介紹', '文末致謝'],
    deductions: [{ items: 1, points: 1 }, { items: 3, points: 2 }],
    traps: ['切勿添加書信格式如「鈞鑒」、「敬啟者」、「此致」、「祝頌語」等']
  },
  letter: {
    name: '書信/公開信',
    required: ['上款/稱謂', '署名及啟告語', '日期'],
    deductions: [{ items: 1, points: 1 }, { items: 3, points: 2 }],
    traps: ['避免「本文旨在說明」或「大家好，我是...」等非書信格式']
  },
  proposal: {
    name: '建議書',
    required: ['上款', '標題', '署名', '日期'],
    deductions: [{ items: 1, points: 1 }, { items: 3, points: 2 }],
    traps: ['建議書屬公務文書，不應添加「祝頌語」']
  },
  report: {
    name: '報告',
    required: ['稱謂/上款', '標題', '署名（及啟告語）', '日期'],
    deductions: [{ items: 1, points: 1 }, { items: 3, points: 2 }],
    traps: ['切勿加入「多謝各位」、「祝頌語」或「專此」等非報告格式用語']
  },
  commentary: {
    name: '評論文章',
    required: ['標題', '署名及身份'],
    deductions: [{ items: 1, points: 1 }, { items: 3, points: 2 }],
    traps: ['評論屬文章類別，切勿加上書信的「上款」、「祝頌語」或「日期」']
  },
  article: {
    name: '專題文章',
    required: ['標題', '署名及身份'],
    deductions: [{ items: 1, points: 1 }, { items: 3, points: 2 }],
    traps: ['切勿加上「上款」、「祝頌語」及「日期」，否則扣2分']
  },
};

// 實用寫作品級標籤
export function getPracticalGradeLabel(score: number): string {
  if (score >= 45) return '5**';
  if (score >= 40) return '5*';
  if (score >= 35) return '5';
  if (score >= 30) return '4';
  if (score >= 25) return '3';
  if (score >= 20) return '2';
  if (score >= 15) return '1';
  return 'U';
}

// 計算實用寫作總分
export function calculatePracticalTotal(grading: {
  info: number;
  development: number;
  tone: number;
  organization: number;
}): { content: number; organization: number; total: number } {
  const contentScore = (grading.info + grading.development) * 3;
  const orgScore = grading.tone + grading.organization;
  return {
    content: contentScore,
    organization: orgScore,
    total: contentScore + orgScore
  };
}

// ========== 增潤方向判斷 ==========

// 判斷題目類型
export function detectQuestionType(question: string): 'narrative' | 'argumentative' | 'descriptive' | 'mixed' {
  const narrativeKeywords = ['記敘', '記述', '記錄', '經歷', '故事', '回憶', '感受', '體會', '抒情', '難忘', '第一次'];
  const argumentativeKeywords = ['議論', '論說', '立場', '看法', '觀點', '評論', '討論', '辯論', '說明', '談', '論', '是否', '贊成'];
  const descriptiveKeywords = ['描寫', '寫景', '狀物', '寫人', '景物', '季節', '地方', '場景', '外貌', '特點'];
  
  const lowerQuestion = question.toLowerCase();
  
  const hasNarrative = narrativeKeywords.some(kw => lowerQuestion.includes(kw));
  const hasArgumentative = argumentativeKeywords.some(kw => lowerQuestion.includes(kw));
  const hasDescriptive = descriptiveKeywords.some(kw => lowerQuestion.includes(kw));
  
  // 優先判斷描寫文
  if (hasDescriptive && !hasNarrative && !hasArgumentative) return 'descriptive';
  if (hasArgumentative && !hasNarrative && !hasDescriptive) return 'argumentative';
  if (hasNarrative && !hasArgumentative && !hasDescriptive) return 'narrative';
  return 'mixed';
}

// 獲取增潤方向建議
export function getEnhancementDirection(question: string, preference: 'auto' | 'narrative' | 'argumentative'): string {
  if (preference !== 'auto') {
    return preference === 'narrative' ? '記敘說理、記敘抒情' : '議論說理';
  }
  
  const type = detectQuestionType(question);
  if (type === 'argumentative') return '議論說理';
  return '記敘說理、記敘抒情';
}
