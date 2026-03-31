import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface ComparisonViewProps {
  originalText: string;
  enhancedText: string;
  notes: string[];
}

export function ComparisonView({ originalText, enhancedText, notes }: ComparisonViewProps) {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showEnhanced, setShowEnhanced] = useState(true);

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOriginal(!showOriginal)}
          className={cn(
            'gap-2',
            showOriginal ? 'border-[#4A6FA5] text-[#4A6FA5]' : 'text-[#718096]'
          )}
        >
          {showOriginal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          原文
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEnhanced(!showEnhanced)}
          className={cn(
            'gap-2',
            showEnhanced ? 'border-[#5A9A7D] text-[#5A9A7D]' : 'text-[#718096]'
          )}
        >
          {showEnhanced ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          增潤後
        </Button>
      </div>

      {/* Comparison */}
      <div className="grid gap-4" style={{ 
        gridTemplateColumns: showOriginal && showEnhanced ? '1fr 1fr' : '1fr' 
      }}>
        {showOriginal && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-[#718096]">原文</h4>
            <div className="p-4 bg-[#F7F9FB] rounded-lg border border-[#E2E8F0]">
              <p className="text-sm text-[#2D3748] whitespace-pre-wrap leading-relaxed">
                {originalText}
              </p>
            </div>
          </div>
        )}
        
        {showEnhanced && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-[#5A9A7D]">增潤後</h4>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-[#2D3748] whitespace-pre-wrap leading-relaxed">
                {enhancedText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Enhancement Notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[#2D3748]">增潤說明</h4>
          <ul className="space-y-1">
            {notes.map((note, index) => (
              <li 
                key={index} 
                className="text-sm text-[#2D3748] flex items-start gap-2"
              >
                <span className="text-[#4A6FA5] font-medium">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
