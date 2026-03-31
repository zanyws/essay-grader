import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Upload, FileText, X, AlertCircle, Check, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore } from '@/hooks/useStore';
import type { FileInfo, StudentWork } from '@/types';
import { generateId, readFileAsText, readFileAsDataURL } from '@/lib/utils';
import { extractTextWithAPI, extractAndOrganizeWithAPI, isAPIAvailable } from '@/lib/api';
import type { APIConfig } from '@/types';
import { PRACTICAL_FORMAT_REQUIREMENTS } from '@/lib/gradingCriteria';

interface PracticalSetupPageProps {
  onNext: () => void;
}

interface ExtendedFileInfo extends FileInfo {
  file?: File;
}

export function PracticalSetupPage({ onNext }: PracticalSetupPageProps) {
  const {
    customQuestion,
    practicalGenre,
    autoGrade,
    ignoreRedInk,
    uploadedFiles,
    customCriteriaFiles,
    practicalCriteriaConfirmed,
    apiKey,
    apiType,
    apiModel,
    setCustomQuestion,
    setPracticalGenre,
    setAutoGrade,
    setIgnoreRedInk,
    addStudentWork,
    addUploadedFile,
    removeUploadedFile,
    clearUploadedFiles,
    addCustomCriteriaFile,
    removeCustomCriteriaFile,
    clearCustomCriteriaFiles,
    setPracticalInfoPoints,
    setPracticalDevItems,
    setPracticalFormatRequirements,
    setPracticalCriteriaConfirmed,
    resetPracticalCriteria,
    setCurrentWorkIndex,
    setStep,
  } = useStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [manualText, setManualText] = useState('');
  const [activeStudentTab, setActiveStudentTab] = useState('upload');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 三個輸入欄位的模式（upload / paste）
  const [questionMode, setQuestionMode] = useState<'upload' | 'paste'>('upload');
  const [materialMode, setMaterialMode] = useState<'upload' | 'paste'>('paste');
  const [criteriaMode, setCriteriaMode] = useState<'upload' | 'paste'>('paste');

  // 貼上文字內容
  const [pastedQuestion, setPastedQuestion] = useState('');
  const [pastedMaterial, setPastedMaterial] = useState('');
  const [pastedCriteria, setPastedCriteria] = useState('');

  // 確認評分準則的本地狀態
  const [localInfoPoints, setLocalInfoPoints] = useState<string[]>([]);
  const [localDevLabel, setLocalDevLabel] = useState('');
  const [newInfoPoint, setNewInfoPoint] = useState('');
  const [criteriaReady, setCriteriaReady] = useState(false);

  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

  // ---- 學生作品文件處理 ----
  const handleStudentFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
      if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        setError(`不支持的文件類型: ${file.name}。請上傳 JPG、PNG、PDF 或 Word 文件。`);
        continue;
      }
      const fileInfo: ExtendedFileInfo = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        file,
      };
      addUploadedFile(fileInfo);
    }
    if (studentFileInputRef.current) studentFileInputRef.current.value = '';
    setSuccess(`已添加 ${files.length} 個文件`);
    setTimeout(() => setSuccess(null), 3000);
  }, [addUploadedFile]);

  // ---- 題目文件上傳（舊流程，upload 模式仍保留即時提取）----
  const handleQuestionFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.txt'];
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      setError(`不支持的文件類型: ${file.name}`);
      return;
    }
    if (!isAPIAvailable(apiKey)) {
      setError('請先在右上角設定有效的 API 密鑰');
      return;
    }
    setIsOrganizing(true);
    setError(null);
    try {
      const fileInfo: ExtendedFileInfo = {
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        file,
      };
      addCustomCriteriaFile(fileInfo);

      let fileContent: string;
      if (file.type.startsWith('image/') || file.type.includes('pdf')) {
        fileContent = await readFileAsDataURL(file);
      } else {
        fileContent = await readFileAsText(file);
      }

      const apiConfig: APIConfig = { apiKey, apiType: apiType as any, model: apiModel };
      const result = await extractAndOrganizeWithAPI(
        { fileContent, fileType: file.type },
        { pastedQuestion: '', pastedMaterial: '', pastedCriteria: '' },
        apiConfig
      );

      if (result.question) setCustomQuestion(result.question);
      _applyOrganizedCriteria(result);
      setSuccess('已從文件提取並整理評分準則，請在下方確認');
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(`提取失敗: ${e.message}`);
    } finally {
      setIsOrganizing(false);
      if (questionFileInputRef.current) questionFileInputRef.current.value = '';
    }
  }, [apiKey, apiType, apiModel, addCustomCriteriaFile, setCustomQuestion]);

  // 將 AI 整理結果套用到本地狀態
  const _applyOrganizedCriteria = (result: { question?: string; infoPoints?: string[]; devLabel?: string }) => {
    if (result.infoPoints && result.infoPoints.length > 0) {
      setLocalInfoPoints(result.infoPoints);
    } else {
      setLocalInfoPoints(['計劃名稱／活動名稱', '計劃目的／背景', '寫作身份／動機']);
    }

    if (result.devLabel) {
      setLocalDevLabel(result.devLabel);
    } else {
      const devDefaults: Record<string, string> = {
        speech:     '2項措施、4個措施細項、3項同學意見',
        letter:     '2項個人條件、4個條件細項、3項同學意見',
        proposal:   '2個建議、4個建議細項、3項同學意見',
        report:     '2個調查類別、4個調查意見、2個改善建議',
        commentary: '2個目標、4項活動、4項同學意見',
        article:    '2個目標、4項活動細項、4項意見',
      };
      setLocalDevLabel(devDefaults[practicalGenre] || '相關細項');
    }

    resetPracticalCriteria();
    setCriteriaReady(false);
  };

  // ---- AI 整理準則（貼上模式）----
  const handleOrganizeCriteria = async () => {
    if (!pastedQuestion.trim() && !pastedMaterial.trim() && !pastedCriteria.trim()) {
      setError('請先貼上題目、資料內容或評分準則');
      return;
    }
    if (!isAPIAvailable(apiKey)) {
      setError('請先在右上角設定有效的 API 密鑰');
      return;
    }
    setIsOrganizing(true);
    setError(null);

    try {
      const apiConfig: APIConfig = { apiKey, apiType: apiType as any, model: apiModel };

      // 若已有學生文件，與第一個文件合併為一次請求
      const firstFile = uploadedFiles.length > 0 ? (uploadedFiles[0] as ExtendedFileInfo) : null;
      let studentContent: { fileContent?: string; fileType?: string; text?: string } = {};

      if (firstFile?.file) {
        const isImageOrPDF = firstFile.type.startsWith('image/') || firstFile.type.includes('pdf');
        studentContent = {
          fileContent: isImageOrPDF
            ? await readFileAsDataURL(firstFile.file)
            : await readFileAsText(firstFile.file),
          fileType: firstFile.type,
        };
      } else if (manualText.trim()) {
        studentContent = { text: manualText };
      }

      const result = await extractAndOrganizeWithAPI(
        studentContent,
        { pastedQuestion, pastedMaterial, pastedCriteria },
        apiConfig,
        ignoreRedInk
      );

      // 若同時提取了學生作品，先保存（第一個文件已提取）
      if (result.studentText && firstFile) {
        const studentWork: StudentWork = {
          id: generateId(),
          name: result.studentName || '未命名',
          studentId: result.studentId || '',
          originalText: result.studentText,
          correctedText: result.studentText,
          fileName: firstFile.name,
        };
        addStudentWork(studentWork);
        // 標記第一個文件已處理
        removeUploadedFile(firstFile.id);
        setSuccess(`已整理評分準則，並同時提取了「${firstFile.name}」的文字（節省一次請求）`);
      } else {
        setSuccess('已整理評分準則，請在下方確認後繼續');
      }

      if (result.question) setCustomQuestion(result.question);
      _applyOrganizedCriteria(result);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(`整理失敗: ${e.message}`);
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleRemoveStudentFile = useCallback((id: string) => {
    removeUploadedFile(id);
  }, [removeUploadedFile]);

  const handleRemoveQuestionFile = useCallback((id: string) => {
    removeCustomCriteriaFile(id);
    setCustomQuestion('');
    setLocalInfoPoints([]);
    setCriteriaReady(false);
    setPracticalCriteriaConfirmed(false);
  }, [removeCustomCriteriaFile, setCustomQuestion, setPracticalCriteriaConfirmed]);

  // ---- 確認評分準則 ----
  const handleConfirmCriteria = () => {
    if (localInfoPoints.length === 0) {
      setError('請至少填寫一項資訊分考核項目');
      return;
    }
    setPracticalInfoPoints(localInfoPoints);
    setPracticalDevItems({ label: localDevLabel });
    setPracticalFormatRequirements([]);
    setPracticalCriteriaConfirmed(true);
    setCriteriaReady(true);
    setError(null);
    setSuccess('評分準則已確認！');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleAddInfoPoint = () => {
    if (newInfoPoint.trim()) {
      setLocalInfoPoints([...localInfoPoints, newInfoPoint.trim()]);
      setNewInfoPoint('');
    }
  };

  const handleRemoveInfoPoint = (idx: number) => {
    setLocalInfoPoints(localInfoPoints.filter((_, i) => i !== idx));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ---- 開始處理 ----
  const handleStartProcessing = async () => {
    setError(null);
    setSuccess(null);

    if (uploadedFiles.length === 0 && !manualText.trim()) {
      setError('請上傳文件或輸入文字');
      return;
    }
    if (!isAPIAvailable(apiKey)) {
      setError('請先在右上角設定有效的 API 密鑰');
      return;
    }
    if (!customQuestion.trim()) {
      setError('請先填寫題目，或使用「AI整理準則」按鈕提取題目');
      return;
    }

    setIsProcessing(true);

    try {
      const apiConfig: APIConfig = { apiKey, apiType: apiType as any, model: apiModel };

      for (const fileInfo of uploadedFiles) {
        try {
          if (!(fileInfo as ExtendedFileInfo).file) continue;
          const f = (fileInfo as ExtendedFileInfo).file!;
          let fileContent: string;
          if (fileInfo.type.startsWith('image/') || fileInfo.type.includes('pdf')) {
            fileContent = await readFileAsDataURL(f);
          } else {
            fileContent = await readFileAsText(f);
          }

          const result = await extractTextWithAPI(fileContent, fileInfo.type, apiConfig, ignoreRedInk);

          if (result.articles && result.articles.length > 1) {
            for (const article of result.articles) {
              addStudentWork({
                id: generateId(),
                name: article.name || '未命名',
                studentId: article.studentId || '',
                originalText: article.text,
                correctedText: article.text,
                fileName: `${fileInfo.name} - ${article.name || '未命名'}`,
              });
            }
          } else {
            addStudentWork({
              id: generateId(),
              name: result.name || '未命名',
              studentId: result.studentId || '',
              originalText: result.text,
              correctedText: result.text,
              fileName: fileInfo.name,
            });
          }
        } catch (e: any) {
          setError(`處理文件 ${fileInfo.name} 失敗: ${e.message}`);
          setIsProcessing(false);
          return;
        }
      }

      if (manualText.trim()) {
        try {
          const result = await extractTextWithAPI(manualText, 'text/plain', apiConfig, ignoreRedInk);
          if (result.articles && result.articles.length > 0) {
            for (const article of result.articles) {
              addStudentWork({
                id: generateId(),
                name: article.name || `學生${result.articles!.indexOf(article) + 1}`,
                studentId: article.studentId || '',
                originalText: article.text,
                correctedText: article.text,
              });
            }
          } else {
            addStudentWork({
              id: generateId(),
              name: result.name || '未命名',
              studentId: result.studentId || '',
              originalText: result.text,
              correctedText: result.text,
            });
          }
        } catch {
          addStudentWork({
            id: generateId(),
            name: '手動輸入',
            studentId: '',
            originalText: manualText,
            correctedText: manualText,
          });
        }
      }

      clearUploadedFiles();
      clearCustomCriteriaFiles();
      setCurrentWorkIndex(0);

      if (autoGrade) {
        setStep(2);
      } else {
        setStep(1);
        onNext();
      }
    } catch (error: any) {
      setError(error.message || '處理過程中發生錯誤，請重試');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPastedContent = pastedQuestion.trim() || pastedMaterial.trim() || pastedCriteria.trim();
  const canProceed = customQuestion.trim() && (uploadedFiles.length > 0 || manualText.trim()) && (practicalCriteriaConfirmed || criteriaReady);
  const formatInfo = practicalGenre ? PRACTICAL_FORMAT_REQUIREMENTS[practicalGenre] : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        {/* 左欄：學生作品 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#B5726E]" />
                上傳學生作品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeStudentTab} onValueChange={setActiveStudentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">文件上傳</TabsTrigger>
                  <TabsTrigger value="manual">貼上原文</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4 pt-4">
                  <div
                    className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-8 text-center hover:border-[#B5726E] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
                    onClick={() => studentFileInputRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 text-[#718096] mx-auto mb-3" />
                    <p className="text-[#2D3748] font-medium mb-1">點擊或拖放文件至此</p>
                    <p className="text-sm text-[#718096]">支持 JPG、PNG、PDF、Word 格式</p>
                    <input
                      ref={studentFileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleStudentFilesChange}
                    />
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">已上傳文件</p>
                        <Button variant="ghost" size="sm" onClick={() => clearUploadedFiles()}>清除全部</Button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-[#F7F9FB] rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-[#B5726E] flex-shrink-0" />
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-[#718096] flex-shrink-0">({formatFileSize(file.size)})</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveStudentFile(file.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>貼上學生作文</Label>
                    <Textarea
                      placeholder="請貼上學生實用文原文..."
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {formatInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-[#B5726E]" />
                  {formatInfo.name}格式要求
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">必備格式：</p>
                  <ul className="text-sm text-[#718096] list-disc list-inside space-y-1">
                    {formatInfo.required.map((req, i) => <li key={i}>{req}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 text-orange-600">扣分陷阱：</p>
                  <ul className="text-sm text-orange-600 list-disc list-inside space-y-1">
                    {formatInfo.traps.map((trap, i) => <li key={i}>{trap}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右欄：題目/資料內容/評分準則 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#B5726E]" />
                題目、資料內容與評分準則
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 選擇文體 */}
              <div className="space-y-2">
                <Label>選擇文體</Label>
                <Select value={practicalGenre} onValueChange={setPracticalGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇文體類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="speech">演講辭</SelectItem>
                    <SelectItem value="letter">書信/公開信</SelectItem>
                    <SelectItem value="proposal">建議書</SelectItem>
                    <SelectItem value="report">報告</SelectItem>
                    <SelectItem value="commentary">評論文章</SelectItem>
                    <SelectItem value="article">專題文章</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 題目 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">題目</Label>
                <Tabs value={questionMode} onValueChange={(v) => setQuestionMode(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="upload" className="text-xs px-3">上傳文件</TabsTrigger>
                    <TabsTrigger value="paste" className="text-xs px-3">貼上文字</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="pt-2">
                    <div
                      className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-3 text-center hover:border-[#B5726E] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
                      onClick={() => questionFileInputRef.current?.click()}
                    >
                      <Upload className="w-5 h-5 text-[#718096] mx-auto mb-1" />
                      <p className="text-xs text-[#2D3748]">點擊上傳題目文件</p>
                      <p className="text-xs text-[#718096]">AI將自動整理題目與評分準則</p>
                      <input
                        ref={questionFileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleQuestionFileChange}
                      />
                    </div>
                    {customCriteriaFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {customCriteriaFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-[#F7F9FB] rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3 h-3 text-[#B5726E] flex-shrink-0" />
                              <span className="text-xs truncate">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveQuestionFile(file.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="paste" className="pt-2">
                    <Textarea
                      placeholder="貼上題目內容..."
                      value={pastedQuestion}
                      onChange={(e) => setPastedQuestion(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* 資料內容 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  資料內容
                  <span className="ml-1 text-xs text-[#718096] font-normal">（資料一、資料二等）</span>
                </Label>
                <Tabs value={materialMode} onValueChange={(v) => setMaterialMode(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="upload" className="text-xs px-3">上傳文件</TabsTrigger>
                    <TabsTrigger value="paste" className="text-xs px-3">貼上文字</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="pt-2">
                    <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-3 text-center text-xs text-[#718096]">
                      如資料已包含在題目文件內，毋須另行上傳
                    </div>
                  </TabsContent>
                  <TabsContent value="paste" className="pt-2">
                    <Textarea
                      placeholder="貼上資料內容（資料一、資料二等）..."
                      value={pastedMaterial}
                      onChange={(e) => setPastedMaterial(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* 評分準則 */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">評分準則</Label>
                <Tabs value={criteriaMode} onValueChange={(v) => setCriteriaMode(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="upload" className="text-xs px-3">上傳文件</TabsTrigger>
                    <TabsTrigger value="paste" className="text-xs px-3">貼上文字</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="pt-2">
                    <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-3 text-center text-xs text-[#718096]">
                      如評分準則已包含在題目文件內，毋須另行上傳
                    </div>
                  </TabsContent>
                  <TabsContent value="paste" className="pt-2">
                    <Textarea
                      placeholder="貼上評分準則內容..."
                      value={pastedCriteria}
                      onChange={(e) => setPastedCriteria(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* AI整理準則按鈕（貼上模式時顯示） */}
              {hasPastedContent && (
                <Button
                  onClick={handleOrganizeCriteria}
                  disabled={isOrganizing}
                  variant="outline"
                  className="w-full gap-2 border-[#B5726E] text-[#B5726E] hover:bg-[#B5726E] hover:text-white"
                  size="sm"
                >
                  {isOrganizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#B5726E] border-t-transparent rounded-full animate-spin" />
                      正在整理準則{uploadedFiles.length > 0 ? '（同時提取第一份學生作品）' : ''}...
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-4 h-4" />
                      AI整理準則{uploadedFiles.length > 0 ? '（合併提取首份作品）' : ''}
                    </>
                  )}
                </Button>
              )}

              {/* 已確認的題目預覽 */}
              {customQuestion && (
                <div className="space-y-1">
                  <Label className="text-xs text-[#718096]">已確認題目</Label>
                  <div className="p-2 bg-[#F7F9FB] rounded-lg text-xs max-h-24 overflow-y-auto">
                    {customQuestion}
                  </div>
                </div>
              )}

              {isOrganizing && (
                <div className="flex items-center justify-center p-3 bg-[#F7F9FB] rounded-lg">
                  <div className="w-4 h-4 border-2 border-[#B5726E] border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm text-[#718096]">正在整理評分準則...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 確認評分準則區塊 */}
          {customQuestion && (
            <Card className={practicalCriteriaConfirmed ? 'border-green-300' : 'border-amber-200'}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-[#B5726E]" />
                  確認評分準則
                  {practicalCriteriaConfirmed && (
                    <span className="ml-auto text-xs text-green-600 font-normal flex items-center gap-1">
                      <Check className="w-3 h-3" /> 已確認
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    資訊分考核項目
                    <span className="ml-1 text-xs text-[#718096] font-normal">（全部提及得2分，欠1項得1分）</span>
                  </Label>
                  <div className="space-y-1">
                    {localInfoPoints.map((point, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-[#F7F9FB] rounded-lg">
                        <span className="text-xs text-[#718096] w-4">{idx + 1}.</span>
                        <span className="text-sm flex-1">{point}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveInfoPoint(idx)} className="h-6 w-6 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新增考核項目..."
                      value={newInfoPoint}
                      onChange={(e) => setNewInfoPoint(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddInfoPoint()}
                      className="flex-1 text-sm px-3 py-1.5 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#B5726E]"
                    />
                    <Button variant="outline" size="sm" onClick={handleAddInfoPoint}>新增</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    內容發展細項數量
                    <span className="ml-1 text-xs text-[#718096] font-normal">（影響齊全／大致齊全判斷）</span>
                  </Label>
                  <input
                    type="text"
                    value={localDevLabel}
                    onChange={(e) => setLocalDevLabel(e.target.value)}
                    className="w-full text-sm px-3 py-1.5 border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#B5726E]"
                    placeholder="例如：2個建議、4個細項、3項同學意見"
                  />
                </div>

                <Button
                  onClick={handleConfirmCriteria}
                  className="w-full gap-2 bg-[#B5726E] hover:bg-[#a5625e]"
                  size="sm"
                >
                  <Check className="w-4 h-4" />
                  {practicalCriteriaConfirmed ? '更新評分準則' : '確認評分準則'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 批改設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">批改設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ignoreRedInk"
                  checked={ignoreRedInk}
                  onCheckedChange={(checked) => setIgnoreRedInk(checked as boolean)}
                />
                <Label htmlFor="ignoreRedInk" className="font-normal cursor-pointer">忽略手寫紅筆批改</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoGrade"
                  checked={autoGrade}
                  onCheckedChange={(checked) => setAutoGrade(checked as boolean)}
                />
                <Label htmlFor="autoGrade" className="font-normal cursor-pointer">跳過校對，直接批改</Label>
              </div>
            </CardContent>
          </Card>

          {customQuestion && !practicalCriteriaConfirmed && !criteriaReady && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">請在上方確認評分準則後才能開始批改</p>
            </div>
          )}

          <Button
            onClick={handleStartProcessing}
            disabled={!canProceed || isProcessing}
            className="w-full gap-2 bg-[#B5726E] hover:bg-[#a5625e]"
            size="lg"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                處理中...
              </>
            ) : (
              <>
                開始處理
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
