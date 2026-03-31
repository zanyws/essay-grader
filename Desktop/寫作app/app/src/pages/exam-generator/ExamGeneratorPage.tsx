import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Download, FileText, RefreshCw, AlertCircle, BookOpen, Upload, X, Type, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStore } from '@/hooks/useStore';
import { generatePracticalExamWithAPI, isAPIAvailable } from '@/lib/api';
import { generateId, readFileAsDataURL, readFileAsText } from '@/lib/utils';
import type { FileInfo } from '@/types';

interface ExtendedFileInfo extends FileInfo {
  file?: File;
}

export function ExamGeneratorPage() {
  const { apiKey, apiType, apiModel, apiBaseURL, generatedExam, setGeneratedExam } = useStore();
  
  const [genre, setGenre] = useState('speech');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<ExtendedFileInfo | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedQuestion, setPastedQuestion] = useState('');
  const [pastedCriteria, setPastedCriteria] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    // 支持圖像、PDF、Word 和純文本
    const validTypes = [
      'image/jpeg', 'image/png', 'image/jpg', 
      'application/pdf', 
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const isValidType = validTypes.some(type => 
      file.type === type || 
      file.name.toLowerCase().endsWith(type.split('/').pop() || '')
    );
    
    // 額外檢查文件擴展名
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.txt', '.doc', '.docx'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!isValidType && !hasValidExtension) {
      setError(`不支持的文件類型: ${file.name}。請上傳 JPG、PNG、PDF、Word 或 TXT 文件。`);
      return;
    }

    const fileInfo: ExtendedFileInfo = {
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      file: file,
    };
    setUploadedFile(fileInfo);
    setError(null);
    setSuccess(`已上傳文件: ${file.name}`);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleGenerate = async () => {
    if (!isAPIAvailable(apiKey)) {
      setError('請先在右上角設定有效的 API 密鑰');
      return;
    }

    if (!genre) {
      setError('請選擇文體');
      return;
    }

    // 檢查輸入內容
    if (inputMode === 'upload' && !uploadedFile) {
      setError('請上傳一份模擬卷文件');
      return;
    }

    if (inputMode === 'paste' && !pastedQuestion.trim()) {
      setError('請貼上題目內容');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let fileContent: string;
      let fileType: string;

      if (inputMode === 'upload') {
        if (!uploadedFile?.file) {
          throw new Error('文件無效');
        }
        if (uploadedFile.type.startsWith('image/') || uploadedFile.type.includes('pdf')) {
          fileContent = await readFileAsDataURL(uploadedFile.file);
        } else {
          fileContent = await readFileAsText(uploadedFile.file);
        }
        fileType = uploadedFile.type;
      } else {
        // 粘貼模式：組合題目和評分準則
        const combinedContent = `【題目】\n${pastedQuestion}\n\n【評分準則】\n${pastedCriteria || '（無特定評分準則）'}`;
        fileContent = combinedContent;
        fileType = 'text/plain';
      }

      const result = await generatePracticalExamWithAPI(
        fileContent,
        fileType,
        genre,
        {
          apiKey,
          apiType: apiType as any,
          model: apiModel,
          baseURL: apiBaseURL,
        }
      );
      setGeneratedExam(result);
      setSuccess('模擬卷生成成功！');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      console.error('Generate exam error:', e);
      setError(e.message || '生成失敗，請重試');
    } finally {
      setIsGenerating(false);
    }
  };

  // 輔助函數：安全取得 markingScheme 各欄位
  const getInfoPoints = () => generatedExam?.markingScheme?.content?.infoPoints ?? [];
  const getDevelopmentPoints = () => generatedExam?.markingScheme?.content?.developmentPoints ?? [];
  const getFormatRequirements = () => generatedExam?.markingScheme?.organization?.formatRequirements ?? [];

  // 行文語氣固定評分描述（後端不返回此欄位，前端根據文體生成）
  const getToneDescription = (genreValue: string): string[] => {
    const toneMap: Record<string, string[]> = {
      speech:     ['措詞準確，行文簡潔，達意流暢；態度冷靜得體，修飾恰當，說明效果佳，頗能吸引聽眾關注計劃。（9–10分）',
                   '措詞準確，行文達意流暢；態度冷靜，頗能說明計劃。（7–8分）',
                   '措詞大致準確，行文大致達意；態度尚算冷靜，說明效果一般。（5–6分）',
                   '措詞、行文未能達意；語氣頗多不當。（1–2分）'],
      letter:     ['措詞準確，行文簡潔，達意流暢；態度誠懇積極，修飾恰當，自薦效果佳。（9–10分）',
                   '措詞準確，行文達意流暢；態度誠懇，頗具自薦效果。（7–8分）',
                   '措詞大致準確，行文大致達意；態度尚算誠懇，自薦效果一般。（5–6分）',
                   '措詞、行文未能達意；語氣頗多不當。（1–2分）'],
      proposal:   ['措詞準確，行文簡潔，達意流暢；態度客觀正式，建議具體，說服效果佳。（9–10分）',
                   '措詞準確，行文達意流暢；態度客觀，頗具說服效果。（7–8分）',
                   '措詞大致準確，行文大致達意；態度尚算客觀，說服效果一般。（5–6分）',
                   '措詞、行文未能達意；語氣頗多不當。（1–2分）'],
      report:     ['措詞準確，行文簡潔，達意流暢；語氣客觀正式，資料呈現清晰有條理，匯報效果佳。（9–10分）',
                   '措詞準確，行文達意流暢；語氣客觀，匯報效果頗佳。（7–8分）',
                   '措詞大致準確，行文大致達意；語氣尚算客觀，匯報效果一般。（5–6分）',
                   '措詞、行文未能達意；語氣頗多不當。（1–2分）'],
      commentary: ['措詞準確，行文簡潔，達意流暢；立場清晰，論證有力，具說服力。（9–10分）',
                   '措詞準確，行文達意流暢；立場大致清晰，論證效果頗佳。（7–8分）',
                   '措詞大致準確，行文大致達意；立場尚算清晰，論證效果一般。（5–6分）',
                   '措詞、行文未能達意；語氣頗多不當。（1–2分）'],
      article:    ['措詞準確，行文簡潔，達意流暢；語氣客觀，說明清晰，頗能呼籲讀者。（9–10分）',
                   '措詞準確，行文達意流暢；語氣尚算客觀，說明效果頗佳。（7–8分）',
                   '措詞大致準確，行文大致達意；說明效果一般。（5–6分）',
                   '措詞、行文未能達意；語氣頗多不當。（1–2分）'],
    };
    return toneMap[genreValue] ?? [
      '措詞準確，行文簡潔流暢；語氣切合文體，效果佳。（9–10分）',
      '措詞準確，行文達意；語氣大致切合文體。（7–8分）',
      '措詞大致準確，行文大致達意；語氣尚算切合。（5–6分）',
      '措詞、行文未能達意；語氣頗多不當。（1–2分）',
    ];
  };

  // 去除 HTML 標籤（用於 TXT 導出）
  // 把 Markdown 表格語法轉換成 HTML <table>
  const convertMarkdownTable = (text: string): string => {
    const lines = text.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];

    const flushTable = () => {
      if (tableRows.length === 0) return;
      const rows = tableRows.filter(r => !/^[\|:\- ]+$/.test(r.replace(/\|/g, '').trim()) || r.includes('|'));
      const dataRows = rows.filter(r => !/^\s*[\|]?[\s:\-]+[\|]/.test(r));
      if (dataRows.length === 0) { tableRows = []; inTable = false; return; }
      result.push('<table style="border-collapse:collapse;width:100%;margin:8px 0;font-size:14px">');
      dataRows.forEach((row, idx) => {
        const cells = row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const tag = idx === 0 ? 'th' : 'td';
        const style = idx === 0
          ? 'style="background:#f0f0f0;font-weight:bold;padding:6px 10px;border:1px solid #ccc;text-align:left"'
          : 'style="padding:6px 10px;border:1px solid #ccc;vertical-align:top"';
        result.push(`<tr>${cells.map(c => `<${tag} ${style}>${c}</${tag}>`).join('')}</tr>`);
      });
      result.push('</table>');
      tableRows = [];
      inTable = false;
    };

    for (const line of lines) {
      const isTableRow = /^\s*\|/.test(line);
      const isSeparator = /^\s*\|[\s:\-|]+\|\s*$/.test(line);
      if (isTableRow) {
        if (!inTable) inTable = true;
        if (!isSeparator) tableRows.push(line);
      } else {
        if (inTable) flushTable();
        result.push(line);
      }
    }
    if (inTable) flushTable();
    return result.join('\n');
  };

  // 把【拓展】...【/拓展】標記轉換成藍色粗體 HTML
  // 同時清理後端可能直接輸出的 <strong style="color:#2563eb..."> 殘留標籤，防止巢狀
  const parseEssayToHtml = (text: string): string => {
    return text
      // 先把殘留的 HTML strong 標籤正規化（後端直接輸出的情況）
      .replace(/<strong[^>]*color[^>]*>/gi, '<strong style="color:#2563eb;font-weight:700">')
      .replace(/<\/strong>/gi, '</strong>')
      // 再處理【拓展】標記
      .replace(/【拓展】/g, '<strong style="color:#2563eb;font-weight:700">')
      .replace(/【\/拓展】/g, '</strong>')
      // 修復巢狀 strong：把 </strong><strong...> 之間沒有文字的情況合併
      .replace(/<\/strong>\s*<strong[^>]*>/g, '')
      .replace(/\n/g, '<br>');
  };

  // 把【拓展】...【/拓展】標記去除，保留純文字（用於 TXT 導出）
  const stripMarkers = (text: string): string => {
    return text.replace(/【拓展】/g, '').replace(/【\/拓展】/g, '');
  };

  const handleExportTxt = () => {
    if (!generatedExam) return;

    const infoPoints = getInfoPoints();
    const developmentPoints = getDevelopmentPoints();
    const formatReqs = getFormatRequirements();

    const lines: string[] = [
      'DSE 中文卷二甲部：實用寫作模擬試卷',
      '',
      generatedExam.examPaper.title,
      '',
      `考試時間：${generatedExam.examPaper.time}　　佔分：${generatedExam.examPaper.marks}`,
      '',

      '【題目】',
      generatedExam.examPaper.question,
      '',
      `【${generatedExam.examPaper.material1.title}】`,
      generatedExam.examPaper.material1.content,
      '',
      `【${generatedExam.examPaper.material2.title}】`,
      generatedExam.examPaper.material2.content,
      '',
      '════════════════════════════════',
      '評分參考（教師用）',
      '════════════════════════════════',
      '',
      '① 資訊分（最高 2 分）',
      '考生須提及以下 3-4 項背景資訊，齊全得 2 分，欠 1 項得 1 分，欠 2 項或以上得 0 分：',
      ...infoPoints.map((p: string) => `  • ${p}`),
      '',
      '② 內容發展分（最高 8 分）',
      '優質回應應涵蓋以下論點及拓展方向：',
      ...developmentPoints.map((p: string) => `  • ${p}`),
      '',
      '行文語氣（最高 10 分）（以措詞行文為主）：',
      ...getToneDescription(genre).map((t: string) => `  • ${t}`),
      '',
      '組織及格式要求（最高 10 分）：',
      ...formatReqs.map((r: string) => `  • ${r}`),
    ];

    if (generatedExam.modelEssay) {
      lines.push('', '════════════════════════════════');
      lines.push('示範文章（底線部分為內容拓展示範）');
      lines.push('════════════════════════════════');
      lines.push('');
      lines.push(stripMarkers(generatedExam.modelEssay));
    }

    const txtContent = lines.join('\n');
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `實用寫作模擬卷_${genre}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    if (!generatedExam) return;

    const infoPoints = getInfoPoints();
    const developmentPoints = getDevelopmentPoints();
    const formatReqs = getFormatRequirements();

    const toList = (arr: string[]) =>
      arr.length > 0
        ? arr.map(i => `<li>${i}</li>`).join('\n      ')
        : '<li>（未有資料）</li>';

    const modelEssayHtml = generatedExam.modelEssay
      ? parseEssayToHtml(generatedExam.modelEssay)
      : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${generatedExam.examPaper.title}</title>
  <style>
    body { font-family: "Microsoft JhengHei", "PingFang HK", sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 8px; }
    .meta { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
    h2 { font-size: 17px; margin-top: 32px; margin-bottom: 12px; border-bottom: 2px solid #B5726E; padding-bottom: 4px; color: #B5726E; }
    h3 { font-size: 15px; margin-top: 18px; margin-bottom: 8px; color: #444; }
    .instructions { background: #f5f5f5; padding: 16px 20px; border-radius: 8px; margin: 16px 0; }
    .instructions ul { margin: 6px 0 0; padding-left: 20px; }
    .material { background: #f9f9f9; padding: 16px 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #B5726E; }
    .material-title { font-weight: bold; margin-bottom: 8px; color: #B5726E; }
    .marking { background: #fffbf0; border: 1px solid #e8d9a0; border-radius: 8px; padding: 20px 24px; margin-top: 32px; page-break-before: always; }
    .marking h2 { color: #7a5f00; border-bottom-color: #c8a800; }
    .marking h3 { color: #5a4800; }
    .marking ul { margin: 6px 0; padding-left: 22px; }
    .marking li { margin: 4px 0; font-size: 14px; }
    .score-note { font-size: 13px; color: #888; font-style: italic; margin-bottom: 6px; }
    .model-essay { background: #f0f7ff; border: 1px solid #b0cce8; border-radius: 8px; padding: 20px 24px; margin-top: 32px; page-break-before: always; }
    .model-essay h2 { color: #1a4f7a; border-bottom-color: #4a8fbf; }
    .model-essay-note { font-size: 13px; color: #4a6fa5; margin-bottom: 16px; }
    .essay-body { font-size: 15px; line-height: 2; white-space: pre-wrap; }
    .essay-body strong { color: #2563eb; font-weight: 700; }
    @media print { body { padding: 20px; } .marking, .model-essay { page-break-before: always; } }
  </style>
</head>
<body>
  <h1>${generatedExam.examPaper.title}</h1>
  <p class="meta">考試時間：${generatedExam.examPaper.time}　　佔分：${generatedExam.examPaper.marks}</p>

  <h2>題目</h2>
  <p>${generatedExam.examPaper.question.replace(/\n/g, '<br>')}</p>

  <div class="material">
    <div class="material-title">${generatedExam.examPaper.material1.title}</div>
    <div>${convertMarkdownTable(generatedExam.examPaper.material1.content).split('\n').map((l: string) => l.startsWith('<') ? l : (l.trim() ? `<p style="margin:4px 0">${l}</p>` : '')).join('')}</div>
  </div>

  <div class="material">
    <div class="material-title">${generatedExam.examPaper.material2.title}</div>
    <div>${convertMarkdownTable(generatedExam.examPaper.material2.content).split('\n').map((l: string) => l.startsWith('<') ? l : (l.trim() ? `<p style="margin:4px 0">${l}</p>` : '')).join('')}</div>
  </div>

  <div class="marking">
    <h2>評分參考（教師用）</h2>

    <h3>① 資訊分（最高 2 分）</h3>
    <p class="score-note">考生須提及以下背景資訊，齊全得 2 分，欠 1 項得 1 分，欠 2 項或以上得 0 分：</p>
    <ul>
      ${toList(infoPoints)}
    </ul>

    <h3>② 內容發展分（最高 8 分）</h3>
    <p class="score-note">優質回應應涵蓋以下論點及拓展方向：</p>
    <ul>
      ${toList(developmentPoints)}
    </ul>

    <h3>行文語氣（最高 10 分）</h3>
    <p style="font-size:13px;color:#888;font-style:italic;margin-bottom:6px">以措詞行文為主，語氣須符合文體、對象及場合</p>
    <ul>
      ${getToneDescription(genre).map((t: string) => `<li>${t}</li>`).join('\n      ')}
    </ul>

    <h3>組織及格式（最高 10 分）</h3>
    <ul>
      ${toList(formatReqs)}
    </ul>
  </div>

  ${modelEssayHtml ? `
  <div class="model-essay">
    <h2>示範文章</h2>
    <p class="model-essay-note">藍色粗體部分為內容拓展示範（結合資料細項加以發揮），供學生參考。</p>
    <div class="essay-body">${modelEssayHtml}</div>
  </div>` : ''}

</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `實用寫作模擬卷_${genre}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <BookOpen className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        {/* Left - Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#B5726E]" />
              生成設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 輸入方式選擇 */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'upload' | 'paste')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">上傳文件</TabsTrigger>
                <TabsTrigger value="paste">貼上文字</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>上傳模擬卷</Label>
                  <div
                    className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-6 text-center hover:border-[#B5726E] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-[#718096] mx-auto mb-2" />
                    <p className="text-sm text-[#2D3748]">點擊上傳模擬卷文件</p>
                    <p className="text-xs text-[#718096]">支持 JPG、PNG、PDF、Word、TXT 格式</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {uploadedFile && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">已上傳文件</p>
                    <div className="flex items-center justify-between p-2 bg-[#F7F9FB] rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#B5726E] flex-shrink-0" />
                        <span className="text-sm truncate">{uploadedFile.name}</span>
                        <span className="text-xs text-[#718096] flex-shrink-0">({formatFileSize(uploadedFile.size)})</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="paste" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    貼上題目
                  </Label>
                  <Textarea
                    placeholder="請貼上題目內容..."
                    value={pastedQuestion}
                    onChange={(e) => setPastedQuestion(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    貼上評分準則（可選）
                  </Label>
                  <Textarea
                    placeholder="請貼上評分準則內容（可選）..."
                    value={pastedCriteria}
                    onChange={(e) => setPastedCriteria(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>選擇輸出文體</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue />
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

            <div className="text-sm text-[#718096] bg-[#F7F9FB] p-3 rounded-lg">
              <p className="font-medium mb-1">生成說明：</p>
              <p>AI將分析您上傳的模擬卷或貼上的題目內容，理解其主題和結構，然後生成一份全新的模擬卷。新模擬卷會保持相同的主題方向，但內容完全不同，並符合您選擇的文體格式要求。</p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (inputMode === 'upload' ? !uploadedFile : !pastedQuestion.trim())}
              className="w-full gap-2 bg-[#B5726E] hover:bg-[#a5625e]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  生成模擬卷
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right - Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4A6FA5]" />
              預覽
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedExam ? (
              <Tabs defaultValue="paper" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="paper">模擬試卷</TabsTrigger>
                  <TabsTrigger value="marking">評分參考</TabsTrigger>
                  <TabsTrigger value="model">示範文章</TabsTrigger>
                </TabsList>

                <TabsContent value="paper" className="space-y-4 pt-4">
                  <div className="text-center border-b pb-4">
                    <h3 className="font-bold text-lg">{generatedExam.examPaper.title}</h3>
                    <p className="text-sm text-[#718096]">
                      考試時間：{generatedExam.examPaper.time} | 佔分：{generatedExam.examPaper.marks}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium mb-2">題目：</p>
                    <p className="text-sm whitespace-pre-wrap">{generatedExam.examPaper.question}</p>
                  </div>

                  <div className="bg-[#F7F9FB] p-4 rounded-lg">
                    <p className="font-medium mb-2">{generatedExam.examPaper.material1.title}</p>
                    <p className="text-sm whitespace-pre-wrap">{generatedExam.examPaper.material1.content}</p>
                  </div>

                  <div className="bg-[#F7F9FB] p-4 rounded-lg">
                    <p className="font-medium mb-2">{generatedExam.examPaper.material2.title}</p>
                    <p className="text-sm whitespace-pre-wrap">{generatedExam.examPaper.material2.content}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleExportTxt} variant="outline" className="flex-1 gap-2">
                      <Download className="w-4 h-4" />
                      導出 TXT
                    </Button>
                    <Button onClick={handleExportHtml} className="flex-1 gap-2 bg-[#B5726E] hover:bg-[#a5625e]">
                      <Download className="w-4 h-4" />
                      導出 HTML
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="marking" className="space-y-4 pt-4">
                  {/* 資訊要點 */}
                  {(generatedExam.markingScheme?.content?.infoPoints?.length ?? 0) > 0 && (
                    <div>
                      <p className="font-medium mb-2">資訊要點 <span className="text-xs text-[#718096] font-normal">（必須提及）</span></p>
                      <ul className="text-sm list-disc list-inside space-y-1 text-[#718096]">
                        {(generatedExam.markingScheme?.content?.infoPoints ?? []).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 內容發展 */}
                  {(generatedExam.markingScheme?.content?.developmentPoints?.length ?? 0) > 0 && (
                    <div>
                      <p className="font-medium mb-2">內容發展要求</p>
                      <ul className="text-sm list-disc list-inside space-y-1 text-[#718096]">
                        {(generatedExam.markingScheme?.content?.developmentPoints ?? []).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 行文語氣（固定評分描述，不依賴後端） */}
                  <div>
                    <p className="font-medium mb-2">行文語氣 <span className="text-xs text-[#718096] font-normal">（最高 10 分，以措詞行文為主）</span></p>
                    <ul className="text-sm list-disc list-inside space-y-1 text-[#718096]">
                      {getToneDescription(genre).map((t: string, idx: number) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 組織及格式 */}
                  {(generatedExam.markingScheme?.organization?.formatRequirements?.length ?? 0) > 0 && (
                    <div>
                      <p className="font-medium mb-2">組織及格式 <span className="text-xs text-[#718096] font-normal">（最高 10 分）</span></p>
                      <ul className="text-sm list-disc list-inside space-y-1 text-[#718096]">
                        {(generatedExam.markingScheme?.organization?.formatRequirements ?? []).map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 所有評分參考均為空時的提示 */}
                  {(generatedExam.markingScheme?.content?.infoPoints?.length ?? 0) === 0 &&
                   (generatedExam.markingScheme?.content?.developmentPoints?.length ?? 0) === 0 &&
                   (generatedExam.markingScheme?.organization?.formatRequirements?.length ?? 0) === 0 &&
                   (generatedExam.markingScheme?.organization?.toneRequirements?.length ?? 0) === 0 && (
                    <div className="text-center py-6 text-[#718096]">
                      <p className="text-sm">未能生成評分參考，請重新生成模擬卷</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="model" className="space-y-4 pt-4">
                  {generatedExam.modelEssay ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                        <span className="text-xs text-blue-700">
                          <strong style={{color:'#2563eb'}}>藍色粗體部分</strong> 為內容拓展示範（結合資料細項加以發揮），供學生參考
                        </span>
                      </div>
                      <div
                        className="bg-[#F7F9FB] p-4 rounded-lg text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: parseEssayToHtml(generatedExam.modelEssay) }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#718096]">
                      <p>未生成示範文章</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-[#718096]">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>上傳模擬卷並點擊「生成模擬卷」</p>
                <p className="text-sm mt-2">AI將根據原卷主題生成全新模擬卷</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
