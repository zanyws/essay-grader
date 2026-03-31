
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, User, Trash2, RotateCcw, SkipForward, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/hooks/useStore';
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

interface PrimaryProofreadPageProps {
  onNext: () => void;
  onPrev: () => void;
}

export function PrimaryProofreadPage({ onNext, onPrev }: PrimaryProofreadPageProps) {
  const { 
    studentWorks, 
    currentWorkIndex, 
    updateStudentWork, 
    removeStudentWork,
    setCurrentWorkIndex,
    skippedWorks,
    addSkippedWork,
    removeSkippedWork,
    setStep,
  } = useStore();
  
  const currentWork = studentWorks[currentWorkIndex];
  
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
                  const originalIndex = studentWorks.findIndex(w => w.id === firstSkipped.id);
                  if (originalIndex >= 0) {
                    setCurrentWorkIndex(originalIndex);
                  }
                }} className="bg-[#5A9A7D]">
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

  const handleTextChange = (value: string) => {
    updateStudentWork(currentWork.id, { correctedText: value });
  };

  const handleNextWork = () => {
    if (currentWorkIndex < studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex + 1);
    } else {
      onNext();
    }
  };

  const handlePrevWork = () => {
    if (currentWorkIndex > 0) {
      setCurrentWorkIndex(currentWorkIndex - 1);
    }
  };

  const handleSkip = () => {
    addSkippedWork({
      ...currentWork,
      correctedText: currentWork.correctedText,
    });
    
    if (currentWorkIndex < studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex + 1);
    } else {
      setCurrentWorkIndex(studentWorks.length);
    }
  };

  const handleDelete = () => {
    removeStudentWork(currentWork.id);
    
    if (studentWorks.length <= 1) {
      setCurrentWorkIndex(0);
    } else if (currentWorkIndex >= studentWorks.length - 1) {
      setCurrentWorkIndex(studentWorks.length - 2);
    }
  };

  const handleRestoreSkipped = () => {
    if (skippedWorks.length > 0) {
      const lastSkipped = skippedWorks[skippedWorks.length - 1];
      removeSkippedWork(lastSkipped.id);
      const originalIndex = studentWorks.findIndex(w => w.id === lastSkipped.id);
      if (originalIndex >= 0) {
        setCurrentWorkIndex(originalIndex);
      }
    }
  };

  const handleStartGrading = () => {
    setStep(2);
    onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#5A9A7D]" />
              <span className="font-semibold">{currentWork.name || '未命名'}</span>
              <span className="text-[#718096]">{currentWork.studentId}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#718096]">
                {currentWorkIndex + 1} / {studentWorks.length}
              </span>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#718096]">
              <Edit3 className="w-4 h-4" />
              <span>請校對以下原文，可直接修改</span>
            </div>
            <Textarea
              value={currentWork.correctedText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[400px] font-mono text-base leading-relaxed"
            />
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onPrev} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            返回上一步
          </Button>
          
          {skippedWorks.length > 0 && (
            <Button variant="outline" onClick={handleRestoreSkipped} className="gap-2 text-[#5A9A7D]">
              <RotateCcw className="w-4 h-4" />
              加回此篇 ({skippedWorks.length})
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
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
          
          <Button onClick={handleStartGrading} className="gap-2 bg-[#5A9A7D] hover:bg-[#4a8a6d]">
            <Play className="w-4 h-4" />
            開始批改
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
