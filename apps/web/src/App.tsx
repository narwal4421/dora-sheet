import { useEffect, useState } from 'react';
import { Grid } from './components/Grid';
import { socketService } from './services/socket.service';
import { TopNav } from './components/TopNav';
import { Toolbar } from './components/Toolbar';
import { AIChatPanel } from './components/AIChatPanel';
import { VersionHistory } from './components/VersionHistory';
import { ShareModal } from './components/Modals/ShareModal';
import { AboutPage } from './components/AboutPage';
import { FindReplace } from './components/FindReplace';
import { Check, X as CloseIcon, Sparkles } from 'lucide-react';

const getWorkbookIdFromUrl = () => {
  const path = window.location.pathname;
  if (path.startsWith('/workbook/')) {
    return path.split('/workbook/')[1];
  }
  return null;
};

const generate6DigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const INITIAL_WORKBOOK_ID = getWorkbookIdFromUrl() || generate6DigitCode();
if (!getWorkbookIdFromUrl()) {
  window.history.replaceState(null, '', `/workbook/${INITIAL_WORKBOOK_ID}`);
}

function App() {
  const [workbookId, setWorkbookId] = useState<string>(INITIAL_WORKBOOK_ID);
  const [showAI, setShowAI] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [joinRequest, setJoinRequest] = useState<{ requesterSocketId: string, name: string } | null>(null);

  useEffect(() => {
    socketService.connect();
    
    if (socketService.socket) {
      socketService.socket.on('incoming_join_request', (data: { requesterSocketId: string, name: string }) => {
        setJoinRequest(data);
      });

      socketService.socket.on('join_request_accepted', (data: { targetRoomId: string }) => {
        window.history.pushState(null, '', `/workbook/${data.targetRoomId}`);
        setWorkbookId(data.targetRoomId);
        alert('Your join request was accepted!');
      });

      socketService.socket.on('join_request_denied', () => {
        alert('The host denied your request to join.');
      });
    }

    return () => {
      socketService.socket?.off('incoming_join_request');
      socketService.socket?.off('join_request_accepted');
      socketService.socket?.off('join_request_denied');
    };
  }, []);

  useEffect(() => {
    if (!workbookId) return;
    socketService.joinWorkbook(workbookId);

    return () => {
      socketService.leaveWorkbook(workbookId);
    };
  }, [workbookId]);

  const handleAcceptJoin = () => {
    if (joinRequest) {
      socketService.respondToJoinRequest(joinRequest.requesterSocketId, true, workbookId);
      setJoinRequest(null);
    }
  };

  const handleDenyJoin = () => {
    if (joinRequest) {
      socketService.respondToJoinRequest(joinRequest.requesterSocketId, false, workbookId);
      setJoinRequest(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-background font-sans text-textMain overflow-hidden selection:bg-accent/30 selection:text-accentHover">
      {/* Top Header Navigation */}
      <TopNav 
        onShowVersionHistory={() => setShowVersionHistory(true)} 
        onShowShare={() => setShowShare(true)} 
        onShowAbout={() => setShowAbout(true)}
      />

      {/* Formatting Toolbar */}
      <Toolbar onToggleAI={() => setShowAI(!showAI)} />

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col flex-1 overflow-hidden border-r border-border shadow-inner relative">
          <Grid />
          <FindReplace />
        </div>

        {showAI && (
          <div className="h-full flex-shrink-0 animate-in slide-in-from-right-8 duration-200">
            <AIChatPanel onClose={() => setShowAI(false)} />
          </div>
        )}

        {showVersionHistory && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl h-full bg-surface border border-border shadow-2xl rounded-xl overflow-hidden flex flex-col relative">
               <button 
                 onClick={() => setShowVersionHistory(false)} 
                 className="absolute top-4 right-4 bg-surfaceHover p-2 rounded-full hover:bg-border transition-colors z-10 text-textMuted"
               >
                 <CloseIcon size={20} />
               </button>
               <VersionHistory workbookId={workbookId} onClose={() => setShowVersionHistory(false)} />
            </div>
          </div>
        )}

        {showShare && (
          <ShareModal 
            workspaceId="default-workspace-id"
            workbookId={workbookId} 
            onClose={() => setShowShare(false)} 
          />
        )}
        
        {showAbout && (
          <AboutPage onClose={() => setShowAbout(false)} />
        )}

        {/* Join Request Toast */}
        {joinRequest && (
          <div className="fixed bottom-8 left-8 z-[100] animate-in slide-in-from-left-8 duration-500">
            <div className="bg-surface border border-accent/30 shadow-2xl rounded-2xl p-4 flex flex-col gap-4 min-w-[300px] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Join Request</h4>
                  <p className="text-xs text-textMuted">{joinRequest.name} wants to collaborate.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleAcceptJoin}
                  className="flex-1 bg-accent hover:bg-accentHover text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Check size={14} /> Approve
                </button>
                <button 
                  onClick={handleDenyJoin}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-textMuted py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/10"
                >
                  <CloseIcon size={14} /> Deny
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
