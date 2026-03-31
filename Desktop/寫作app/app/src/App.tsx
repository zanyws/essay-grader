import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/Navigation';
import { ProgressSteps } from '@/components/ProgressSteps';
import { SetupPage } from '@/pages/SetupPage';
import { ProofreadPage } from '@/pages/ProofreadPage';
import { ReportPage } from '@/pages/ReportPage';
import { ClassReportPage } from '@/pages/ClassReportPage';
import { PrimarySetupPage } from '@/pages/primary/PrimarySetupPage';
import { PrimaryProofreadPage } from '@/pages/primary/PrimaryProofreadPage';
import { PrimaryReportPage } from '@/pages/primary/PrimaryReportPage';
import { PrimaryClassReportPage } from '@/pages/primary/PrimaryClassReportPage';
import { PracticalSetupPage } from '@/pages/practical/PracticalSetupPage';
import { PracticalProofreadPage } from '@/pages/practical/PracticalProofreadPage';
import { PracticalReportPage } from '@/pages/practical/PracticalReportPage';
import { PracticalClassReportPage } from '@/pages/practical/PracticalClassReportPage';
import { ExamGeneratorPage } from '@/pages/exam-generator/ExamGeneratorPage';
import { useStore } from '@/hooks/useStore';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const { appMode, currentStep, setStep } = useStore();
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    setDirection(1);
    setStep(currentStep + 1);
  };

  const handlePrev = () => {
    setDirection(-1);
    setStep(currentStep - 1);
  };

  const renderSecondaryPages = () => {
    switch (currentStep) {
      case 0:
        return <SetupPage onNext={handleNext} />;
      case 1:
        return <ProofreadPage onNext={handleNext} onPrev={handlePrev} />;
      case 2:
        return <ReportPage onNext={handleNext} onPrev={handlePrev} />;
      case 3:
        return <ClassReportPage onPrev={handlePrev} />;
      default:
        return <SetupPage onNext={handleNext} />;
    }
  };

  const renderPrimaryPages = () => {
    switch (currentStep) {
      case 0:
        return <PrimarySetupPage onNext={handleNext} />;
      case 1:
        return <PrimaryProofreadPage onNext={handleNext} onPrev={handlePrev} />;
      case 2:
        return <PrimaryReportPage onNext={handleNext} onPrev={handlePrev} />;
      case 3:
        return <PrimaryClassReportPage onPrev={handlePrev} />;
      default:
        return <PrimarySetupPage onNext={handleNext} />;
    }
  };

  const renderPracticalPages = () => {
    switch (currentStep) {
      case 0:
        return <PracticalSetupPage onNext={handleNext} />;
      case 1:
        return <PracticalProofreadPage onNext={handleNext} onPrev={handlePrev} />;
      case 2:
        return <PracticalReportPage onNext={handleNext} onPrev={handlePrev} />;
      case 3:
        return <PracticalClassReportPage onPrev={handlePrev} />;
      default:
        return <PracticalSetupPage onNext={handleNext} />;
    }
  };

  const renderExamGenerator = () => {
    return <ExamGeneratorPage />;
  };

  const renderContent = () => {
    switch (appMode) {
      case 'primary':
        return renderPrimaryPages();
      case 'practical':
        return renderPracticalPages();
      case 'exam-generator':
        return renderExamGenerator();
      default:
        return renderSecondaryPages();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navigation />
      
      <main className="pt-16">
        {appMode !== 'exam-generator' && <ProgressSteps currentStep={currentStep} mode={appMode} />}
        
        <div className={`px-4 ${appMode !== 'exam-generator' ? 'pb-24' : 'pb-8'}`}>
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
