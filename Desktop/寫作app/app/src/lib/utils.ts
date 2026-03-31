import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 生成唯一ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 讀取文件為文本
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// 讀取文件為 Data URL
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

// 模擬 OCR 提取文字
export async function mockOCR(_file: File): Promise<{
  text: string;
  name: string;
  studentId: string;
}> {
  // 實際項目中這裡會調用 OCR API
  // 現在返回模擬數據
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: `這是一篇模擬的學生作文內容。實際使用時，這裡會顯示從圖片或PDF中提取的文字。\n\n今天的天氣很好，我和朋友一起去公園玩。我們看到了很多美麗的花朵，還有一些小鳥在樹上唱歌。我們玩得很開心，希望下次還能再來。`,
        name: '陳小明',
        studentId: '2025001'
      });
    }, 1500);
  });
}

// 從文字中識別學生姓名和學號
export function extractStudentInfo(text: string): { name: string; studentId: string } {
  // 簡單的規則匹配
  // 學號：通常是數字組合
  const studentIdMatch = text.match(/(?:學號|編號|ID)[：:]?\s*(\d+)/i);
  // 姓名：通常是2-4個中文字
  const nameMatch = text.match(/(?:姓名|名字)[：:]?\s*([\u4e00-\u9fa5]{2,4})/i);
  
  return {
    name: nameMatch?.[1] || '',
    studentId: studentIdMatch?.[1] || ''
  };
}

// 計算字數
export function countWords(text: string): number {
  // 中文字符計數
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  // 英文單詞計數
  const englishWords = text.match(/[a-zA-Z]+/g) || [];
  return chineseChars.length + englishWords.length;
}

// 防抖函數
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 節流函數
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 深拷貝
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// 檢查文件類型
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      return file.type.startsWith(type.replace('/*', ''));
    }
    return file.type === type;
  });
}

// 獲取文件擴展名
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}

// 截斷文字
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// 延遲函數
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
