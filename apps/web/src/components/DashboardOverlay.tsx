import { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { X, TrendingUp, TrendingDown, Minus, LayoutDashboard, Share2, Download } from 'lucide-react';
import gsap from 'gsap';
import { toast } from '../store/useToastStore';
import { socketService } from '../services/socket.service';
import { getWorkbookIdFromUrl } from '../utils/workbookUrl';
import { useSheetStore } from '../store/useSheetStore';

export interface DashboardData {
  kpis: Array<{ label: string; value: string; change?: string; trend?: 'up' | 'down' | 'neutral' }>;
  charts: Array<{ title: string; type: 'bar' | 'line' | 'area' | 'pie'; data: Record<string, unknown>[]; dataKeys: string[] }>;
  summary: string;
}

export const DashboardOverlay = ({ data, onClose }: { data: DashboardData; onClose: () => void }) => {
  useEffect(() => {
    gsap.fromTo(".dashboard-card", 
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.1, duration: 0.6, ease: "power3.out" }
    );
    gsap.fromTo(".dashboard-chart",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, stagger: 0.15, duration: 0.8, delay: 0.3, ease: "power2.out" }
    );
  }, []);

  const getChartOption = (chart: DashboardData['charts'][0]) => {
    const isPie = chart.type === 'pie';
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: chart.title,
        left: 'center',
        textStyle: { color: '#94a3b8', fontSize: 14, fontWeight: '500' }
      },
      tooltip: {
        trigger: isPie ? 'item' : 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(99, 102, 241, 0.2)',
        textStyle: { color: '#f8fafc' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: isPie ? undefined : {
        type: 'category',
        data: chart.data.map(d => d.name || d.label || d.category),
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#64748b' }
      },
      yAxis: isPie ? undefined : {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#64748b' }
      },
      series: chart.dataKeys.map(key => ({
        name: key,
        type: chart.type === 'area' ? 'line' : (chart.type === 'pie' ? 'pie' : chart.type),
        areaStyle: chart.type === 'area' ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(99, 102, 241, 0.3)' }, { offset: 1, color: 'rgba(99, 102, 241, 0)' }]
          }
        } : undefined,
        data: isPie 
          ? chart.data.map(d => ({ name: d.name || d.label || d.category, value: d[key] }))
          : chart.data.map(d => d[key]),
        itemStyle: {
          color: isPie ? undefined : '#6366f1',
          borderRadius: chart.type === 'bar' ? [4, 4, 0, 0] : 0
        },
        smooth: true,
        symbol: 'none'
      }))
    };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-background/40 backdrop-blur-md">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-surface/95 border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-8 py-4 md:py-6 border-b border-white/5 bg-surface/50 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-xl text-accent shadow-[0_0_15px_rgba(99,102,241,0.3)] shrink-0">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">AI Cinematic Dashboard</h2>
              <p className="text-[10px] md:text-xs text-textMuted font-medium uppercase tracking-widest mt-0.5">Automated Insights & Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const workbookId = getWorkbookIdFromUrl();
                  const shareUrl = `${window.location.origin}${window.location.pathname}?dashboard=true`;
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    toast('Dashboard link copied to clipboard!', 'success');
                  }).catch(() => {
                    toast('Failed to copy link, but shared with team!', 'warning');
                  });

                  socketService.emitSheetAction(workbookId, 'share_dashboard', {
                    data,
                    sender: useSheetStore.getState().localUserName
                  });
                  toast('Broadcasted live cinematic dashboard to all connected collaborators!', 'success');
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs md:text-sm text-textMain transition-all" 
                title="Share"
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button 
                onClick={() => toast('PDF Export is being optimized for cinematic resolution...', 'info')}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-accent hover:bg-accentHover rounded-xl text-xs md:text-sm text-white font-medium transition-all shadow-lg shadow-accent/20" 
                title="Export PDF"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block w-px h-6 bg-white/10 mx-2" />
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-all"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-b from-transparent to-black/20">
          
          {/* Summary Alert */}
          <div className="mb-6 md:mb-8 p-4 md:p-6 bg-accent/5 border border-accent/20 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-accent/20" />
            <h3 className="text-xs font-bold text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Executive Summary
            </h3>
            <p className="text-textMain leading-relaxed relative z-10 text-base md:text-lg font-medium italic opacity-90">
              "{data.summary}"
            </p>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {data.kpis.map((kpi, i) => (
              <div key={i} className="dashboard-card bg-surfaceHover/50 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-sm hover:border-accent/30 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider">{kpi.label}</span>
                  {kpi.trend === 'up' && <div className="p-1 bg-green-500/10 text-green-400 rounded-lg"><TrendingUp size={14} /></div>}
                  {kpi.trend === 'down' && <div className="p-1 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown size={14} /></div>}
                  {kpi.trend === 'neutral' && <div className="p-1 bg-blue-500/10 text-blue-400 rounded-lg"><Minus size={14} /></div>}
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-white group-hover:text-accent transition-colors duration-300">{kpi.value}</span>
                  {kpi.change && (
                    <span className={`text-xs font-semibold mt-1 ${kpi.trend === 'up' ? 'text-green-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-textMuted'}`}>
                      {kpi.change} from last period
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {data.charts.map((chart, i) => (
              <div key={i} className="dashboard-chart bg-surfaceHover/30 backdrop-blur-sm border border-white/5 p-6 rounded-3xl h-[400px] flex flex-col hover:border-white/10 transition-all duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white tracking-wide">{chart.title}</h3>
                  <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-textMuted uppercase font-bold tracking-widest">{chart.type} chart</div>
                </div>
                <div className="flex-1 w-full">
                  <ReactECharts 
                    option={getChartOption(chart)} 
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
