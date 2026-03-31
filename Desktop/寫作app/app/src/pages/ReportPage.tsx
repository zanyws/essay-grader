import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RefreshCw, FileText, User, Award, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore } from '@/hooks/useStore';
import { GradingSlider } from '@/components/GradingSlider';
import { ReportSection } from '@/components/ReportSection';
import { ComparisonView } from '@/components/ComparisonView';
import type { SecondaryReport, SecondaryGrading } from '@/types';
import { 
  getGradeLabel, 
  validateGrading, 
  getMaxStructureScore,
} from '@/lib/gradingCriteria';
import { exportReportToWord } from '@/lib/export';
import { gradeSecondaryEssayWithAPI, isAPIAvailable } from '@/lib/api';
import type { APIConfig } from '@/types';

interface ReportPageProps {
  onNext: () => void;
  onPrev: () => void;
}

// 生成模擬報告（當API不可用時使用）
function generateMockReport(studentWork: any, question: string): SecondaryReport {
  const grading: SecondaryGrading = {
    content: 6,
    expression: 6,
    structure: 6,
    punctuation: 7,
  };
  
  const totalScore = (grading.content * 4) + (grading.expression * 3) + 
                    (grading.structure * 2) + grading.punctuation;

  return {
    studentWork,
    grading,
    totalScore,
    gradeLabel: getGradeLabel(totalScore),
    overallComment: `本文能圍繞「${question.substring(0, 20)}...」的主題展開，立意尚算明確，取材大致恰當。文章結構完整，起承轉合清晰，表達尚算流暢。惟內容深度有待加強，論述可更為飽滿，用詞可更精準豐富。`,
    contentFeedback: {
      strengths: ['立意尚算明確，能圍繞主題展開', '取材大致恰當，能支撐立意'],
      improvements: ['內容深度有待加強', '論述可更為飽滿深刻', '例子可更具體典型']
    },
    expressionFeedback: {
      strengths: ['文句大致通順', '表達尚算清晰'],
      improvements: ['用詞可更精準豐富', '句式變化可更多樣', '修辭手法可更靈活運用']
    },
    structureFeedback: {
      strengths: ['結構完整，起承轉合清晰', '段落區分明確'],
      improvements: ['詳略安排可更得宜', '過渡可更自然流暢']
    },
    punctuationFeedback: {
      strengths: ['標點符號運用大致正確'],
      improvements: ['部分標點使用可更準確']
    },
    enhancedText: studentWork.correctedText + '\n\n[增潤後的內容示例：這裡會顯示經過潤飾的文章，用詞更精準，句式更多變，情感更豐富。]',
    enhancementNotes: [
      '優化用詞，使表達更精準生動',
      '調整句式，增加節奏感',
      '豐富細節描寫，增強畫面感',
      '深化情感表達，使文章更具感染力'
    ],
    modelEssay: `[奪星文章示範]\n\n這是一篇符合香港考評局評分準則的奪星文章示例。文章立意深刻，取材典型，論述飽滿，結構完整，表達精準靈活。\n\n（實際使用時，這裡會根據題目生成一篇完整的示範文章）`
  };
}

export function ReportPage({ onNext, onPrev }: ReportPageProps) {
  const {
    studentWorks,
    currentWorkIndex,
    secondaryReports,
    selectedQuestion,
    customQuestion,
    useCustomQuestion,
    customCriteria,
    apiKey,
    apiType,
    apiModel,
    addSecondaryReport,
    updateSecondaryReportGrading,
    contentPriority,
    enhancementDirection,
    setCurrentWorkIndex,
    setStep,
  } = useStore();

  const [currentReport, setCurrentReport] = useState<SecondaryReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);

  const question = useCustomQuestion ? customQuestion : selectedQuestion?.title || '';
  const currentWork = studentWorks[currentWorkIndex];

  // 生成或獲取報告
  useEffect(() => {
    if (!currentWork) return;

    const existingReport = secondaryReports.find(r => r.studentWork.id === currentWork.id);
    if (existingReport) {
      setCurrentReport(existingReport);
    } else {
      // 生成新報告
      generateReport();
    }
  }, [currentWork, secondaryReports, question]);

  // 生成報告（使用API或模擬數據）
  const generateReport = async () => {
    if (!currentWork) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      let newReport: SecondaryReport;

      if (isAPIAvailable(apiKey) && !useMockData) {
        // 使用真實API批改
        try {
          const apiConfig: APIConfig = {
            apiKey,
            apiType: apiType as any,
            model: apiModel,
          };
          
          const apiResult = await gradeSecondaryEssayWithAPI(
            currentWork.correctedText,
            question,
            customCriteria,
            apiConfig,
            {
              contentPriority,
              enhancementDirection,
            }
          );
          
          newReport = {
            ...apiResult,
            studentWork: currentWork
          };
        } catch (apiError: any) {
          console.error('API 批改失敗:', apiError);
          setError(`API 批改失敗: ${apiError.message}，將使用模擬數據`);
          setUseMockData(true);
          // 使用模擬數據
          newReport = generateMockReport(currentWork, question);
        }
      } else {
        // 使用模擬數據
        newReport = generateMockReport(currentWork, question);
      }

      addSecondaryReport(newReport);
      setCurrentReport(newReport);
    } catch (error: any) {
      console.error('生成報告失敗:', error);
      setError(error.message || '生成報告失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  // 處理評分變更
  const handleGradingChange = (field: keyof SecondaryGrading, value: number) => {
    if (!currentReport) return;

    const newGrading = { ...currentReport.grading, [field]: value };
    
    // 驗證分數關聯性
    if (field === 'content' || field === 'structure') {
      const validation = validateGrading(newGrading.content, newGrading.structure);
      setValidationWarning(validation.valid ? null : validation.message || null);
    }

    updateSecondaryReportGrading(currentWork.id, newGrading);
    setCurrentReport({ ...currentReport, grading: newGrading });
  };

  // 重新生成報告
  const handleRegenerate = () => {
    generateReport();
  };

  // 導出 Word
  const handleExportWord = async () => {
    if (!currentReport) return;
    await exportReportToWord(currentReport, question);
  };

  // 切換到下一篇
  const handleNextWork = () => {
    if (currentWorkIndex < studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex + 1);
    } else {
      // 所有文章批改完成，進入全班報告
      setStep(3);
      onNext();
    }
  };

  // 切換到上一篇
  const handlePrevWork = () => {
    if (currentWorkIndex > 0) {
      setCurrentWorkIndex(currentWorkIndex - 1);
    }
  };

  if (!currentWork) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#718096]">沒有學生作品</p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4A6FA5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#718096]">正在生成批改報告...</p>
          {useMockData && <p className="text-xs text-[#718096] mt-2">（使用模擬數據）</p>}
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
          <Button onClick={handleRegenerate} className="mt-4">
            重試
          </Button>
        </div>
      </div>
    );
  }

  const { grading, totalScore, gradeLabel } = currentReport;
  const maxStructureScore = getMaxStructureScore(grading.content);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto"
    >
      {error && (
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Left Panel - Grading Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-[#4A6FA5]" />
                評分調整
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {validationWarning && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 text-xs">
                    {validationWarning}
                  </AlertDescription>
                </Alert>
              )}

              <GradingSlider
                label="內容"
                value={grading.content}
                onChange={(v) => handleGradingChange('content', v)}
                scoreMultiplier={4}
                description="40分"
              />

              <GradingSlider
                label="表達"
                value={grading.expression}
                onChange={(v) => handleGradingChange('expression', v)}
                scoreMultiplier={3}
                description="30分"
              />

              <GradingSlider
                label="結構"
                value={grading.structure}
                onChange={(v) => handleGradingChange('structure', v)}
                max={maxStructureScore}
                scoreMultiplier={2}
                description="20分"
                warning={grading.structure >= maxStructureScore ? `內容品級限制，結構最高${getGradeLabel(maxStructureScore)}` : undefined}
              />

              <GradingSlider
                label="標點"
                value={grading.punctuation}
                onChange={(v) => handleGradingChange('punctuation', v)}
                min={5}
                max={10}
                description="10分"
              />

              <Separator />

              <div className="text-center">
                <p className="text-sm text-[#718096]">總分</p>
                <p className="text-3xl font-bold text-[#4A6FA5]">{totalScore}</p>
                <Badge className="mt-2 text-lg px-3 py-1">{gradeLabel}</Badge>
              </div>

              <Button 
                onClick={handleRegenerate} 
                variant="outline" 
                className="w-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重新生成報告
              </Button>

              {!isAPIAvailable(apiKey) && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-700 text-xs">
                    API 未設定，正在使用模擬數據。請在右上角設定 API 密鑰以啟用真實批改。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Report Content */}
        <div id="report-content">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-[#4A6FA5]" />
                    <span className="font-semibold">{currentWork.name || '未命名'}</span>
                    <span className="text-[#718096]">{currentWork.studentId}</span>
                  </div>
                  <p className="text-sm text-[#718096]">{question}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-[#718096]">總分</p>
                    <p className="text-2xl font-bold text-[#4A6FA5]">{totalScore}/100</p>
                  </div>
                  <Badge className="text-lg px-4 py-2">{gradeLabel}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="feedback" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="feedback">評語</TabsTrigger>
                  <TabsTrigger value="enhanced">原文增潤</TabsTrigger>
                  <TabsTrigger value="model">奪星示範</TabsTrigger>
                </TabsList>

                <TabsContent value="feedback" className="mt-6 space-y-6">
                  {/* Overall Comment */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">總評</h3>
                    <p className="text-[#2D3748] leading-relaxed">{currentReport.overallComment}</p>
                  </div>

                  <Separator />

                  {/* Detailed Feedback */}
                  <ReportSection
                    title="內容"
                    feedback={currentReport.contentFeedback}
                  />

                  <ReportSection
                    title="表達"
                    feedback={currentReport.expressionFeedback}
                  />

                  <ReportSection
                    title="結構"
                    feedback={currentReport.structureFeedback}
                  />

                  <ReportSection
                    title="標點"
                    feedback={currentReport.punctuationFeedback}
                  />
                </TabsContent>

                <TabsContent value="enhanced" className="mt-6">
                  <ComparisonView
                    originalText={currentWork.correctedText}
                    enhancedText={currentReport.enhancedText}
                    notes={currentReport.enhancementNotes}
                  />
                </TabsContent>

                <TabsContent value="model" className="mt-6">
                  <div className="p-4 bg-[#F7F9FB] rounded-lg">
                    <p className="text-[#2D3748] whitespace-pre-wrap leading-relaxed">
                      {currentReport.modelEssay}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            返回上一步
          </Button>
          
          {studentWorks.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevWork}
                disabled={currentWorkIndex === 0}
              >
                上一篇
              </Button>
              <span className="text-sm text-[#718096]">
                {currentWorkIndex + 1} / {studentWorks.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextWork}
                disabled={currentWorkIndex === studentWorks.length - 1}
              >
                下一篇
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleExportWord} className="gap-2">
            <FileText className="w-4 h-4" />
            下載 HTML
          </Button>
          
          <Button onClick={handleNextWork} className="gap-2">
            {currentWorkIndex < studentWorks.length - 1 ? '下一篇' : '全班報告'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
