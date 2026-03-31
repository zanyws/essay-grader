// 功能模式
export type AppMode = 'secondary' | 'primary' | 'practical' | 'exam-generator';

// API 配置
export interface APIConfig {
  apiKey: string;
  apiType: 'openai' | 'gemini' | 'custom';
  model?: string;
  baseURL?: string;
}

// 題目類型
export type QuestionType = 'narrative' | 'descriptive' | 'argumentative';

// 題目
export interface Question {
  year: number;
  title: string;
  type: QuestionType;
}

// 學生作品
export interface StudentWork {
  id: string;
  name: string;
  studentId: string;
  originalText: string;
  correctedText: string;
  fileName?: string;
}

// ========== 中學命題寫作評分 ==========
export type GradeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SecondaryGrading {
  content: GradeLevel;
  expression: GradeLevel;
  structure: GradeLevel;
  punctuation: number;
}

export interface SecondaryReport {
  studentWork: StudentWork;
  grading: SecondaryGrading;
  totalScore: number;
  gradeLabel: string;
  overallComment: string;
  contentFeedback: Feedback;
  expressionFeedback: Feedback;
  structureFeedback: Feedback;
  punctuationFeedback: Feedback;
  enhancedText: string;
  enhancementNotes: string[];
  modelEssay: string;
}

// ========== 小學命題寫作評分 ==========
export type PrimaryGradeLevel = 0 | 1 | 2 | 3 | 4;

export interface PrimaryGrading {
  content: PrimaryGradeLevel;    // 切題與內容 (30分) - 0級=0分
  feeling: PrimaryGradeLevel;    // 感受與立意 (20分) - 0級=0分
  structure: PrimaryGradeLevel;  // 組織與結構 (20分) - 0級=0分
  language: PrimaryGradeLevel;   // 語言運用 (20分) - 0級=0分
  format: PrimaryGradeLevel;     // 文類與格式 (10分) - 0級=0分
}

export interface PrimaryReport {
  studentWork: StudentWork;
  grading: PrimaryGrading;
  totalScore: number;
  gradeLevel: string;
  overallComment: string;
  contentFeedback: Feedback;
  feelingFeedback: Feedback;
  structureFeedback: Feedback;
  languageFeedback: Feedback;
  formatFeedback: Feedback;
  enhancedText: string;
  enhancementNotes: string[];
  modelEssay: string;
}

// ========== 實用寫作評分 ==========
export interface PracticalGrading {
  info: number;         // 資訊分 (0-2, 實際6分)
  development: number;  // 內容發展分 (0-8, 實際24分)
  tone: number;         // 行文語氣 (0-10)
  organization: number; // 組織 (0-10)
}

export interface PracticalReport {
  studentWork: StudentWork;
  grading: PracticalGrading;
  contentScore: number;      // 內容總分 (0-30)
  organizationScore: number; // 行文組織總分 (0-20)
  totalScore: number;        // 總分 (0-50)
  overallComment: string;
  infoFeedback: Feedback;
  developmentFeedback: Feedback;
  toneFeedback: Feedback;
  organizationFeedback: Feedback;
  formatIssues: string[];
  enhancedText: string;
  enhancementNotes: string[];
  modelEssay: string;
}

// 統合報告類型
export type GradingReport = SecondaryReport | PrimaryReport | PracticalReport;

// 反饋
export interface Feedback {
  strengths: string[];
  improvements: string[];
}

// 批改偏好
export interface GradingPreferences {
  autoGrade: boolean;
  ignoreRedInk: boolean;
  contentPriority?: boolean;  // 以內容為主
  enhancementDirection?: 'auto' | 'narrative' | 'argumentative'; // 增潤方向
}

// 文件信息
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
}

// 全班統計
export interface ClassStats {
  totalStudents: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  scoreDistribution: number[];
}

// ========== 品級標籤 ==========

// 中學品級標籤
export const SECONDARY_GRADE_LABELS: Record<number, string> = {
  10: '上上',
  9: '上中',
  8: '上下',
  7: '中上',
  6: '中中（上）',
  5: '中中（下）',
  4: '中下',
  3: '下上',
  2: '下中',
  1: '下下',
  0: '極差'
};

// 小學品級標籤
export const PRIMARY_GRADE_LABELS: Record<number, string> = {
  4: '優異',
  3: '良好',
  2: '一般',
  1: '有待改善',
  0: '極差'
};

// 實用寫作品級標籤
export const PRACTICAL_GRADE_LABELS: Record<number, string> = {
  45: '5**',
  40: '5*',
  35: '5',
  30: '4',
  25: '3',
  20: '2',
  15: '1',
  0: 'U'
};

// ========== 計分函數 ==========

// 中學總分
export function calculateSecondaryTotalScore(grading: SecondaryGrading): number {
  return (grading.content * 4) + (grading.expression * 3) + (grading.structure * 2) + grading.punctuation;
}

// 小學總分
export function calculatePrimaryTotalScore(grading: PrimaryGrading): number {
  const scores = {
    content: [0, 9, 18, 24, 30],   // 0級=0分, 1級=9分, 2級=18分, 3級=24分, 4級=30分
    feeling: [0, 6, 12, 16, 20],   // 0級=0分, 1級=6分, 2級=12分, 3級=16分, 4級=20分
    structure: [0, 6, 12, 16, 20], // 0級=0分, 1級=6分, 2級=12分, 3級=16分, 4級=20分
    language: [0, 6, 12, 16, 20],  // 0級=0分, 1級=6分, 2級=12分, 3級=16分, 4級=20分
    format: [0, 3, 6, 8, 10]       // 0級=0分, 1級=3分, 2級=6分, 3級=8分, 4級=10分
  };
  return scores.content[grading.content] + 
         scores.feeling[grading.feeling] + 
         scores.structure[grading.structure] + 
         scores.language[grading.language] + 
         scores.format[grading.format];
}

// 實用寫作總分
export function calculatePracticalTotalScore(grading: PracticalGrading): number {
  const contentScore = (grading.info + grading.development) * 3;
  const orgScore = grading.tone + grading.organization;
  return contentScore + orgScore;
}

// 獲取中學等級標籤
export function getSecondaryGradeLabel(totalScore: number): string {
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

// 獲取小學等級標籤
export function getPrimaryGradeLabel(totalScore: number): string {
  if (totalScore >= 85) return '優異';
  if (totalScore >= 70) return '良好';
  if (totalScore >= 50) return '一般';
  return '有待改善';
}

// 獲取實用寫作等級標籤
export function getPracticalGradeLabel(totalScore: number): string {
  if (totalScore >= 45) return '5**';
  if (totalScore >= 40) return '5*';
  if (totalScore >= 35) return '5';
  if (totalScore >= 30) return '4';
  if (totalScore >= 25) return '3';
  if (totalScore >= 20) return '2';
  if (totalScore >= 15) return '1';
  return 'U';
}

// ========== 實用寫作模擬卷 ==========

export interface PracticalExamPaper {
  title: string;
  time: string;
  marks: string;
  instructions: string[];
  question: string;
  material1: { title: string; content: string };
  material2: { title: string; content: string };
}

export interface PracticalMarkingScheme {
  content: {
    infoPoints: string[];
    developmentPoints: string[];
  };
  organization: {
    formatRequirements: string[];
    toneRequirements: string[];
  };
}

export interface GeneratedExam {
  examPaper: PracticalExamPaper;
  markingScheme: PracticalMarkingScheme;
  modelEssay?: string; // 示範文章
}

// 實用寫作文體類型
export const PRACTICAL_GENRES = [
  { value: 'speech', label: '演講辭', icon: 'Mic' },
  { value: 'letter', label: '書信/公開信', icon: 'Mail' },
  { value: 'proposal', label: '建議書', icon: 'FileText' },
  { value: 'report', label: '報告', icon: 'Clipboard' },
  { value: 'commentary', label: '評論文章', icon: 'MessageSquare' },
  { value: 'article', label: '專題文章', icon: 'BookOpen' },
] as const;
