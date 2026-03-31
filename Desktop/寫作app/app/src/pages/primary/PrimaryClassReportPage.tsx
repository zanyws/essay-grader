import { motion } from 'framer-motion';
import { ChevronLeft, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStore } from '@/hooks/useStore';
import { useMemo } from 'react';

interface PrimaryClassReportPageProps {
  onPrev: () => void;
}

export function PrimaryClassReportPage({ onPrev }: PrimaryClassReportPageProps) {
  const { primaryReports, customQuestion } = useStore();

  const stats = useMemo(() => {
    if (primaryReports.length === 0) return null;
    
    const totalStudents = primaryReports.length;
    const averageScore = primaryReports.reduce((sum, r) => sum + r.totalScore, 0) / totalStudents;
    const maxScore = Math.max(...primaryReports.map(r => r.totalScore));
    const minScore = Math.min(...primaryReports.map(r => r.totalScore));
    
    return { totalStudents, averageScore: averageScore.toFixed(1), maxScore, minScore };
  }, [primaryReports]);

  const handleExport = () => {
    const content = `
小學命題寫作全班報告
題目：${customQuestion}

統計：
- 總人數：${stats?.totalStudents}
- 平均分：${stats?.averageScore}
- 最高分：${stats?.maxScore}
- 最低分：${stats?.minScore}

學生分數：
${primaryReports.map(r => `${r.studentWork.name}\t${r.totalScore}\t${r.gradeLevel}`).join('\n')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '小學全班報告.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (primaryReports.length === 0) {
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
            <p className="text-2xl font-bold text-[#5A9A7D]">{stats?.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-[#718096]">平均分</p>
            <p className="text-2xl font-bold text-[#5A9A7D]">{stats?.averageScore}</p>
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
            <p className="text-2xl font-bold text-[#5A9A7D]">{stats?.minScore}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5A9A7D]" />
              全班寫作報告
            </CardTitle>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              導出報告
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="students">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="students">學生列表</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-6">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>總分</TableHead>
                      <TableHead>等級</TableHead>
                      <TableHead>內容</TableHead>
                      <TableHead>感受</TableHead>
                      <TableHead>結構</TableHead>
                      <TableHead>語言</TableHead>
                      <TableHead>格式</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {primaryReports.map((report) => (
                      <TableRow key={report.studentWork.id}>
                        <TableCell>{report.studentWork.name || '未命名'}</TableCell>
                        <TableCell className="font-bold">{report.totalScore}</TableCell>
                        <TableCell>
                          <Badge className="bg-[#5A9A7D]">{report.gradeLevel}</Badge>
                        </TableCell>
                        <TableCell>{report.grading.content}</TableCell>
                        <TableCell>{report.grading.feeling}</TableCell>
                        <TableCell>{report.grading.structure}</TableCell>
                        <TableCell>{report.grading.language}</TableCell>
                        <TableCell>{report.grading.format}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center px-6 z-40">
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          返回上一步
        </Button>
      </div>
    </motion.div>
  );
}
