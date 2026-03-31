import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Trash2 } from 'lucide-react';
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

interface PracticalProofreadPageProps {
  onNext: () => void;
  onPrev: () => void;
}

export function PracticalProofreadPage({ onNext, onPrev }: PracticalProofreadPageProps) {
  const { studentWorks, currentWorkIndex, updateStudentWork, setCurrentWorkIndex, removeStudentWork } = useStore();
  
  const currentWork = studentWorks[currentWorkIndex];
  
  if (!currentWork) {
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

  const handleDeleteWork = () => {
    removeStudentWork(currentWork.id);
    // 如果刪除後沒有文章了，返回上一步
    if (studentWorks.length <= 1) {
      onPrev();
    }
    // 如果刪除的是最後一篇，索引減1
    else if (currentWorkIndex >= studentWorks.length - 1) {
      setCurrentWorkIndex(currentWorkIndex - 1);
    }
    // 否則保持當前索引（顯示下一篇）
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
              <User className="w-5 h-5 text-[#B5726E]" />
              <span className="font-semibold">{currentWork.name || '未命名'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#718096]">
                {currentWorkIndex + 1} / {studentWorks.length}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-[#B5726E] hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確認刪除</AlertDialogTitle>
                    <AlertDialogDescription>
                      確定要刪除「{currentWork.name || '未命名'}」的文章嗎？此操作無法撤銷。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteWork} className="bg-red-500 hover:bg-red-600">
                      刪除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentWork.correctedText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="min-h-[400px] font-mono text-base leading-relaxed"
          />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 z-40">
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          返回上一步
        </Button>
        
        <Button onClick={handleNextWork} className="gap-2 bg-[#B5726E] hover:bg-[#a5625e]">
          {currentWorkIndex < studentWorks.length - 1 ? '下一篇' : '開始批改'}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
