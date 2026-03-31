import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  StudentWork, 
  SecondaryReport, 
  PrimaryReport,
  PracticalReport,
  Question, 
  FileInfo,
  SecondaryGrading,
  PrimaryGrading,
  PracticalGrading,
  AppMode,
  GeneratedExam
} from '@/types';
import type { APIType, PracticalDevItems } from '@/lib/api';

// 擴展文件信息
export interface ExtendedFileInfo extends FileInfo {
  file?: File;
}

interface AppState {
  // 功能模式
  appMode: AppMode;
  
  // 當前步驟
  currentStep: number;
  
  // 題目設定
  selectedQuestion: Question | null;
  customQuestion: string;
  useCustomQuestion: boolean;
  
  // 批改偏好
  autoGrade: boolean;
  ignoreRedInk: boolean;
  contentPriority: boolean;  // 以內容為主
  enhancementDirection: 'auto' | 'narrative' | 'argumentative' | 'descriptive';
  customCriteria: string;
  customCriteriaFiles: ExtendedFileInfo[];
  
  // 實用寫作設定
  practicalGenre: string;

  // 實用寫作評分準則確認結果
  practicalInfoPoints: string[];        // 資訊分考核項目（老師確認後）
  practicalDevItems: PracticalDevItems; // 內容發展細項數量
  practicalFormatRequirements: string[]; // 格式核對項目
  practicalCriteriaConfirmed: boolean;  // 老師是否已確認評分準則
  
  // 學生作品
  studentWorks: StudentWork[];
  currentWorkIndex: number;
  uploadedFiles: ExtendedFileInfo[];
  
  // 批改結果（依模式分開儲存）
  secondaryReports: SecondaryReport[];
  primaryReports: PrimaryReport[];
  practicalReports: PracticalReport[];
  
  // 生成的模擬卷
  generatedExam: GeneratedExam | null;
  
  // 跳過的文章
  skippedWorks: StudentWork[];
  
  // API 設定
  apiKey: string;
  apiType: APIType;
  apiModel: string;
  apiBaseURL: string;
  
  // 操作
  setAppMode: (mode: AppMode) => void;
  setStep: (step: number) => void;
  setSelectedQuestion: (question: Question | null) => void;
  setCustomQuestion: (question: string) => void;
  setUseCustomQuestion: (use: boolean) => void;
  setAutoGrade: (auto: boolean) => void;
  setIgnoreRedInk: (ignore: boolean) => void;
  setContentPriority: (priority: boolean) => void;
  setEnhancementDirection: (direction: 'auto' | 'narrative' | 'argumentative') => void;
  setPracticalGenre: (genre: string) => void;
  setPracticalInfoPoints: (points: string[]) => void;
  setPracticalDevItems: (items: PracticalDevItems) => void;
  setPracticalFormatRequirements: (reqs: string[]) => void;
  setPracticalCriteriaConfirmed: (confirmed: boolean) => void;
  resetPracticalCriteria: () => void;
  setCustomCriteria: (criteria: string) => void;
  addCustomCriteriaFile: (file: ExtendedFileInfo) => void;
  removeCustomCriteriaFile: (id: string) => void;
  addStudentWork: (work: StudentWork) => void;
  removeStudentWork: (id: string) => void;
  updateStudentWork: (id: string, updates: Partial<StudentWork>) => void;
  setCurrentWorkIndex: (index: number) => void;
  addUploadedFile: (file: ExtendedFileInfo) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;
  clearCustomCriteriaFiles: () => void;
  addSecondaryReport: (report: SecondaryReport) => void;
  addPrimaryReport: (report: PrimaryReport) => void;
  addPracticalReport: (report: PracticalReport) => void;
  updateSecondaryReportGrading: (id: string, grading: SecondaryGrading) => void;
  updatePrimaryReportGrading: (id: string, grading: PrimaryGrading) => void;
  updatePracticalReportGrading: (id: string, grading: PracticalGrading) => void;
  setGeneratedExam: (exam: GeneratedExam | null) => void;
  setApiKey: (key: string) => void;
  setApiType: (type: APIType) => void;
  setApiModel: (model: string) => void;
  setApiBaseURL: (url: string) => void;
  resetAll: () => void;
  resetReports: () => void;
  resetStudentWorks: () => void;
  addSkippedWork: (work: StudentWork) => void;
  removeSkippedWork: (id: string) => void;
  clearSkippedWorks: () => void;
  
  // 獲取當前模式的報告
  getCurrentReports: () => SecondaryReport[] | PrimaryReport[] | PracticalReport[];
}

const initialState = {
  appMode: 'secondary' as AppMode,
  currentStep: 0,
  selectedQuestion: null,
  customQuestion: '',
  useCustomQuestion: false,
  autoGrade: false,
  ignoreRedInk: false,
  contentPriority: false,
  enhancementDirection: 'auto' as 'auto' | 'narrative' | 'argumentative',
  practicalGenre: 'speech',
  practicalInfoPoints: [],
  practicalDevItems: {},
  practicalFormatRequirements: [],
  practicalCriteriaConfirmed: false,
  customCriteria: '',
  customCriteriaFiles: [],
  studentWorks: [],
  currentWorkIndex: 0,
  uploadedFiles: [],
  secondaryReports: [],
  primaryReports: [],
  practicalReports: [],
  generatedExam: null,
  skippedWorks: [],
  apiKey: '',
  apiType: 'openai' as APIType,
  apiModel: 'gpt-4o',
  apiBaseURL: '',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setAppMode: (mode) => set({ 
        appMode: mode, 
        currentStep: 0,
        studentWorks: [],
        currentWorkIndex: 0,
        secondaryReports: [],
        primaryReports: [],
        practicalReports: [],
        skippedWorks: [],
        uploadedFiles: [],
        customCriteriaFiles: [],
        customQuestion: '',
        practicalInfoPoints: [],
        practicalDevItems: {},
        practicalFormatRequirements: [],
        practicalCriteriaConfirmed: false,
      }),
      
      setStep: (step) => set({ currentStep: step }),
      
      setSelectedQuestion: (question) => set({ selectedQuestion: question }),
      
      setCustomQuestion: (question) => set({ customQuestion: question }),
      
      setUseCustomQuestion: (use) => set({ useCustomQuestion: use }),
      
      setAutoGrade: (auto) => set({ autoGrade: auto }),
      
      setIgnoreRedInk: (ignore) => set({ ignoreRedInk: ignore }),
      
      setContentPriority: (priority) => set({ contentPriority: priority }),
      
      setEnhancementDirection: (direction) => set({ enhancementDirection: direction }),
      
      setPracticalGenre: (genre) => set({ practicalGenre: genre }),

      setPracticalInfoPoints: (points) => set({ practicalInfoPoints: points }),

      setPracticalDevItems: (items) => set({ practicalDevItems: items }),

      setPracticalFormatRequirements: (reqs) => set({ practicalFormatRequirements: reqs }),

      setPracticalCriteriaConfirmed: (confirmed) => set({ practicalCriteriaConfirmed: confirmed }),

      resetPracticalCriteria: () => set({
        practicalInfoPoints: [],
        practicalDevItems: {},
        practicalFormatRequirements: [],
        practicalCriteriaConfirmed: false,
      }),
      
      setCustomCriteria: (criteria) => set({ customCriteria: criteria }),
      
      addCustomCriteriaFile: (file) => set((state) => ({
        customCriteriaFiles: [...state.customCriteriaFiles, file]
      })),
      
      removeCustomCriteriaFile: (id) => set((state) => ({
        customCriteriaFiles: state.customCriteriaFiles.filter(f => f.id !== id)
      })),
      
      clearCustomCriteriaFiles: () => set({ customCriteriaFiles: [] }),
      
      addStudentWork: (work) => set((state) => ({
        studentWorks: [...state.studentWorks, work]
      })),
      
      removeStudentWork: (id) => set((state) => ({
        studentWorks: state.studentWorks.filter(w => w.id !== id)
      })),
      
      updateStudentWork: (id, updates) => set((state) => ({
        studentWorks: state.studentWorks.map(w => 
          w.id === id ? { ...w, ...updates } : w
        )
      })),
      
      setCurrentWorkIndex: (index) => set({ currentWorkIndex: index }),
      
      addUploadedFile: (file) => set((state) => ({
        uploadedFiles: [...state.uploadedFiles, file]
      })),
      
      removeUploadedFile: (id) => set((state) => ({
        uploadedFiles: state.uploadedFiles.filter(f => f.id !== id)
      })),
      
      clearUploadedFiles: () => set({ uploadedFiles: [] }),
      
      addSecondaryReport: (report) => set((state) => ({
        secondaryReports: [...state.secondaryReports, report]
      })),
      
      addPrimaryReport: (report) => set((state) => ({
        primaryReports: [...state.primaryReports, report]
      })),
      
      addPracticalReport: (report) => set((state) => ({
        practicalReports: [...state.practicalReports, report]
      })),
      
      updateSecondaryReportGrading: (id, grading) => set((state) => ({
        secondaryReports: state.secondaryReports.map(r => {
          if (r.studentWork.id === id) {
            const totalScore = (grading.content * 4) + (grading.expression * 3) + 
                              (grading.structure * 2) + grading.punctuation;
            const gradeLabel = getSecondaryGradeLabel(totalScore);
            return { ...r, grading, totalScore, gradeLabel };
          }
          return r;
        })
      })),
      
      updatePrimaryReportGrading: (id, grading) => set((state) => ({
        primaryReports: state.primaryReports.map(r => {
          if (r.studentWork.id === id) {
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
            const gradeLevel = getPrimaryGradeLabel(totalScore);
            return { ...r, grading, totalScore, gradeLevel };
          }
          return r;
        })
      })),
      
      updatePracticalReportGrading: (id, grading) => set((state) => ({
        practicalReports: state.practicalReports.map(r => {
          if (r.studentWork.id === id) {
            const contentScore = (grading.info + grading.development) * 3;
            const organizationScore = grading.tone + grading.organization;
            const totalScore = contentScore + organizationScore;
            const gradeLabel = getPracticalGradeLabel(totalScore);
            return { ...r, grading, contentScore, organizationScore, totalScore, gradeLabel };
          }
          return r;
        })
      })),
      
      setGeneratedExam: (exam) => set({ generatedExam: exam }),
      
      setApiKey: (key) => set({ apiKey: key }),
      
      setApiType: (type) => set({ apiType: type }),
      
      setApiModel: (model) => set({ apiModel: model }),
      
      setApiBaseURL: (url) => set({ apiBaseURL: url }),
      
      resetAll: () => set(initialState),
      
      resetReports: () => set({ 
        secondaryReports: [], 
        primaryReports: [], 
        practicalReports: [],
        generatedExam: null 
      }),
      
      resetStudentWorks: () => set({ studentWorks: [], currentWorkIndex: 0 }),
      
      addSkippedWork: (work) => set((state) => ({
        skippedWorks: [...state.skippedWorks.filter(w => w.id !== work.id), work]
      })),
      
      removeSkippedWork: (id) => set((state) =>{
        const work = state.skippedWorks.find(w => w.id === id);
        if (work) {
          return {
            skippedWorks: state.skippedWorks.filter(w => w.id !== id),
            studentWorks: [...state.studentWorks, work]
          };
        }
        return { skippedWorks: state.skippedWorks.filter(w => w.id !== id) };
      }),
      
      clearSkippedWorks: () => set({ skippedWorks: [] }),
      
      getCurrentReports: () => {
        const state = get();
        switch (state.appMode) {
          case 'primary': return state.primaryReports;
          case 'practical': return state.practicalReports;
          default: return state.secondaryReports;
        }
      },
    }),
    {
      name: 'chinese-grading-app-storage-v2',
      partialize: (state) => ({ 
        apiKey: state.apiKey,
        apiType: state.apiType,
        apiModel: state.apiModel,
        apiBaseURL: state.apiBaseURL,
        autoGrade: state.autoGrade,
        ignoreRedInk: state.ignoreRedInk,
        contentPriority: state.contentPriority,
        enhancementDirection: state.enhancementDirection,
        appMode: state.appMode,
      }),
    }
  )
);

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

function getPrimaryGradeLabel(totalScore: number): string {
  if (totalScore >= 85) return '優異';
  if (totalScore >= 70) return '良好';
  if (totalScore >= 50) return '一般';
  return '有待改善';
}

function getPracticalGradeLabel(totalScore: number): string {
  if (totalScore >= 45) return '5**';
  if (totalScore >= 40) return '5*';
  if (totalScore >= 35) return '5';
  if (totalScore >= 30) return '4';
  if (totalScore >= 25) return '3';
  if (totalScore >= 20) return '2';
  if (totalScore >= 15) return '1';
  return 'U';
}
