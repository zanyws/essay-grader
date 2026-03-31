import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, RefreshCw, FileText, TrendingUp, BookOpen, Lightbulb, PenTool, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore } from '@/hooks/useStore';
import { generateClassAnalysisWithAPI, isAPIAvailable } from '@/lib/api';
import type { APIConfig } from '@/types';
import { getPracticalGradeLabel } from '@/lib/gradingCriteria';

interface PracticalClassReportPageProps {
  onPrev: () => void;
}

// 默認分析數據
const defaultAnalysis = {
  materialAnalysis: `全班學生的實用寫作呈現以下特點：

1. 資訊處理能力：
   • 良好：約50%的學生能準確提取題目要求的資訊
   • 一般：約35%的學生能提取部分資訊，但有所遺漏
   • 待改善：約15%的學生未能準確理解資訊要求

2. 內容發展：
   • 多數學生能根據情境展開內容
   • 部分學生論點闡述較為簡略
   • 少數學生能有效運用題目提供的資料

3. 常見問題：
   • 部分學生未能充分回應所有要求點
   • 論點發展深度不足，缺乏具體例子`,

  relevanceAnalysis: `扣題情況分析：

1. 整體表現：
   • 準確扣題：約55%的學生能準確理解寫作任務
   • 基本扣題：約35%的學生大致理解，但有偏差
   • 扣題不準：約10%的學生對寫作目的理解有誤

2. 常見問題：
   • 部分學生未能準確把握寫作對象和目的
   • 少數學生混淆了不同文體的格式要求
   • 個別學生忽略了題目的特定情境設定

3. 改進建議：
   • 加強審題訓練，明確寫作目的、對象、情境
   • 練習分析題目要求的各個要素
   • 寫作前列出必須回應的要點清單`,

  themeAnalysis: `行文語氣分析：

1. 語氣運用：
   • 得體：約45%的學生能根據情境使用適當語氣
   • 尚可：約40%的學生語氣基本合適，偶有偏差
   • 待改善：約15%的學生語氣不當，過於口語或過於正式

2. 優點：
   • 部分學生能因應不同對象調整語氣
   • 少數學生能運用恰當的禮貌用語
   • 部分學生表達清晰，條理分明

3. 問題：
   • 多數學生語氣單一，缺乏變化
   • 部分學生措辭不夠精準，影響表達效果
   • 少數學生過於口語化，缺乏書面語意識`,

  techniqueAnalysis: `格式與組織分析：

1. 格式運用：
   • 準確：約40%的學生能正確運用格式
   • 基本正確：約45%的學生格式大致正確，有小錯誤
   • 錯誤較多：約15%的學生格式問題較多

2. 結構組織：
   • 部分學生能有條理地組織內容
   • 少數學生能有效運用分段和過渡
   • 部分學生結構鬆散，缺乏層次

3. 常見格式錯誤：
   • 稱謂、署名位置不當
   • 日期格式錯誤
   • 缺少必要的開場或結語`,

  teachingSuggestion: `實用寫作教學建議：

一、教學重點
1. 審題訓練：明確寫作目的、對象、情境三要素
2. 格式學習：掌握常見實用文格式的規範要求
3. 語氣運用：根據不同情境調整語氣和措辭
4. 內容組織：學習有條理地展開論點
5. 資訊處理：準確提取和運用題目資訊

二、具體教學活動
1. 格式對比練習：比較不同文體的格式差異
2. 語氣辨析活動：分析不同情境下的適當語氣
3. 審題要點訓練：練習提取題目關鍵資訊
4. 小組互評：同儕互相評改實用文
5. 範文研讀：分析優秀實用文的特點

三、練習題目推薦
1. 演講辭：畢業典禮致辭、學生會競選演說
2. 書信：投訴信、建議信、感謝信
3. 建議書：改善校園設施、活動企劃書
4. 報告：活動檢討報告、讀書報告

四、後續跟進
1. 建立常見格式錯誤清單，針對性糾正
2. 定期進行實用文寫作練習
3. 組織同儕互評活動
4. 提供個別輔導，針對性改善弱點`
};

export function PracticalClassReportPage({ onPrev }: PracticalClassReportPageProps) {
  const { practicalReports, customQuestion, apiKey, apiType, apiModel } = useStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState(defaultAnalysis);
  const [useAIAnalysis, setUseAIAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (practicalReports.length === 0) return null;
    
    const totalStudents = practicalReports.length;
    const averageScore = practicalReports.reduce((sum, r) => sum + r.totalScore, 0) / totalStudents;
    const maxScore = Math.max(...practicalReports.map(r => r.totalScore));
    const minScore = Math.min(...practicalReports.map(r => r.totalScore));
    
    return { totalStudents, averageScore: averageScore.toFixed(1), maxScore, minScore };
  }, [practicalReports]);

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

      const result = await generateClassAnalysisWithAPI(practicalReports, customQuestion, apiConfig, 'practical');
      setAnalysis(result);
      setUseAIAnalysis(true);
    } catch (e: any) {
      console.error('生成 AI 分析失敗:', e);
      setError(`生成 AI 分析失敗: ${e.message}，將使用預設分析`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const content = `
實用寫作全班報告
題目：${customQuestion}

統計：
- 總人數：${stats?.totalStudents}
- 平均分：${stats?.averageScore}
- 最高分：${stats?.maxScore}
- 最低分：${stats?.minScore}

學生分數：
${practicalReports.map(r => `${r.studentWork.name}\t${r.totalScore}\t${getPracticalGradeLabel(r.totalScore)}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '實用寫作全班報告.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (practicalReports.length === 0) {
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">總人數</p>
            <p className="text-2xl font-bold text-[#B5726E]">{stats?.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">平均分</p>
            <p className="text-2xl font-bold text-[#B5726E]">{stats?.averageScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">最高分</p>
            <p className="text-2xl font-bold text-[#B5726E]">{stats?.maxScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">最低分</p>
            <p className="text-2xl font-bold text-[#B5726E]">{stats?.minScore}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-[#B5726E]" />
                全班寫作報告
              </CardTitle>
              <p className="text-sm text-[#718096] mt-1">{customQuestion}</p>
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
                  <BookOpen className="w-5 h-5 text-[#B5726E]" />
                  資訊與內容分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.materialAnalysis}
                </div>
              </div>

              {/* Relevance Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#B5726E]" />
                  扣題分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.relevanceAnalysis}
                </div>
              </div>

              {/* Theme Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[#B5726E]" />
                  行文語氣分析
                </h3>
                <div className="p-4 bg-[#F7F9FB] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
                  {analysis.themeAnalysis}
                </div>
              </div>

              {/* Technique Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#B5726E]" />
                  格式與組織分析
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
                      <TableHead>總分</TableHead>
                      <TableHead>等級</TableHead>
                      <TableHead>內容(30)</TableHead>
                      <TableHead>行文組織(20)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {practicalReports.map((report) => (
                      <TableRow key={report.studentWork.id}>
                        <TableCell>{report.studentWork.name || '未命名'}</TableCell>
                        <TableCell className="font-bold">{report.totalScore}</TableCell>
                        <TableCell>
                          <Badge className="bg-[#B5726E]">{getPracticalGradeLabel(report.totalScore)}</Badge>
                        </TableCell>
                        <TableCell>{report.contentScore}</TableCell>
                        <TableCell>{report.organizationScore}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <FileText className="w-4 h-4" />
            導出報告
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
