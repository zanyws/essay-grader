import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SECONDARY_GRADE_LABELS } from '@/types';

interface GradingSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  scoreMultiplier?: number;
  disabled?: boolean;
  warning?: string;
}

export function GradingSlider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  description,
  scoreMultiplier,
  disabled = false,
  warning
}: GradingSliderProps) {
  const displayScore = scoreMultiplier ? value * scoreMultiplier : value;
  const maxScore = scoreMultiplier ? max * scoreMultiplier : max;

  return (
    <div className={cn('space-y-3', disabled && 'opacity-60')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-[#2D3748]">{label}</Label>
          {description && (
            <span className="text-xs text-[#718096]">({description})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-2 py-1 text-xs font-medium rounded',
            value >= 8 ? 'bg-green-100 text-green-700' :
            value >= 5 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {SECONDARY_GRADE_LABELS[value]}
          </span>
          <span className="text-sm font-bold text-[#4A6FA5]">
            {displayScore}/{maxScore}
          </span>
        </div>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'w-full',
          disabled && 'cursor-not-allowed'
        )}
      />
      
      {warning && (
        <p className="text-xs text-[#C9A959]">{warning}</p>
      )}
      
      <div className="flex justify-between text-xs text-[#718096]">
        <span>{SECONDARY_GRADE_LABELS[min]}</span>
        <span>{SECONDARY_GRADE_LABELS[max]}</span>
      </div>
    </div>
  );
}
