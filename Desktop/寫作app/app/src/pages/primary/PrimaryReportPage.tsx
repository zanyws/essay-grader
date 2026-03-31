import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw, User, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/hooks/useStore';
import { gradePrimaryEssayWithAPI, isAPIAvailable } from '@/lib/api';
import type { APIConfig } from '@/types';
import { getPrimaryGradeLabel } from '@/lib/gradingCriteria';
import type { PrimaryReport, PrimaryGrading } from '@/types';

interface PrimaryReportPageProps {
  onNext: () => void;
  onPrev: () => void;
}

export function PrimaryReportPage({ onNext, onPrev }: PrimaryReportPageProps) {
  const {
    studentWorks,
    currentWorkIndex,
    customQuestion,
    customCriteria,
    apiKey,
    apiType,
    apiModel,
    primaryReports,
    addPrimaryReport,
    updatePrimaryReportGrading,
    setCurrentWorkIndex,
    setStep,
  } = useStore();

  const [currentReport, setCurrentReport] = useState<PrimaryReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentWork = studentWorks[currentWorkIndex];
  const question = customQuestion;

  useEffect(() => {
    if (!currentWork) return;

    const existingReport = primaryReports.find(r => r.studentWork.id === currentWork.id);
    if (existingReport) {
      setCurrentReport(existingReport);
    } else {
      generateReport();
    }
  }, [currentWork, primaryReports, question]);

  const generateReport = async () => {
    if (!currentWork) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      let newReport: PrimaryReport;

      if (isAPIAvailable(apiKey)) {
        try {
          const apiConfig: APIConfig = {
            apiKey,
            apiType: apiType as any,
            model: apiModel,
          };
          
          const apiResult = await gradePrimaryEssayWithAPI(
            currentWork.correctedText,
            question,
            customCriteria,
            apiConfig
          );
          
          newReport = {
            ...apiResult,
            studentWork: currentWork
          };
        } catch (apiError: any) {
          setError(`API 批改失敗: ${apiError.message}，將使用模擬數據`);
          newReport = generateMockReport(currentWork);
        }
      } else {
        newReport = generateMockReport(currentWork);
      }

      addPrimaryReport(newReport);
      setCurrentReport(newReport);
    } catch (error: any) {
      setError(error.message || '生成報告失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockReport = (work: typeof currentWork): PrimaryReport => {
    const grading: PrimaryGrading = {
      content: 3,
      feeling: 3,
      structure: 3,
      language: 3,
      format: 3,
    };
    
    const totalScore = 70;

    return {
      studentWork: work!,
      grading,
      totalScore,
      gradeLevel: getPrimaryGradeLabel(totalScore),
      overallComment: '文章大致切題，內容尚算完整，感受可再具體一些。',
      contentFeedback: { strengths: ['大致切題'], improvements: ['內容可更具體'] },
      feelingFeedback: { strengths: ['有基本感受'], improvements: ['感受可更深入'] },
      structureFeedback: { strengths: ['結構基本清楚'], improvements: ['段落銜接可更流暢'] },
      languageFeedback: { strengths: ['文句大致通順'], improvements: ['用詞可更豐富'] },
      formatFeedback: { strengths: ['格式大致正確'], improvements: ['注意標點使用'] },
      enhancedText: work!.correctedText,
      enhancementNotes: ['加強描寫', '豐富詞彙'],
      modelEssay: '參考範文...',
    };
  };

  const handleGradingChange = (field: keyof PrimaryGrading, value: number) => {
    if (!currentReport) return;
    const newGrading = { ...currentReport.grading, [field]: Math.max(1, Math.min(4, value)) as 1|2|3|4 };
    updatePrimaryReportGrading(currentWork.id, newGrading);
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

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#5A9A7D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
          <Button onClick={generateReport} className="mt-4 bg-[#5A9A7D]">
            重試
          </Button>
        </div>
      </div>
    );
  }

  const { grading, totalScore, gradeLevel } = currentReport;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-[#5A9A7D]" />
                評分調整
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'content', label: '切題與內容', max: 30 },
                { key: 'feeling', label: '感受與立意', max: 20 },
                { key: 'structure', label: '組織與結構', max: 20 },
                { key: 'language', label: '語言運用', max: 20 },
                { key: 'format', label: '文類與格式', max: 10 },
              ].map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="text-[#718096]">{grading[item.key as keyof PrimaryGrading]}級</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={1}
                    value={grading[item.key as keyof PrimaryGrading]}
                    onChange={(e) => handleGradingChange(item.key as keyof PrimaryGrading, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-[#718096]">總分</p>
                <p className="text-3xl font-bold text-[#5A9A7D]">{totalScore}</p>
                <Badge className="mt-2 bg-[#5A9A7D]">{gradeLevel}</Badge>
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
                  <User className="w-5 h-5 text-[#5A9A7D]" />
                  <span className="font-semibold">{currentWork.name || '未命名'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-[#5A9A7D]">{totalScore}/100</p>
                  <Badge className="bg-[#5A9A7D]">{gradeLevel}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="feedback">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="feedback">評語</TabsTrigger>
                  <TabsTrigger value="model">示範</TabsTrigger>
                </TabsList>

                <TabsContent value="feedback" className="mt-4 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">總評</h3>
                    <p className="text-[#2D3748]">{currentReport.overallComment}</p>
                  </div>
                  
                  {[
                    { title: '切題與內容', feedback: currentReport.contentFeedback },
                    { title: '感受與立意', feedback: currentReport.feelingFeedback },
                    { title: '組織與結構', feedback: currentReport.structureFeedback },
                    { title: '語言運用', feedback: currentReport.languageFeedback },
                    { title: '文類與格式', feedback: currentReport.formatFeedback },
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
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          返回上一步
        </Button>

        <span className="text-sm text-[#718096]">
          {currentWorkIndex + 1} / {studentWorks.length}
        </span>

        <Button onClick={handleNextWork} className="gap-2 bg-[#5A9A7D] hover:bg-[#4a8a6d]">
          {currentWorkIndex < studentWorks.length - 1 ? '下一篇' : '全班報告'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
