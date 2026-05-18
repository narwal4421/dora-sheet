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
import { JoinRequestStack } from './components/Collaboration/JoinRequestStack';
import { RoomLockedModal } from './components/Collaboration/RoomLockedModal';
import { JoinIdentityModal } from './components/Collaboration/JoinIdentityModal';
import { IncomingCallOverlay } from './components/Modals/IncomingCallOverlay';
import { ActiveCallOverlay } from './components/Modals/ActiveCallOverlay';
import { TemplatesModal } from './components/Modals/TemplatesModal';
import { SheetTabs } from './components/SheetTabs';

const getWorkbookIdFromUrl = () => {
  const path = window.location.pathname;
  const match = path.match(/\/(workbook|dashboard)\/([^/]+)/);
  if (match) return match[2];
  
  const newId = Math.floor(100000 + Math.random() * 900000).toString();
  window.history.replaceState(null, '', `/workbook/${newId}`);
  return newId;
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
  const [showTemplates, setShowTemplates] = useState(false);

  // --- LIFECYCLE: SOCKET HANDSHAKE ---
  useEffect(() => {
    if (isDashboard) return;

    const init = async () => {
      socketService.connect();
      const res = await socketService.joinWorkbook();
      if (!res.success && res.reason === 'LOCKED') {
        useSheetStore.getState().setRoomLockError(true);
      } else if (res.success) {
        useSheetStore.getState().setRoomLockError(false);
      }
    };

    init();

    return () => { socketService.socket?.disconnect(); };
  }, [workbookId, isDashboard]);

  // --- LIFECYCLE: LISTEN FOR CINEMATIC DASHBOARD TRIGGERS ---
  useEffect(() => {
    const handleShowDashboard = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardData>;
      setDashboardData(customEvent.detail);
    };

    window.addEventListener('show-dashboard', handleShowDashboard);
    return () => {
      window.removeEventListener('show-dashboard', handleShowDashboard);
    };
  }, []);

  // --- LIFECYCLE: LOAD DYNAMIC DASHBOARD ON QUERY PARAM ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dashboard') === 'true') {
      const timer = setTimeout(() => {
        const sheetData = useSheetStore.getState().data;
        const cells = Object.keys(sheetData);

        if (cells.length === 0) {
          // If empty, load a beautiful starter budget dashboard preview
          setDashboardData({
            kpis: [
              { label: 'Total Revenue', value: '$8,450', change: '+12.4%', trend: 'up' },
              { label: 'Operating Cost', value: '$3,120', change: '-4.2%', trend: 'down' },
              { label: 'Net Profit Margin', value: '63.1%', change: '+8.3%', trend: 'up' },
              { label: 'Active Projects', value: '5', change: 'Stable', trend: 'neutral' }
            ],
            charts: [
              {
                title: 'Monthly Financial Growth',
                type: 'area',
                dataKeys: ['Revenue', 'Profit'],
                data: [
                  { name: 'Jan', Revenue: 4000, Profit: 2400 },
                  { name: 'Feb', Revenue: 5000, Profit: 3000 },
                  { name: 'Mar', Revenue: 6200, Profit: 4100 },
                  { name: 'Apr', Revenue: 7500, Profit: 5200 },
                  { name: 'May', Revenue: 8450, Profit: 5330 }
                ]
              },
              {
                title: 'Revenue Allocation',
                type: 'pie',
                dataKeys: ['Share'],
                data: [
                  { name: 'Product Sales', Share: 55 },
                  { name: 'Consulting', Share: 30 },
                  { name: 'Subscribes', Share: 15 }
                ]
              }
            ],
            summary: 'This dashboard provides a live, dynamic summary of the project workspace. Populate cells in the spreadsheet grid or prompt the AI to generate deeper insights!'
          });
          return;
        }

        let totalSum = 0;
        let numCount = 0;
        let maxR = 0;
        let maxC = 0;

        Object.entries(sheetData).forEach(([ref, cell]) => {
          const match = ref.match(/r_(\d+)_c_(\d+)/);
          if (match) {
            maxR = Math.max(maxR, parseInt(match[1]));
            maxC = Math.max(maxC, parseInt(match[2]));
          }
          if (cell.v !== undefined && cell.v !== null && !isNaN(Number(cell.v))) {
            totalSum += Number(cell.v);
            numCount++;
          }
        });

        const avgVal = numCount > 0 ? (totalSum / numCount).toFixed(1) : '0';

        setDashboardData({
          kpis: [
            { label: 'Active Rows', value: String(maxR + 1), change: 'Grid dimension', trend: 'neutral' },
            { label: 'Active Columns', value: String(maxC + 1), change: 'Grid dimension', trend: 'neutral' },
            { label: 'Populated Cells', value: String(cells.length), change: 'Active dataset', trend: 'up' },
            { label: 'Aggregate Metric Sum', value: totalSum > 0 ? totalSum.toLocaleString() : '0', change: `Avg: ${avgVal}`, trend: totalSum > 0 ? 'up' : 'neutral' }
          ],
          charts: [
            {
              title: 'Spreadsheet Dataset Visualizer',
              type: 'bar',
              dataKeys: ['Values'],
              data: Object.entries(sheetData)
                .filter(([, c]) => c.v !== undefined && c.v !== null && !isNaN(Number(c.v)))
                .slice(0, 8)
                .map(([ref, c]) => ({
                  name: ref.replace('r_', 'Row ').replace('_c_', ' Col '),
                  Values: Number(c.v)
                }))
            }
          ],
          summary: `This shared live dashboard displays real-time spreadsheet intelligence for your active workbook room (${maxR + 1} rows by ${maxC + 1} columns). It dynamically updates as collaborators modify cells!`
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [workbookId]);

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
          onShowTemplates={() => setShowTemplates(true)}
        />
      )}

      {!isDashboard && <Toolbar onToggleAI={() => setShowAI(!showAI)} />}

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
          <Grid isDashboard={isDashboard} workbookId={workbookId} />
          {!isDashboard && <SheetTabs />}
          {!isDashboard && <FindReplace />}
        </main>

        {!isDashboard && (
          <div className={`fixed inset-0 md:relative md:h-full flex-shrink-0 z-[60] md:z-auto transition-all duration-300 ${showAI ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none absolute'}`}>
            <AIChatPanel onClose={() => setShowAI(false)} />
          </div>
        )}

        {/* --- PREMIUM OVERLAYS --- */}
        
        {showShare && <ShareModal workbookId={workbookId} onClose={() => setShowShare(false)} />}
        {showAbout && <AboutPage onClose={() => setShowAbout(false)} />}
        {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
        {showJoinModal && <JoinIdentityModal onJoin={(name) => {
          useSheetStore.getState().setLocalUserName(name);
          socketService.updateName(name);
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
          onAccept={handleAcceptJoin} 
          onDeny={handleDenyJoin} 
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
      </div>
      <IncomingCallOverlay />
      <ActiveCallOverlay />
      <ToastContainer />
    </div>
  );
}

export default App;
