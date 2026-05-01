import { useEffect, useState } from 'react';
import { FormulaBar } from './components/FormulaBar';
import { Grid } from './components/Grid';
import { socketService } from './services/socket.service';
import { TopNav } from './components/TopNav';
import { Toolbar } from './components/Toolbar';
import { AIChatPanel } from './components/AIChatPanel';
import { VersionHistory } from './components/VersionHistory';
import { ShareModal } from './components/Modals/ShareModal';
import { FindReplace } from './components/FindReplace';

const WORKBOOK_ID = 'default-workbook-id'; // To be dynamically passed

function App() {
  const [showAI, setShowAI] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    socketService.connect();
    socketService.joinWorkbook(WORKBOOK_ID);

    return () => {
      socketService.leaveWorkbook(WORKBOOK_ID);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-background font-sans text-textMain overflow-hidden selection:bg-accent/30 selection:text-accentHover">
      {/* Top Header Navigation */}
      <TopNav 
        onShowVersionHistory={() => setShowVersionHistory(true)} 
        onShowShare={() => setShowShare(true)} 
      />

      {/* Formatting Toolbar */}
      <Toolbar onToggleAI={() => setShowAI(!showAI)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area (Formula Bar + Grid) */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border shadow-inner relative">
          <FormulaBar />
          <Grid />
          <FindReplace />
        </div>

        {/* AI Chat Panel Slider */}
        {showAI && (
          <div className="h-full flex-shrink-0 animate-in slide-in-from-right-8 duration-200">
            <AIChatPanel onClose={() => setShowAI(false)} />
          </div>
        )}

        {/* Version History Modal/Slider */}
        {showVersionHistory && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl h-full bg-surface border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col relative">
               <button 
                 onClick={() => setShowVersionHistory(false)} 
                 className="absolute top-4 right-4 bg-surfaceHover p-2 rounded-full hover:bg-border transition-colors z-10 text-textMuted"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
               </button>
               <VersionHistory workbookId={WORKBOOK_ID} onClose={() => setShowVersionHistory(false)} />
            </div>
          </div>
        )}

        {showShare && (
          <ShareModal 
            workspaceId="default-workspace-id"
            workbookId={WORKBOOK_ID} 
            onClose={() => setShowShare(false)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
