import { useEffect, useState, useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Grid } from './components/Grid';
import { socketService } from './services/socket.service';
import { TopNav } from './components/TopNav';
import { Toolbar } from './components/Toolbar';
import { AIChatPanel } from './components/AIChatPanel';
import { VersionHistory } from './components/VersionHistory';
import { ShareModal } from './components/Modals/ShareModal';
import { AboutPage } from './components/AboutPage';
import { FindReplace } from './components/FindReplace';
import { ToastContainer } from './components/ToastContainer';
import { Sparkles, X as CloseIcon } from 'lucide-react';
import { useSheetStore } from './store/useSheetStore';
import { DashboardOverlay, type DashboardData } from './components/DashboardOverlay';
import { CallOverlay } from './components/CallOverlay';
import { JoinRequestStack } from './components/Collaboration/JoinRequestStack';
import { RoomLockedModal } from './components/Collaboration/RoomLockedModal';
import { JoinIdentityModal } from './components/Collaboration/JoinIdentityModal';
import { toast } from './store/useToastStore';

const getWorkbookIdFromUrl = () => {
  const path = window.location.pathname;
  const match = path.match(/\/(workbook|dashboard)\/([^/]+)/);
  return match ? match[2] : 'default';
};

/**
 * GOD LEVEL APPLICATION ORCHESTRATOR
 * Orchestrates real-time state, high-performance UI layers, 
 * and ultra-fluid GSAP animations.
 */
function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const workbookId = useMemo(() => getWorkbookIdFromUrl(), []);
  const isDashboard = workbookId === 'dashboard';

  // --- STATE EXTRACTION (SELECTOR PATTERN FOR PERFORMANCE) ---
  const localUserName = useSheetStore(state => state.localUserName);
  const pendingJoinRequests = useSheetStore(state => state.pendingJoinRequests);
  const roomLockError = useSheetStore(state => state.roomLockError);
  const isWaitingForApproval = useSheetStore(state => state.isWaitingForApproval);
  const setRoomLockError = useSheetStore(state => state.setRoomLockError);
  const setIsWaitingForApproval = useSheetStore(state => state.setIsWaitingForApproval);
  const removeJoinRequest = useSheetStore(state => state.removeJoinRequest);

  // --- UI TOGGLES ---
  const [showShare, setShowShare] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!localStorage.getItem('userName') || localStorage.getItem('userName') === 'Guest User');
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // --- LIFECYCLE: SOCKET HANDSHAKE ---
  useEffect(() => {
    if (isDashboard) return;

    const init = async () => {
      socketService.connect();
      const res = await socketService.joinWorkbook();
      
      if (!res.success && res.reason === 'LOCKED') {
        setRoomLockError(true);
      }
    };

    init();

    return () => { socketService.socket?.disconnect(); };
  }, [workbookId, isDashboard, localUserName, setRoomLockError, isWaitingForApproval]);

  // --- ANIMATIONS: GSAP PREMIUM ---
  useGSAP(() => {
    if (joinNotification) {
      gsap.fromTo('.join-toast', 
        { y: -100, opacity: 0, scale: 0.9 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );
      const timer = setTimeout(() => setJoinNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [joinNotification]);

  // --- HANDLERS ---
  const handleAcceptJoin = (req: { requesterSocketId: string, requesterUserId: string }) => {
    socketService.respondToJoinRequest(req.requesterSocketId, req.requesterUserId, true, workbookId);
    removeJoinRequest(req.requesterSocketId);
  };

  const handleDenyJoin = (req: { requesterSocketId: string, requesterUserId: string }) => {
    socketService.respondToJoinRequest(req.requesterSocketId, req.requesterUserId, false, workbookId);
    removeJoinRequest(req.requesterSocketId);
  };

  const handleRequestAccess = () => {
    socketService.requestToJoin(workbookId, { name: localUserName, socketId: socketService.socket?.id || '' });
    setIsWaitingForApproval(true);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-screen w-screen bg-background font-sans text-textMain overflow-hidden selection:bg-accent/30 selection:text-accentHover">
      {!isDashboard && (
        <TopNav 
          onShowShare={() => setShowShare(true)} 
          onShowAbout={() => setShowAbout(true)} 
          onShowVersionHistory={() => setShowVersionHistory(true)}
          onNewWorkbook={() => {
            const newId = Math.floor(100000 + Math.random() * 900000).toString();
            window.location.href = `/workbook/${newId}`;
          }}
          onShowTemplates={() => toast('Templates feature is coming soon!', 'info')}
        />
      )}

      {!isDashboard && <Toolbar onToggleAI={() => setShowAI(!showAI)} />}

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
          <Grid isDashboard={isDashboard} workbookId={workbookId} />
          {!isDashboard && <FindReplace />}
        </main>

        {!isDashboard && showAI && (
          <div className="fixed inset-0 md:relative md:h-full flex-shrink-0 z-[60] md:z-auto animate-in slide-in-from-right-8 duration-200">
            <AIChatPanel onClose={() => setShowAI(false)} />
          </div>
        )}

        {/* --- PREMIUM OVERLAYS --- */}
        
        {showShare && <ShareModal workbookId={workbookId} onClose={() => setShowShare(false)} />}
        {showAbout && <AboutPage onClose={() => setShowAbout(false)} />}
        {showJoinModal && <JoinIdentityModal onJoin={(name) => {
          useSheetStore.getState().setLocalUserName(name);
          setShowJoinModal(false);
        }} />}

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

        <JoinRequestStack 
          requests={pendingJoinRequests} 
          onAccept={() => handleAcceptJoin(pendingJoinRequests[0])} 
          onDeny={() => handleDenyJoin(pendingJoinRequests[0])} 
        />

        {joinNotification && (
          <div className="join-toast fixed top-24 left-1/2 -translate-x-1/2 z-[100]">
            <div className="bg-accent/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full px-6 py-2 flex items-center gap-3">
              <Sparkles size={16} className="text-white animate-pulse" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">{joinNotification}</span>
            </div>
          </div>
        )}

        {dashboardData && (
          <DashboardOverlay data={dashboardData} onClose={() => setDashboardData(null)} />
        )}

        {roomLockError && (
          <RoomLockedModal 
            isWaiting={isWaitingForApproval} 
            onRequestAccess={handleRequestAccess} 
          />
        )}

        <CallOverlay />
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
