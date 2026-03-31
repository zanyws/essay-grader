import { cn } from '@/lib/utils';
import type { Feedback } from '@/types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ReportSectionProps {
  title: string;
  feedback: Feedback;
  className?: string;
}

export function ReportSection({ title, feedback, className }: ReportSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold text-[#2D3748]">{title}</h3>
      
      {feedback.strengths.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5A9A7D]" />
            <h4 className="text-sm font-medium text-[#5A9A7D]">優點</h4>
          </div>
          <ul className="space-y-1 pl-6">
            {feedback.strengths.map((strength, index) => (
              <li 
                key={index} 
                className="text-sm text-[#2D3748] leading-relaxed"
              >
                • {strength}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {feedback.improvements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D4A574]" />
            <h4 className="text-sm font-medium text-[#D4A574]">可改善之處</h4>
          </div>
          <ul className="space-y-1 pl-6">
            {feedback.improvements.map((improvement, index) => (
              <li 
                key={index} 
                className="text-sm text-[#2D3748] leading-relaxed"
              >
                • {improvement}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
