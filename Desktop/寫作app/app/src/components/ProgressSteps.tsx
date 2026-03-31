import { Check, Upload, FileText, ClipboardCheck, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppMode } from '@/types';

interface ProgressStepsProps {
  currentStep: number;
  mode?: AppMode;
}

const steps = [
  { id: 0, label: '設定與上傳', icon: Upload },
  { id: 1, label: '原文校對', icon: FileText },
  { id: 2, label: '批改報告', icon: ClipboardCheck },
  { id: 3, label: '全班報告', icon: Users },
];

const modeColors: Record<AppMode, { primary: string; secondary: string }> = {
  secondary: { primary: 'bg-[#4A6FA5]', secondary: 'bg-[#5A9A7D]' },
  primary: { primary: 'bg-[#5A9A7D]', secondary: 'bg-[#4A8A6D]' },
  practical: { primary: 'bg-[#B5726E]', secondary: 'bg-[#A5625E]' },
  'exam-generator': { primary: 'bg-[#B5726E]', secondary: 'bg-[#A5625E]' },
};

export function ProgressSteps({ currentStep, mode = 'secondary' }: ProgressStepsProps) {
  const colors = modeColors[mode];

  return (
    <div className="w-full py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isPending = currentStep < step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      isCompleted && colors.secondary,
                      isCurrent && `${colors.primary} text-white ring-4 ring-[#E8EEF5]`,
                      isPending && 'bg-[#E2E8F0] text-[#718096]'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium transition-colors duration-300',
                      isCompleted && `text-${colors.secondary.replace('bg-', '')}`,
                      isCurrent && `text-${colors.primary.replace('bg-[', '').replace(']', '')}`,
                      isPending && 'text-[#718096]'
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-1 mx-4 transition-colors duration-300',
                      isCompleted ? colors.secondary.replace('bg-', 'bg-') : 'bg-[#E2E8F0]'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
