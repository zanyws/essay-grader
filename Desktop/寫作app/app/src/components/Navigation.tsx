import { useState } from 'react';
import { Settings, BookOpen, Check, RotateCcw, AlertCircle, GraduationCap, FileText, PenTool, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/hooks/useStore';
import { isAPIAvailable, GEMINI_CONFIG, OPENAI_CONFIG, testAPIConnection } from '@/lib/api';
import type { APIType } from '@/lib/api';
import type { AppMode } from '@/types';

const modeConfig: Record<AppMode, { label: string; icon: React.ElementType; description: string }> = {
  secondary: { label: '中學命題寫作', icon: GraduationCap, description: 'HKDSE 卷二乙部' },
  primary: { label: '小學命題寫作', icon: School, description: '小學中文作文' },
  practical: { label: '實用寫作批改', icon: FileText, description: 'DSE 卷二甲部' },
  'exam-generator': { label: '模擬卷生成', icon: PenTool, description: '實用寫作試卷' },
};

export function Navigation() {
  const { 
    apiKey, 
    apiType,
    apiModel, 
    apiBaseURL,
    appMode,
    setAppMode,
    setApiKey, 
    setApiType,
    setApiModel,
    setApiBaseURL,
    resetAll,
    currentStep,
    setStep,
  } = useStore();
  
  const [localKey, setLocalKey] = useState(apiKey);
  const [localType, setLocalType] = useState<APIType>(apiType);
  const [localModel, setLocalModel] = useState(apiModel);
  const [localBaseURL, setLocalBaseURL] = useState(apiBaseURL);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
  }>({ testing: false });

  const currentMode = modeConfig[appMode];
  const ModeIcon = currentMode.icon;

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    setStep(0);
  };

  const handleSave = () => {
    if (!localKey || localKey.length < 10) {
      setApiError('請輸入有效的 API 密鑰');
      return;
    }

    let finalModel = localModel;
    if (localType === 'gemini') {
      finalModel = localModel || GEMINI_CONFIG.model;
    } else if (localType === 'openai') {
      finalModel = localModel || OPENAI_CONFIG.model;
    }

    setApiKey(localKey);
    setApiType(localType);
    setApiModel(finalModel);
    setApiBaseURL(localBaseURL);
    setApiError(null);
    setShowConfirm(true);
    
    setTimeout(() => {
      setShowConfirm(false);
      setIsOpen(false);
    }, 1500);
  };

  const handleReset = () => {
    const currentApiKey = apiKey;
    const currentApiType = apiType;
    const currentApiModel = apiModel;
    const currentApiBaseURL = apiBaseURL;
    
    resetAll();
    
    setApiKey(currentApiKey);
    setApiType(currentApiType);
    setApiModel(currentApiModel);
    setApiBaseURL(currentApiBaseURL);
    
    setStep(0);
    window.location.reload();
  };

  const handleTabChange = (value: string) => {
    const newType = value as APIType;
    setLocalType(newType);
    setTestStatus({ testing: false });
    
    if (newType === 'gemini') {
      setLocalModel(GEMINI_CONFIG.model);
      setLocalBaseURL('');
    } else if (newType === 'openai') {
      setLocalModel(OPENAI_CONFIG.model);
      setLocalBaseURL('');
    }
  };

  const handleTestConnection = async () => {
    if (!localKey || localKey.length < 10) {
      setApiError('請先輸入有效的 API 密鑰');
      return;
    }

    setTestStatus({ testing: true });
    setApiError(null);

    try {
      const result = await testAPIConnection({
        apiKey: localKey,
        apiType: localType,
        model: localModel,
        baseURL: localBaseURL,
      });

      setTestStatus({
        testing: false,
        success: result.success,
        message: result.message,
      });
    } catch (error: any) {
      setTestStatus({
        testing: false,
        success: false,
        message: error.message || '測試失敗',
      });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E2E8F0] z-50 shadow-sm">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo & Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4A6FA5] rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-[#2D3748]">中文科寫作批改系統</h1>
            <p className="text-xs text-[#718096]">{currentMode.description}</p>
          </div>
          
          {/* Mode Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 gap-2">
                <ModeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{currentMode.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>切換功能</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleModeChange('secondary')}>
                <GraduationCap className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">中學命題寫作</div>
                  <div className="text-xs text-[#718096]">HKDSE 卷二乙部</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModeChange('primary')}>
                <School className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">小學命題寫作</div>
                  <div className="text-xs text-[#718096]">小學中文作文</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModeChange('practical')}>
                <FileText className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">實用寫作批改</div>
                  <div className="text-xs text-[#718096]">DSE 卷二甲部</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleModeChange('exam-generator')}>
                <PenTool className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">模擬卷生成</div>
                  <div className="text-xs text-[#718096]">實用寫作試卷</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Reset Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-[#718096]"
                disabled={currentStep === 0 && appMode !== 'exam-generator'}
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">重新設定</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確定要重新設定嗎？</AlertDialogTitle>
                <AlertDialogDescription>
                  這將清除所有已上傳的文件、學生作品和批改報告，無法恢復。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-red-500 hover:bg-red-600">
                  確定重新設定
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* API Settings */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setIsOpen(true)}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">API 設定</span>
              {isAPIAvailable(apiKey) ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
            </Button>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>API 設定</DialogTitle>
                <DialogDescription>
                  設定您的 AI API 以啟用 OCR 文字提取和自動批改功能。
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={localType} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="openai">OpenAI</TabsTrigger>
                  <TabsTrigger value="gemini">Gemini</TabsTrigger>
                  <TabsTrigger value="custom">自定義</TabsTrigger>
                </TabsList>
                
                <TabsContent value="openai" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">OpenAI API 密鑰</Label>
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="sk-..."
                      value={localKey}
                      onChange={(e) => {
                        setLocalKey(e.target.value);
                        setApiError(null);
                      }}
                    />
                    <p className="text-xs text-[#718096]">
                      從 OpenAI 控制台獲取的 API 密鑰，以 sk- 開頭
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="openai-model">模型</Label>
                    <Input
                      id="openai-model"
                      placeholder="gpt-4o"
                      value={localModel}
                      onChange={(e) => setLocalModel(e.target.value)}
                    />
                    <p className="text-xs text-[#718096]">
                      推薦使用 gpt-4o 或 gpt-4o-mini
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="gemini" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key">Google Gemini API 密鑰</Label>
                    <Input
                      id="gemini-key"
                      type="password"
                      placeholder="AIzaSy..."
                      value={localKey}
                      onChange={(e) => {
                        setLocalKey(e.target.value);
                        setApiError(null);
                      }}
                    />
                    <p className="text-xs text-[#718096]">
                      從 Google AI Studio 獲取的 API 密鑰，以 AIzaSy 開頭
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model">模型</Label>
                    <Input
                      id="gemini-model"
                      placeholder="gemini-2.0-flash"
                      value={localModel}
                      onChange={(e) => setLocalModel(e.target.value)}
                    />
                    <p className="text-xs text-[#718096]">
                      可用模型：gemini-2.0-flash、gemini-1.5-pro-latest
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4 py-4">
                  <div className="p-3 bg-blue-50 rounded-lg mb-4">
                    <p className="text-xs text-blue-700">
                      <strong>自定義 API：</strong>支持任何兼容 OpenAI API 格式的服務，如 Azure OpenAI、DeepSeek、本地模型等。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-url">API 基礎 URL</Label>
                    <Input
                      id="custom-url"
                      placeholder="https://api.example.com/v1"
                      value={localBaseURL}
                      onChange={(e) => setLocalBaseURL(e.target.value)}
                    />
                    <p className="text-xs text-[#718096]">
                      例如：https://api.deepseek.com/v1
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custom-key">API 密鑰</Label>
                    <Input
                      id="custom-key"
                      type="password"
                      placeholder="your-api-key"
                      value={localKey}
                      onChange={(e) => {
                        setLocalKey(e.target.value);
                        setApiError(null);
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="custom-model">模型名稱</Label>
                    <Input
                      id="custom-model"
                      placeholder="model-name"
                      value={localModel}
                      onChange={(e) => setLocalModel(e.target.value)}
                    />
                    <p className="text-xs text-[#718096]">
                      例如：deepseek-chat、gpt-4o
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {apiError && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-700">{apiError}</p>
                </div>
              )}

              {testStatus.message && !testStatus.testing && (
                <div className={`p-3 rounded-lg ${testStatus.success ? 'bg-green-50' : 'bg-orange-50'}`}>
                  <div className="flex items-start gap-2">
                    {testStatus.success ? (
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    )}
                    <p className={`text-xs ${testStatus.success ? 'text-green-700' : 'text-orange-700'}`}>
                      {testStatus.message}
                    </p>
                  </div>
                </div>
              )}
              
              {showConfirm && (
                <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-green-700">API 設定已保存！</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  取消
                </Button>
                <Button 
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testStatus.testing || !localKey}
                >
                  {testStatus.testing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      測試中...
                    </>
                  ) : (
                    '測試連接'
                  )}
                </Button>
                <Button onClick={handleSave}>
                  確定保存
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </nav>
  );
}
