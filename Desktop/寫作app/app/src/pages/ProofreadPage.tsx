import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Hash, Save, Edit3, SkipForward, Play, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/hooks/useStore';
import { countWords } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProofreadPageProps {
  onNext: () => void;
  onPrev: () => void;
}

export function ProofreadPage({ onNext, onPrev }: ProofreadPageProps) {
  const {
    studentWorks,
    currentWorkIndex,
    updateStudentWork,
    removeStudentWork,
    setCurrentWorkIndex,
    setStep,
    skippedWorks,
    addSkippedWork,
    removeSkippedWork,
  } = useStore();

  const currentWork = studentWorks[currentWorkIndex];
  const [editedText, setEditedText] = useState(currentWork?.correctedText || '');
  const [editedName, setEditedName] = useState(currentWork?.name || '');
  const [editedStudentId, setEditedStudentId] = useState(currentWork?.studentId || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!currentWork) {
    // 檢查是否有跳過的文章可以恢復
    if (skippedWorks.length > 0) {
      return (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">所有文章已處理</h2>
              <p className="text-sm text-[#718096]">
                您有 {skippedWorks.length} 篇跳過的文章可以恢復
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={() => {
                  const firstSkipped = skippedWorks[0];
                  removeSkippedWork(firstSkipped.id);
                  // 找到原來的索引或添加到末尾
                  const originalIndex = studentWorks.findIndex(w => w.id === firstSkipped.id);
                  if (originalIndex >= 0) {
                    setCurrentWorkIndex(originalIndex);
                  }
                }}
              >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  恢復第一篇文章
                </Button>
                <Button variant="outline" onClick={onNext}>
                  繼續下一步
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }
    
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#718096]">沒有學生作品</p>
      </div>
    );
  }

  const handleSave = () => {
    updateStudentWork(currentWork.id, {
      correctedText: editedText,
      name: editedName,
      studentId: editedStudentId,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleStartGrading = () => {
    handleSave();
    setStep(2);
    onNext();
  };

  const handleSkip = () => {
    // 保存當前文章到跳過列表
    addSkippedWork({
      ...currentWork,
      correctedText: editedText,
      name: editedName,
      studentId: editedStudentId,
    });
    
    // 移動到下一篇
    if (currentWorkIndex < studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex + 1);
      const nextWork = studentWorks[currentWorkIndex + 1];
      setEditedText(nextWork.correctedText);
      setEditedName(nextWork.name);
      setEditedStudentId(nextWork.studentId);
    } else {
      // 已經是最後一篇，檢查是否有跳過的文章
      setCurrentWorkIndex(studentWorks.length); // 設置為超出範圍，觸發空狀態
    }
  };

  const handleDelete = () => {
    // 刪除當前文章
    removeStudentWork(currentWork.id);
    
    // 調整當前索引
    if (studentWorks.length <= 1) {
      // 沒有文章了
      setCurrentWorkIndex(0);
    } else if (currentWorkIndex >= studentWorks.length - 1) {
      // 刪除的是最後一篇，移到前一篇
      setCurrentWorkIndex(studentWorks.length - 2);
      const prevWork = studentWorks[studentWorks.length - 2];
      setEditedText(prevWork.correctedText);
      setEditedName(prevWork.name);
      setEditedStudentId(prevWork.studentId);
    } else {
      // 刪除的是中間的文章，顯示下一篇
      const nextWork = studentWorks[currentWorkIndex + 1];
      setEditedText(nextWork.correctedText);
      setEditedName(nextWork.name);
      setEditedStudentId(nextWork.studentId);
    }
  };

  const handleRestoreSkipped = () => {
    if (skippedWorks.length > 0) {
      const lastSkipped = skippedWorks[skippedWorks.length - 1];
      removeSkippedWork(lastSkipped.id);
      
      // 找到原來的索引
      const originalIndex = studentWorks.findIndex(w => w.id === lastSkipped.id);
      if (originalIndex >= 0) {
        setCurrentWorkIndex(originalIndex);
        setEditedText(lastSkipped.correctedText || lastSkipped.originalText);
        setEditedName(lastSkipped.name);
        setEditedStudentId(lastSkipped.studentId);
      }
    }
  };

  const handlePrevWork = () => {
    if (currentWorkIndex > 0) {
      setCurrentWorkIndex(currentWorkIndex - 1);
      const prevWork = studentWorks[currentWorkIndex - 1];
      setEditedText(prevWork.correctedText);
      setEditedName(prevWork.name);
      setEditedStudentId(prevWork.studentId);
    }
  };

  const handleNextWork = () => {
    if (currentWorkIndex < studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex + 1);
      const nextWork = studentWorks[currentWorkIndex + 1];
      setEditedText(nextWork.correctedText);
      setEditedName(nextWork.name);
      setEditedStudentId(nextWork.studentId);
    }
  };

  const handleGoToSetup = () => {
    handleSave();
    setStep(0);
    onPrev();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      {/* Student Info Bar */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#4A6FA5]" />
                <div>
                  <Label className="text-xs text-[#718096]">姓名</Label>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-32 h-8 mt-1"
                    placeholder="姓名"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#4A6FA5]" />
                <div>
                  <Label className="text-xs text-[#718096]">學號</Label>
                  <Input
                    value={editedStudentId}
                    onChange={(e) => setEditedStudentId(e.target.value)}
                    className="w-32 h-8 mt-1"
                    placeholder="學號"
                  />
                </div>
              </div>
            </div>
            
            {studentWorks.length > 1 && (
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-[#4A6FA5]">
                  第 {currentWorkIndex + 1} / {studentWorks.length} 篇
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevWork}
                    disabled={currentWorkIndex === 0}
                  >
                    上一篇
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextWork}
                    disabled={currentWorkIndex === studentWorks.length - 1}
                  >
                    下一篇
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Text Editor */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#4A6FA5]" />
              <h2 className="text-lg font-semibold">原文校對</h2>
            </div>
            <div className="text-sm text-[#718096]">
              字數：{countWords(editedText)}
            </div>
          </div>
          <p className="text-xs text-[#718096]">
            請檢查並修正因 OCR 掃描而出現的錯字，不要改動學生的錯別字
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[500px] font-mono text-base leading-relaxed"
            placeholder="學生作文內容..."
          />
        </CardContent>
      </Card>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            返回上一步
          </Button>
          
          <Button variant="outline" onClick={handleGoToSetup} className="gap-2">
            返回設定頁
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          {skippedWorks.length > 0 && (
            <Button variant="outline" onClick={handleRestoreSkipped} className="gap-2 text-[#5A9A7D]">
              <RotateCcw className="w-4 h-4" />
              加回此篇 ({skippedWorks.length})
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleSave}
            className={`gap-2 ${isSaved ? 'text-[#5A9A7D] border-[#5A9A7D]' : ''}`}
          >
            <Save className="w-4 h-4" />
            {isSaved ? '已保存' : '保存修改'}
          </Button>
          
          {studentWorks.length > 1 && (
            <Button variant="outline" onClick={handleSkip} className="gap-2 text-[#C4A35A]">
              <SkipForward className="w-4 h-4" />
              跳過此篇
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
                刪除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確認刪除</AlertDialogTitle>
                <AlertDialogDescription>
                  您確定要刪除這篇文章嗎？此操作無法撤銷。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  刪除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button onClick={handleStartGrading} className="gap-2">
            <Play className="w-4 h-4" />
            開始批改
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
