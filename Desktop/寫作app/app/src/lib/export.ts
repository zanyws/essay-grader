import type { SecondaryReport } from '@/types';
import { SECONDARY_GRADE_LABELS } from '@/types';

// 導出單份批改報告為 HTML
export async function exportReportToWord(report: SecondaryReport, question: string): Promise<void> {
  const { studentWork, grading, totalScore, gradeLabel, overallComment,
          contentFeedback, expressionFeedback, structureFeedback, punctuationFeedback,
          enhancedText, enhancementNotes, modelEssay } = report;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>批改報告_${studentWork.name || '未命名'}</title>
  <style>
    body { font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; line-height: 1.8; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 20px; color: #2D3748; }
    h2 { font-size: 18px; margin-top: 30px; margin-bottom: 10px; color: #4A6FA5; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px; }
    h3 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; color: #2D3748; }
    .info { margin-bottom: 20px; }
    .info-row { margin: 5px 0; }
    .score { font-size: 20px; font-weight: bold; margin: 15px 0; color: #4A6FA5; }
    .grade { display: inline-block; padding: 5px 15px; background: #4A6FA5; color: white; border-radius: 4px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: left; }
    th { background-color: #F7F9FB; font-weight: bold; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 5px 0; }
    .section { margin: 20px 0; }
    .original { background: #F7F9FB; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
    .enhanced { background: #f0fff4; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
    .model { background: #fffaf0; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>香港中學中文科命題寫作批改報告</h1>
  
  <div class="info">
    <div class="info-row"><strong>學生姓名：</strong>${studentWork.name || '未命名'}</div>
    <div class="info-row"><strong>學號：</strong>${studentWork.studentId || '未識別'}</div>
    <div class="info-row"><strong>題目：</strong>${question}</div>
  </div>
  
  <div class="score">
    總分：${totalScore}/100 <span class="grade">${gradeLabel}</span>
  </div>
  
  <h2>分項評分</h2>
  <table>
    <tr><th>項目</th><th>品級</th><th>分數</th></tr>
    <tr><td>內容</td><td>${SECONDARY_GRADE_LABELS[grading.content]}</td><td>${grading.content * 4}/40</td></tr>
    <tr><td>表達</td><td>${SECONDARY_GRADE_LABELS[grading.expression]}</td><td>${grading.expression * 3}/30</td></tr>
    <tr><td>結構</td><td>${SECONDARY_GRADE_LABELS[grading.structure]}</td><td>${grading.structure * 2}/20</td></tr>
    <tr><td>標點</td><td>-</td><td>${grading.punctuation}/10</td></tr>
  </table>
  
  <h2>總評</h2>
  <p>${overallComment}</p>
  
  <h2>內容</h2>
  <div class="section">
    <h3>優點</h3>
    <ul>${contentFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
    <h3>可改善之處</h3>
    <ul>${contentFeedback.improvements.map((i: string) => `<li>${i}</li>`).join('')}</ul>
  </div>
  
  <h2>表達</h2>
  <div class="section">
    <h3>優點</h3>
    <ul>${expressionFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
    <h3>可改善之處</h3>
    <ul>${expressionFeedback.improvements.map((i: string) => `<li>${i}</li>`).join('')}</ul>
  </div>
  
  <h2>結構</h2>
  <div class="section">
    <h3>優點</h3>
    <ul>${structureFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
    <h3>可改善之處</h3>
    <ul>${structureFeedback.improvements.map((i: string) => `<li>${i}</li>`).join('')}</ul>
  </div>
  
  <h2>標點</h2>
  <div class="section">
    <h3>優點</h3>
    <ul>${punctuationFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
    <h3>可改善之處</h3>
    <ul>${punctuationFeedback.improvements.map((i: string) => `<li>${i}</li>`).join('')}</ul>
  </div>
  
  <h2>原文增潤</h2>
  <div class="section">
    <h3>增潤說明</h3>
    <ul>${enhancementNotes.map((n: string) => `<li>${n}</li>`).join('')}</ul>
    <h3>增潤後文章</h3>
    <div class="enhanced">${enhancedText}</div>
  </div>
  
  <h2>示範文章</h2>
  <div class="model">${modelEssay}</div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `批改報告_${studentWork.name || '未命名'}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 全班分析結果類型
export interface ClassAnalysis {
  materialAnalysis: string;
  relevanceAnalysis: string;
  themeAnalysis: string;
  techniqueAnalysis: string;
  teachingSuggestion: string;
}

// 導出全班報告為 HTML（包含AI分析）
export async function exportClassReportToWord(
  reports: SecondaryReport[],
  question: string,
  stats: { totalStudents: number; averageScore: string; maxScore: number; minScore: number },
  analysis?: ClassAnalysis
): Promise<void> {
  const sortedReports = [...reports].sort((a, b) => b.totalScore - a.totalScore);
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>全班批改報告</title>
  <style>
    body { font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; line-height: 1.8; padding: 40px; max-width: 1000px; margin: 0 auto; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 20px; color: #2D3748; }
    h2 { font-size: 18px; margin-top: 30px; margin-bottom: 10px; color: #4A6FA5; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px; }
    h3 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; color: #2D3748; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: #F7F9FB; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #4A6FA5; }
    .stat-label { font-size: 14px; color: #718096; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: left; }
    th { background-color: #F7F9FB; font-weight: bold; }
    tr:nth-child(even) { background-color: #FAFAFA; }
    .rank-1 { background-color: #FFD700 !important; }
    .rank-2 { background-color: #C0C0C0 !important; }
    .rank-3 { background-color: #CD7F32 !important; }
    .analysis-section { background: #F7F9FB; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }
    .ai-badge { display: inline-block; background: #5A9A7D; color: white; padding: 3px 10px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>全班中文科命題寫作批改報告</h1>
  <p><strong>題目：</strong>${question}</p>
  
  <h2>統計資料</h2>
  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${stats.totalStudents}</div>
      <div class="stat-label">總人數</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.averageScore}</div>
      <div class="stat-label">平均分</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.maxScore}</div>
      <div class="stat-label">最高分</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${stats.minScore}</div>
      <div class="stat-label">最低分</div>
    </div>
  </div>
  
  ${analysis ? `
  <h2>AI 生成分析<span class="ai-badge">AI Generated</span></h2>
  
  <h3>選材分析</h3>
  <div class="analysis-section">${analysis.materialAnalysis.replace(/\n/g, '<br>')}</div>
  
  <h3>扣題分析</h3>
  <div class="analysis-section">${analysis.relevanceAnalysis.replace(/\n/g, '<br>')}</div>
  
  <h3>立意分析</h3>
  <div class="analysis-section">${analysis.themeAnalysis.replace(/\n/g, '<br>')}</div>
  
  <h3>寫作手法分析</h3>
  <div class="analysis-section">${analysis.techniqueAnalysis.replace(/\n/g, '<br>')}</div>
  
  <h3>教學建議</h3>
  <div class="analysis-section">${analysis.teachingSuggestion.replace(/\n/g, '<br>')}</div>
  ` : ''}
  
  <h2>學生成績排名</h2>
  <table>
    <thead>
      <tr>
        <th>排名</th>
        <th>姓名</th>
        <th>學號</th>
        <th>總分</th>
        <th>等級</th>
        <th>內容</th>
        <th>表達</th>
        <th>結構</th>
        <th>標點</th>
      </tr>
    </thead>
    <tbody>
      ${sortedReports.map((report, index) => `
        <tr class="${index < 3 ? `rank-${index + 1}` : ''}">
          <td>${index + 1}</td>
          <td>${report.studentWork.name || '未命名'}</td>
          <td>${report.studentWork.studentId || '-'}</td>
          <td><strong>${report.totalScore}</strong></td>
          <td>${report.gradeLabel}</td>
          <td>${report.grading.content}</td>
          <td>${report.grading.expression}</td>
          <td>${report.grading.structure}</td>
          <td>${report.grading.punctuation}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `全班批改報告_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
