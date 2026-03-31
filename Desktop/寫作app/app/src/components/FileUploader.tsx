import { useCallback, useState } from 'react';
import { Upload, Image, FileType, X, Loader2 } from 'lucide-react';
import { cn, generateId, formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { FileInfo } from '@/types';

interface FileUploaderProps {
  onFilesSelected: (files: FileInfo[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  'image': Image,
  'application/pdf': FileType,
  'application/msword': FileType,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileType,
};

export function FileUploader({
  onFilesSelected,
  acceptedTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxFiles = 50,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<(FileInfo & { file?: File })[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    return FILE_ICONS[type] || FileType;
  };

  const processFiles = useCallback(async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      alert(`最多只能上傳 ${maxFiles} 個文件`);
      return;
    }

    setIsProcessing(true);
    const newFiles: (FileInfo & { file?: File })[] = [];

    for (const file of Array.from(fileList)) {
      // 檢查文件類型
      const isAccepted = acceptedTypes.some(type => {
        if (type.includes('*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });

      if (!isAccepted) {
        console.warn(`不支持的文件類型: ${file.type}`);
        continue;
      }

      const fileInfo: FileInfo & { file?: File } = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file, // 保存實際文件對象
      };

      newFiles.push(fileInfo);
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles.map(({ file, ...info }) => info));
    setIsProcessing(false);
  }, [files, maxFiles, acceptedTypes, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles.map(({ file, ...info }) => info));
  }, [files, onFilesSelected]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
          isDragging
            ? 'border-[#4A6FA5] bg-[#E8EEF5]'
            : 'border-[#E2E8F0] bg-white hover:border-[#4A6FA5] hover:bg-[#F7F9FB]'
        )}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-200',
            isDragging ? 'bg-[#4A6FA5]' : 'bg-[#E8EEF5]'
          )}>
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-[#4A6FA5] animate-spin" />
            ) : (
              <Upload className={cn(
                'w-8 h-8 transition-colors duration-200',
                isDragging ? 'text-white' : 'text-[#4A6FA5]'
              )} />
            )}
          </div>
          
          <div>
            <p className="text-[#2D3748] font-medium">
              {isProcessing ? '處理中...' : `拖放文件至此或點擊上傳`}
            </p>
            <p className="text-sm text-[#718096] mt-1">
              支持 JPG、PNG、PDF、WORD 格式
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#2D3748]">
              已上傳文件 ({files.length})
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiles([]);
                onFilesSelected([]);
              }}
              className="text-[#B5726E] hover:text-[#B5726E] hover:bg-red-50"
            >
              全部清除
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {files.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-white border border-[#E2E8F0] rounded-lg"
                >
                  <div className="w-10 h-10 bg-[#E8EEF5] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#4A6FA5]" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2D3748] truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-[#718096]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    className="w-8 h-8 text-[#718096] hover:text-[#B5726E] hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
