import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw, User, Award, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore } from '@/hooks/useStore';
import { gradePracticalEssayWithAPI, isAPIAvailable } from '@/lib/api';
import type { APIConfig } from '@/types';
import { getPracticalGradeLabel } from '@/lib/gradingCriteria';
import type { PracticalReport, PracticalGrading } from '@/types';

interface PracticalReportPageProps {
  onNext: () => void;
  onPrev: () => void;
}

export function PracticalReportPage({ onNext, onPrev }: PracticalReportPageProps) {
  const {
    studentWorks,
    currentWorkIndex,
    customQuestion,
    practicalGenre,
    customCriteria,
    practicalInfoPoints,
    practicalDevItems,
    practicalFormatRequirements,
    apiKey,
    apiType,
    apiModel,
    practicalReports,
    addPracticalReport,
    updatePracticalReportGrading,
    setCurrentWorkIndex,
    setStep,
  } = useStore();

  const [currentReport, setCurrentReport] = useState<PracticalReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentWork = studentWorks[currentWorkIndex];

  useEffect(() => {
    if (!currentWork) return;
    const existingReport = practicalReports.find(r => r.studentWork.id === currentWork.id);
    if (existingReport) {
      setCurrentReport(existingReport);
    } else {
      generateReport();
    }
  }, [currentWork, practicalReports, customQuestion]);

  const generateReport = async () => {
    if (!currentWork) return;
    setIsGenerating(true);
    setError(null);

    try {
      let newReport: PracticalReport;

      if (isAPIAvailable(apiKey)) {
        try {
          const apiConfig: APIConfig = {
            apiKey,
            apiType: apiType as any,
            model: apiModel,
          };
          
          const apiResult = await gradePracticalEssayWithAPI(
            currentWork.correctedText,
            customQuestion,
            customCriteria,
            apiConfig,
            {
              genre: practicalGenre,
              infoPoints: practicalInfoPoints,
              devItems: practicalDevItems,
              formatRequirements: practicalFormatRequirements,
            }
          );
          
          newReport = { ...apiResult, studentWork: currentWork };
        } catch (apiError: any) {
          setError(`API 批改失敗: ${apiError.message}`);
          newReport = generateMockReport(currentWork);
        }
      } else {
        newReport = generateMockReport(currentWork);
      }

      addPracticalReport(newReport);
      setCurrentReport(newReport);
    } catch (error: any) {
      setError(error.message || '生成報告失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockReport = (work: typeof currentWork): PracticalReport => {
    const grading: PracticalGrading = {
      info: 2,
      development: 6,
      tone: 7,
      organization: 7,
    };
    
    const contentScore = (grading.info + grading.development) * 3;
    const organizationScore = grading.tone + grading.organization;
    const totalScore = contentScore + organizationScore;

    return {
      studentWork: work!,
      grading,
      contentScore,
      organizationScore,
      totalScore,
      overallComment: '文章能回應題目要求，內容發展尚可，行文語氣合宜。',
      infoFeedback: { strengths: ['涵蓋主要資訊'], improvements: ['可更完整'] },
      developmentFeedback: { strengths: ['有回應意見'], improvements: ['闡述可更深入'] },
      toneFeedback: { strengths: ['語氣合宜'], improvements: ['措辭可更精準'] },
      organizationFeedback: { strengths: ['結構完整'], improvements: ['格式可更準確'] },
      formatIssues: ['日期格式'],
      enhancedText: work!.correctedText,
      enhancementNotes: ['加強說服力'],
      modelEssay: '參考範文...',
    };
  };

  const handleGradingChange = (field: keyof PracticalGrading, value: number) => {
    if (!currentReport) return;
    const maxVal = field === 'info' ? 2 : field === 'development' ? 8 : 10;
    const newGrading = { ...currentReport.grading, [field]: Math.max(0, Math.min(maxVal, value)) };
    updatePracticalReportGrading(currentWork.id, newGrading);
    setCurrentReport({ ...currentReport, grading: newGrading });
  };

  const handleNextWork = () => {
    if (currentWorkIndex < studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex + 1);
    } else {
      setStep(3);
      onNext();
    }
  };

  // 一鍵下載批改報告 HTML
  const handleDownloadReport = () => {
    if (!currentReport || !currentWork) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>實用寫作批改報告 - ${currentWork.name || '未命名'}</title>
  <style>
    body { font-family: "Microsoft JhengHei", "PingFang HK", sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 10px; color: #B5726E; }
    h2 { font-size: 18px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #B5726E; padding-bottom: 5px; color: #B5726E; }
    h3 { font-size: 16px; margin-top: 20px; margin-bottom: 10px; color: #555; }
    .meta { text-align: center; color: #666; margin-bottom: 30px; }
    .score-box { background: #f9f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #B5726E; }
    .score-box .total { font-size: 36px; font-weight: bold; color: #B5726E; }
    .score-box .label { font-size: 14px; color: #666; }
    .score-detail { display: flex; justify-content: center; gap: 30px; margin-top: 15px; }
    .score-detail .item { text-align: center; }
    .score-detail .item .value { font-size: 20px; font-weight: bold; color: #4A6FA5; }
    .feedback-section { margin: 20px 0; }
    .feedback-section h3 { color: #4A6FA5; }
    .strengths { background: #f0f7f0; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #5A9A7D; }
    .improvements { background: #fff5f0; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #E89B5C; }
    .essay-box { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }
    .format-issues { background: #fff8e6; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #E8A838; }
    ul { margin: 10px 0; padding-left: 25px; }
    li { margin: 5px 0; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>實用寫作批改報告</h1>
  <p class="meta">${currentWork.name || '未命名'} | 題目：${customQuestion || '未設定'}</p>
  
  <div class="score-box">
    <div class="label">總分</div>
    <div class="total">${totalScore}/50</div>
    <div class="label">等級：${getPracticalGradeLabel(totalScore)}</div>
    <div class="score-detail">
      <div class="item">
        <div class="value">${contentScore}</div>
        <div class="label">內容(30)</div>
      </div>
      <div class="item">
        <div class="value">${organizationScore}</div>
        <div class="label">行文組織(20)</div>
      </div>
    </div>
  </div>

  <h2>總評</h2>
  <p>${currentReport.overallComment}</p>

  ${currentReport.formatIssues.length > 0 ? `
  <div class="format-issues">
    <h3>格式問題</h3>
    <ul>
      ${currentReport.formatIssues.map((issue: string) => `<li>${issue}</li>`).join('\n      ')}
    </ul>
  </div>
  ` : ''}

  <h2>各項評語</h2>
  
  <div class="feedback-section">
    <h3>資訊 (${currentReport.grading.info}/2)</h3>
    <div class="strengths">
      <strong>優點：</strong>
      <ul>${currentReport.infoFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
    <div class="improvements">
      <strong>改善：</strong>
      <ul>${currentReport.infoFeedback.improvements.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
  </div>

  <div class="feedback-section">
    <h3>內容發展 (${currentReport.grading.development}/8)</h3>
    <div class="strengths">
      <strong>優點：</strong>
      <ul>${currentReport.developmentFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
    <div class="improvements">
      <strong>改善：</strong>
      <ul>${currentReport.developmentFeedback.improvements.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
  </div>

  <div class="feedback-section">
    <h3>行文語氣 (${currentReport.grading.tone}/10)</h3>
    <div class="strengths">
      <strong>優點：</strong>
      <ul>${currentReport.toneFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
    <div class="improvements">
      <strong>改善：</strong>
      <ul>${currentReport.toneFeedback.improvements.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
  </div>

  <div class="feedback-section">
    <h3>組織 (${currentReport.grading.organization}/10)</h3>
    <div class="strengths">
      <strong>優點：</strong>
      <ul>${currentReport.organizationFeedback.strengths.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
    <div class="improvements">
      <strong>改善：</strong>
      <ul>${currentReport.organizationFeedback.improvements.map((s: string) => `<li>${s}</li>`).join('\n      ')}</ul>
    </div>
  </div>

  <h2>增潤文章</h2>
  <div class="essay-box">${currentReport.enhancedText}</div>

  <h2>示範文章</h2>
  <div class="essay-box">${currentReport.modelEssay}</div>

  <p class="meta" style="margin-top: 40px; font-size: 12px;">由中文科作文批改系統生成</p>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `實用寫作批改報告_${currentWork.name || '未命名'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#B5726E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#718096]">正在生成批改報告...</p>
        </div>
      </div>
    );
  }

  if (!currentReport) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-[#718096]">無法生成報告</p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          <Button onClick={generateReport} className="mt-4 bg-[#B5726E]">重試</Button>
        </div>
      </div>
    );
  }

  const { grading, contentScore, organizationScore, totalScore } = currentReport;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      {error && (
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-[#B5726E]" />
                評分調整
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>資訊分</span>
                  <span>{grading.info}/2</span>
                </div>
                <input type="range" min={0} max={2} value={grading.info}
                  onChange={(e) => handleGradingChange('info', parseInt(e.target.value))}
                  className="w-full" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>內容發展</span>
                  <span>{grading.development}/8</span>
                </div>
                <input type="range" min={0} max={8} value={grading.development}
                  onChange={(e) => handleGradingChange('development', parseInt(e.target.value))}
                  className="w-full" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>行文語氣</span>
                  <span>{grading.tone}/10</span>
                </div>
                <input type="range" min={0} max={10} value={grading.tone}
                  onChange={(e) => handleGradingChange('tone', parseInt(e.target.value))}
                  className="w-full" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>組織</span>
                  <span>{grading.organization}/10</span>
                </div>
                <input type="range" min={0} max={10} value={grading.organization}
                  onChange={(e) => handleGradingChange('organization', parseInt(e.target.value))}
                  className="w-full" />
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-[#718096]">總分</p>
                <p className="text-3xl font-bold text-[#B5726E]">{totalScore}</p>
                <div className="text-sm text-[#718096] mt-1">
                  內容：{contentScore}/30 | 行文組織：{organizationScore}/20
                </div>
                <Badge className="mt-2 bg-[#B5726E]">{getPracticalGradeLabel(totalScore)}</Badge>
              </div>

              <Button onClick={generateReport} variant="outline" className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                重新生成
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#B5726E]" />
                  <span className="font-semibold">{currentWork.name || '未命名'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-[#B5726E]">{totalScore}/50</p>
                  <Badge className="bg-[#B5726E]">{getPracticalGradeLabel(totalScore)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="feedback">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="feedback">評語</TabsTrigger>
                  <TabsTrigger value="enhanced">增潤</TabsTrigger>
                  <TabsTrigger value="model">示範</TabsTrigger>
                </TabsList>

                <TabsContent value="feedback" className="mt-4 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">總評</h3>
                    <p className="text-[#2D3748]">{currentReport.overallComment}</p>
                  </div>

                  {currentReport.formatIssues.length > 0 && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium text-orange-700 mb-2">格式問題</h4>
                      <ul className="list-disc list-inside text-orange-700">
                        {currentReport.formatIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {[
                    { title: '資訊', feedback: currentReport.infoFeedback },
                    { title: '內容發展', feedback: currentReport.developmentFeedback },
                    { title: '行文語氣', feedback: currentReport.toneFeedback },
                    { title: '組織', feedback: currentReport.organizationFeedback },
                  ].map((item) => (
                    <div key={item.title} className="border-t pt-4">
                      <h4 className="font-medium mb-2">{item.title}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-green-600 mb-1">優點：</p>
                          <ul className="list-disc list-inside">
                            {item.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-orange-600 mb-1">改善：</p>
                          <ul className="list-disc list-inside">
                            {item.feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="enhanced" className="mt-4">
                  <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap">
                    {currentReport.enhancedText}
                  </div>
                </TabsContent>

                <TabsContent value="model" className="mt-4">
                  <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap">
                    {currentReport.modelEssay}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            返回上一步
          </Button>
          {currentWorkIndex > 0 && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentWorkIndex(currentWorkIndex - 1)} 
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              上一篇報告
            </Button>
          )}
        </div>

        <span className="text-sm text-[#718096]">
          {currentWorkIndex + 1} / {studentWorks.length}
        </span>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadReport} 
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            下載 HTML
          </Button>
          {currentWorkIndex < studentWorks.length - 1 && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentWorkIndex(currentWorkIndex + 1)} 
              className="gap-2"
            >
              下一篇報告
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleNextWork} className="gap-2 bg-[#B5726E] hover:bg-[#a5625e]">
            {currentWorkIndex < studentWorks.length - 1 ? '完成並下一篇' : '全班報告'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
