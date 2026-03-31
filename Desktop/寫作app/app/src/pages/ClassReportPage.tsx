import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Download, RefreshCw, Users, FileText, TrendingUp, BookOpen, Lightbulb, PenTool, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore } from '@/hooks/useStore';
import { exportClassReportToWord } from '@/lib/export';
import { generateClassAnalysisWithAPI, isAPIAvailable } from '@/lib/api';
import type { APIConfig } from '@/types';

interface ClassReportPageProps {
  onPrev: () => void;
}

// 默認分析數據
const defaultAnalysis = {
  materialAnalysis: `全班學生的選材呈現以下特點：

1. 選材類型分佈：
   • 個人經歷類：約占40%，多數學生傾向於從自身經驗出發
   • 社會現象類：約占35%，顯示學生對社會議題的關注
   • 歷史文化類：約占15%，選材較為穩重
   • 想像虛構類：約占10%，創意性選材相對較少

2. 選材優點：
   • 多數學生能選取與題目相關的素材
   • 個人經歷類選材情感真摯，具感染力
   • 部分學生能選取典型事例，具說服力

3. 選材問題：
   • 部分學生選材過於普通，缺乏新意
   • 少數學生選材與題目扣連不緊密
   • 論據分析不夠深入，停留在表面`,

  relevanceAnalysis: `扣題情況分析：

1. 整體表現：
   • 良好扣題：約60%的學生能準確理解題意
   • 基本扣題：約30%的學生大致理解題意，但有偏差
   • 扣題不準：約10%的學生對題目理解有誤

2. 常見問題：
   • 部分學生只抓住題目的某個詞語，未能全面理解題意
   • 少數學生對題目的深層含義理解不足
   • 個別學生出現離題情況

3. 改進建議：
   • 加強審題訓練，學會分析題目的關鍵詞和限制詞
   • 練習多角度思考題目，挖掘題目的深層含義
   • 寫作前擬定大綱，確保內容緊扣題目`,

  themeAnalysis: `立意深度分析：

1. 立意分佈：
   • 深刻立意（上上、上中）：約20%
   • 良好立意（上下、中上）：約40%
   • 一般立意（中中）：約30%
   • 薄弱立意（中下及以下）：約10%

2. 優點：
   • 部分學生能從個人經歷昇華至人生哲理
   • 少數學生能提出獨到見解，顯示思考深度
   • 部分議論文論點明確，論證有力

3. 問題：
   • 多數學生立意停留在表面，缺乏深度
   • 部分學生立意模糊，中心思想不突出
   • 少數學生缺乏立意，內容散亂

4. 提升建議：
   • 引導學生從多角度思考問題
   • 鼓勵學生聯想類比，以小見大
   • 加強價值觀反思，深化立意`,

  techniqueAnalysis: `寫作手法分析：

1. 常用手法：
   • 記敘：順敘為主，部分使用倒敘、插敘
   • 描寫：以視覺描寫為主，其他感官描寫較少
   • 抒情：直接抒情較多，間接抒情較少
   • 議論：舉例論證為主，對比論證、比喻論證較少

2. 優點：
   • 部分學生能靈活運用多種寫作手法
   • 少數學生修辭運用得當，增強表達效果
   • 部分學生細節描寫生動，畫面感強

3. 問題：
   • 多數學生寫作手法單一，缺乏變化
   • 修辭運用生硬，為修辭而修辭
   • 描寫不夠細緻，缺乏感官細節

4. 改進建議：
   • 加強寫作手法專項訓練
   • 鼓勵學生多閱讀優秀範文，學習借鑑
   • 練習多種感官描寫，豐富表達`,

  teachingSuggestion: `寫作教學建議：

一、教學重點
1. 審題訓練：加強學生分析題目的能力
2. 立意提升：引導學生深化思考，以小見大
3. 選材指導：教導學生選取典型、新穎的素材
4. 結構訓練：強化起承轉合的意識
5. 表達優化：豐富詞彙，靈活運用句式

二、具體教學活動
1. 題目分析工作坊：分組討論歷屆題目
2. 立意頭腦風暴：針對同一題目，多角度思考
3. 選材分享會：學生分享並互評選材
4. 結構圖繪製：寫作前繪製文章結構圖
5. 佳句仿寫：模仿優秀範文的表達

三、練習題目推薦
1. 記敘文：「那一刻，我長大了」、「難忘的第一次」
2. 描寫文：「雨中的街景」、「家鄉的四季」
3. 議論文：「談堅持」、「網絡的利與弊」

四、後續跟進
1. 建立學生寫作檔案，追蹤進步情況
2. 定期進行寫作訓練，保持寫作手感
3. 組織同儕互評活動，互相學習
4. 提供個別輔導，針對性改善弱點`
};

export function ClassReportPage({ onPrev }: ClassReportPageProps) {
  const { 
    secondaryReports, 
    selectedQuestion, 
    customQuestion, 
    useCustomQuestion,
    apiKey,
    apiType,
    apiModel,
  } = useStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [useAIAnalysis, setUseAIAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = useCustomQuestion ? customQuestion : selectedQuestion?.title || '';

  // 計算統計數據
  const stats = useMemo(() => {
    if (secondaryReports.length === 0) return null;

    const scores = secondaryReports.map(r => r.totalScore);
    const totalStudents = secondaryReports.length;
    const averageScore = scores.reduce((a, b) => a + b, 0) / totalStudents;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // 分數分佈（每10分一個區間）
    const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    scores.forEach(score => {
      const index = Math.min(Math.floor(score / 10), 9);
      distribution[index]++;
    });

    return {
      totalStudents,
      averageScore: averageScore.toFixed(1),
      maxScore,
      minScore,
      distribution
    };
  }, [secondaryReports]);

  // 使用 AI 生成分析
  const generateAIAnalysis = async () => {
    if (!isAPIAvailable(apiKey)) {
      setError('請先設定 API 密鑰');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const apiConfig: APIConfig = {
        apiKey,
        apiType: apiType as any,
        model: apiModel,
      };

      const result = await generateClassAnalysisWithAPI(secondaryReports, question, apiConfig, 'secondary');
      setAnalysis(result);
      setUseAIAnalysis(true);
    } catch (e: any) {
      console.error('生成 AI 分析失敗:', e);
      setError(`生成 AI 分析失敗: ${e.message}，將使用預設分析`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 導出全班報告
  const handleExportClassReport = async () => {
    await exportClassReportToWord(secondaryReports, question, stats!, useAIAnalysis ? analysis : undefined);
  };

  // 一鍵下載所有批改報告
  const handleDownloadAll = async () => {
    // 實際項目中會打包下載所有報告
    alert('功能開發中：將打包下載所有學生的批改報告');
  };

  if (secondaryReports.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#718096]">沒有批改報告數據</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">總人數</p>
            <p className="text-2xl font-bold text-[#4A6FA5]">{stats?.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">平均分</p>
            <p className="text-2xl font-bold text-[#4A6FA5]">{stats?.averageScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">最高分</p>
            <p className="text-2xl font-bold text-[#5A9A7D]">{stats?.maxScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">最低分</p>
            <p className="text-2xl font-bold text-[#B5726E]">{stats?.minScore}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-[#4A6FA5]" />
                全班寫作報告
              </CardTitle>
              <p className="text-sm text-[#718096] mt-1">{question}</p>
            </div>
            {useAIAnalysis && (
              <Badge className="bg-green-100 text-green-700">AI 生成分析</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="feedback" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feedback">總體回饋</TabsTrigger>
              <TabsTrigger value="teaching">教學建議</TabsTrigger>
              <TabsTrigger value="students">學生列表</TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="mt-6 space-y-6">
              {/* Material Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#4A6FA5]" />
                  選材分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.materialAnalysis}
                </div>
              </div>

              {/* Relevance Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#4A6FA5]" />
                  扣題分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.relevanceAnalysis}
                </div>
              </div>

              {/* Theme Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#4A6FA5]" />
                  立意分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.themeAnalysis}
                </div>
              </div>

              {/* Technique Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#4A6FA5]" />
                  寫作手法分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.techniqueAnalysis}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="teaching" className="mt-6">
              <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                {analysis.teachingSuggestion}
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-6">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>學號</TableHead>
                      <TableHead>總分</TableHead>
                      <TableHead>等級</TableHead>
                      <TableHead>內容</TableHead>
                      <TableHead>表達</TableHead>
                      <TableHead>結構</TableHead>
                      <TableHead>標點</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secondaryReports.map((report) => (
                      <TableRow key={report.studentWork.id}>
                        <TableCell>{report.studentWork.name || '未命名'}</TableCell>
                        <TableCell>{report.studentWork.studentId || '-'}</TableCell>
                        <TableCell className="font-bold">{report.totalScore}</TableCell>
                        <TableCell>
                          <Badge variant={report.totalScore >= 70 ? 'default' : report.totalScore >= 50 ? 'secondary' : 'destructive'}>
                            {report.gradeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.grading.content * 4}</TableCell>
                        <TableCell>{report.grading.expression * 3}</TableCell>
                        <TableCell>{report.grading.structure * 2}</TableCell>
                        <TableCell>{report.grading.punctuation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            返回上一步
          </Button>
          
          {isAPIAvailable(apiKey) && (
            <Button 
              variant="outline" 
              onClick={generateAIAnalysis} 
              className="gap-2"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isGenerating ? '生成中...' : 'AI 生成分析'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleExportClassReport} className="gap-2">
            <FileText className="w-4 h-4" />
            下載 HTML
          </Button>
          
          <Button onClick={handleDownloadAll} className="gap-2">
            <Download className="w-4 h-4" />
            一鍵下載全部
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mt-4 bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-700">{error}</AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
}
