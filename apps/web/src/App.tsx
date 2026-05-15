import { useEffect, useState } from 'react';
import { Grid } from './components/Grid';
import { socketService } from './services/socket.service';
import { TopNav } from './components/TopNav';
import { authService } from './services/auth.service';
import { Toolbar } from './components/Toolbar';
import { AIChatPanel } from './components/AIChatPanel';
import { VersionHistory } from './components/VersionHistory';
import { ShareModal } from './components/Modals/ShareModal';
import { AboutPage } from './components/AboutPage';
import { FindReplace } from './components/FindReplace';
import { TemplatesModal } from './components/Modals/TemplatesModal';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './store/useToastStore';
import { Sparkles, Check, X as CloseIcon, Users } from 'lucide-react';
import { DashboardOverlay, type DashboardData } from './components/DashboardOverlay';
import { CallOverlay } from './components/CallOverlay';

const getWorkbookIdFromUrl = () => {
  const path = window.location.pathname;
  const match = path.match(/\/(workbook|dashboard)\/([^/]+)/);
  return match ? match[2] : null;
};

const isDashboardUrl = () => window.location.pathname.startsWith('/dashboard/');

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
  const [showTemplates, setShowTemplates] = useState(false);
  const [isDashboard] = useState(isDashboardUrl());
  const [joinRequest, setJoinRequest] = useState<{ requesterSocketId: string, name: string } | null>(null);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(!localStorage.getItem('userName'));
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    socketService.connect();
    
    if (socketService.socket) {
      socketService.socket.on('incoming_join_request', (data: { requesterSocketId: string, name: string }) => {
        setJoinRequest(data);
      });

      socketService.socket.on('join_request_accepted', (data: { targetRoomId: string }) => {
        window.history.pushState(null, '', `/workbook/${data.targetRoomId}`);
        setWorkbookId(data.targetRoomId);
        toast('✅ Your join request was accepted!', 'success');
      });

      socketService.socket.on('join_request_denied', () => {
        toast('❌ The host denied your request to join.', 'error');
      });

      socketService.socket.on('user_joined', (user: { name: string }) => {
        setJoinNotification(`${user.name} joined the room`);
        setTimeout(() => setJoinNotification(null), 5000);
      });
    }

    // 🛡️ THE BODYGUARD: Silent Refresh (every 50 seconds for 1-min JWT)
    const refreshInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await authService.refreshToken();
      }
    }, 50000);

    return () => {
      clearInterval(refreshInterval);
      socketService.socket?.off('incoming_join_request');
      socketService.socket?.off('join_request_accepted');
      socketService.socket?.off('join_request_denied');
      socketService.socket?.off('user_joined');
    };
  }, []);

  useEffect(() => {
    const handleShowDashboard = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardData>;
      setDashboardData(customEvent.detail);
    };
    window.addEventListener('show-dashboard', handleShowDashboard);
    return () => window.removeEventListener('show-dashboard', handleShowDashboard);
  }, []);

  useEffect(() => {
    if (!workbookId || showJoinModal) return;
    socketService.joinWorkbook(workbookId);

    return () => {
      socketService.leaveWorkbook(workbookId);
    };
  }, [workbookId, showJoinModal]);

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
      {!isDashboard && (
        <TopNav 
          onShowVersionHistory={() => setShowVersionHistory(true)} 
          onShowShare={() => setShowShare(true)} 
          onShowAbout={() => setShowAbout(true)}
          onShowTemplates={() => setShowTemplates(true)}
          onNewWorkbook={() => {
            const newId = generate6DigitCode();
            window.history.pushState(null, '', `/workbook/${newId}`);
            setWorkbookId(newId);
            window.location.reload();
          }}
        />
      )}

      {!isDashboard && <Toolbar onToggleAI={() => setShowAI(!showAI)} />}

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <Grid isDashboard={isDashboard} workbookId={workbookId} />
          {!isDashboard && <FindReplace />}
        </div>

        {!isDashboard && showAI && (
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
            workbookId={workbookId} 
            onClose={() => setShowShare(false)} 
          />
        )}
        
        {showAbout && (
          <AboutPage onClose={() => setShowAbout(false)} />
        )}

        {showTemplates && (
          <TemplatesModal onClose={() => setShowTemplates(false)} />
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

        {/* Join Notification Toast */}
        {joinNotification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-8 duration-500">
            <div className="bg-accent/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-2 flex items-center gap-3">
              <Sparkles size={16} className="text-white animate-pulse" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">{joinNotification}</span>
            </div>
          </div>
        )}

        {dashboardData && (
          <DashboardOverlay data={dashboardData} onClose={() => setDashboardData(null)} />
        )}

        <CallOverlay />

        {/* Join Identity Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <div className="bg-surface border border-white/10 rounded-[32px] shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center text-accent">
                <Users size={40} />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white tracking-tight">Who's Joining?</h2>
                <p className="text-sm text-textMuted leading-relaxed px-4">Welcome to Dora AI! Please enter your name to start.</p>
              </div>
              <div className="w-full space-y-4">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Enter your name" 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-accent transition-all text-center font-bold tracking-wide"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tempName.trim()) {
                      localStorage.setItem('userName', tempName.trim());
                      setShowJoinModal(false);
                      window.location.reload(); // Refresh to sync everything with the new name
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (tempName.trim()) {
                      localStorage.setItem('userName', tempName.trim());
                      setShowJoinModal(false);
                      window.location.reload();
                    }
                  }}
                  disabled={!tempName.trim()}
                  className="w-full bg-accent hover:bg-accentHover disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-[0.98]"
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
