import { useEffect, useRef } from 'react';
import { X, Sparkles, Receipt, ListTodo, Wallet, Check, TrendingUp, Target, Activity } from 'lucide-react';
import gsap from 'gsap';
import { useSheetStore, type CellData } from '../../store/useSheetStore';
import { socketService } from '../../services/socket.service';
import { getWorkbookIdFromUrl } from '../../utils/workbookUrl';
import { toast } from '../../store/useToastStore';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: typeof Wallet | typeof ListTodo | typeof Receipt | typeof TrendingUp | typeof Target | typeof Activity;
  color: string;
  bgColor: string;
  borderColor: string;
  cells: Record<string, Partial<CellData>>;
}

export const TemplatesModal = ({ onClose }: { onClose: () => void }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { bulkSetCellData } = useSheetStore();

  useEffect(() => {
    gsap.fromTo(modalRef.current,
      { scale: 0.9, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'power4.out' }
    );
  }, []);

  const templates: Template[] = [
    {
      id: 'budget',
      name: 'Monthly Budget',
      description: 'Track household or personal income and expenses with automatic totals and net difference calculations.',
      icon: Wallet,
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.05)',
      borderColor: 'rgba(99, 102, 241, 0.2)',
      cells: {
        'r_0_c_0': { v: 'Monthly Budget Plan', fmt: { bold: true, fontSize: 16, color: '#6366f1' } },
        'r_2_c_0': { v: 'Category', fmt: { bold: true, backgroundColor: '#1e1b4b', color: '#ffffff' } },
        'r_2_c_1': { v: 'Budgeted ($)', fmt: { bold: true, backgroundColor: '#1e1b4b', color: '#ffffff' } },
        'r_2_c_2': { v: 'Actual ($)', fmt: { bold: true, backgroundColor: '#1e1b4b', color: '#ffffff' } },
        'r_2_c_3': { v: 'Difference ($)', fmt: { bold: true, backgroundColor: '#1e1b4b', color: '#ffffff' } },
        'r_3_c_0': { v: 'Housing', fmt: { italic: false } },
        'r_3_c_1': { v: 1500 },
        'r_3_c_2': { v: 1450 },
        'r_3_c_3': { f: '=B4-C4', v: 50 },
        'r_4_c_0': { v: 'Utilities' },
        'r_4_c_1': { v: 300 },
        'r_4_c_2': { v: 330 },
        'r_4_c_3': { f: '=B5-C5', v: -30 },
        'r_5_c_0': { v: 'Groceries' },
        'r_5_c_1': { v: 450 },
        'r_5_c_2': { v: 420 },
        'r_5_c_3': { f: '=B6-C6', v: 30 },
        'r_6_c_0': { v: 'Transportation' },
        'r_6_c_1': { v: 250 },
        'r_6_c_2': { v: 280 },
        'r_6_c_3': { f: '=B7-C7', v: -30 },
        'r_7_c_0': { v: 'Entertainment' },
        'r_7_c_1': { v: 200 },
        'r_7_c_2': { v: 150 },
        'r_7_c_3': { f: '=B8-C8', v: 50 },
        'r_8_c_0': { v: 'Savings' },
        'r_8_c_1': { v: 500 },
        'r_8_c_2': { v: 500 },
        'r_8_c_3': { f: '=B9-C9', v: 0 },
        'r_10_c_0': { v: 'Total Net', fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_10_c_1': { f: '=SUM(B4:B9)', v: 3200, fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_10_c_2': { f: '=SUM(C4:C9)', v: 3130, fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_10_c_3': { f: '=SUM(D4:D9)', v: 70, fmt: { bold: true, backgroundColor: '#0f172a', color: '#6366f1' } }
      }
    },
    {
      id: 'todo',
      name: 'Team Project Planner',
      description: 'Streamline team sprints, prioritize product backlogs, assign deadlines, and track current project tasks.',
      icon: ListTodo,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.05)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
      cells: {
        'r_0_c_0': { v: 'Project Task Board', fmt: { bold: true, fontSize: 16, color: '#10b981' } },
        'r_2_c_0': { v: 'Task Assignment', fmt: { bold: true, backgroundColor: '#064e3b', color: '#ffffff' } },
        'r_2_c_1': { v: 'Priority Level', fmt: { bold: true, backgroundColor: '#064e3b', color: '#ffffff' } },
        'r_2_c_2': { v: 'Sprint Status', fmt: { bold: true, backgroundColor: '#064e3b', color: '#ffffff' } },
        'r_2_c_3': { v: 'Target Deadline', fmt: { bold: true, backgroundColor: '#064e3b', color: '#ffffff' } },
        'r_3_c_0': { v: 'Optimize LiveKit Active Call Overlay' },
        'r_3_c_1': { v: 'High', fmt: { color: '#ef4444', bold: true } },
        'r_3_c_2': { v: 'Completed', fmt: { color: '#10b981', bold: true } },
        'r_3_c_3': { v: '2026-05-18' },
        'r_4_c_0': { v: 'Implement Help & Contact Us Page' },
        'r_4_c_1': { v: 'High', fmt: { color: '#ef4444', bold: true } },
        'r_4_c_2': { v: 'Completed', fmt: { color: '#10b981', bold: true } },
        'r_4_c_3': { v: '2026-05-18' },
        'r_5_c_0': { v: 'Add Beautiful Templates Modal' },
        'r_5_c_1': { v: 'Medium', fmt: { color: '#f59e0b', bold: true } },
        'r_5_c_2': { v: 'In Progress', fmt: { color: '#f59e0b', bold: true } },
        'r_5_c_3': { v: '2026-05-19' },
        'r_6_c_0': { v: 'Integrate Collaborative Dashboard Sharing' },
        'r_6_c_1': { v: 'Medium', fmt: { color: '#f59e0b', bold: true } },
        'r_6_c_2': { v: 'In Progress', fmt: { color: '#f59e0b', bold: true } },
        'r_6_c_3': { v: '2026-05-19' },
        'r_7_c_0': { v: 'Perform Production Build & Verification' },
        'r_7_c_1': { v: 'High', fmt: { color: '#ef4444', bold: true } },
        'r_7_c_2': { v: 'Planned', fmt: { color: '#94a3b8' } },
        'r_7_c_3': { v: '2026-05-20' }
      }
    },
    {
      id: 'invoice',
      name: 'Professional Client Invoice',
      description: 'Generate customizable bills for clients with item description, active quantity, price, and auto-computed grand totals.',
      icon: Receipt,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.05)',
      borderColor: 'rgba(245, 158, 11, 0.2)',
      cells: {
        'r_0_c_0': { v: 'Client Invoice Details', fmt: { bold: true, fontSize: 16, color: '#f59e0b' } },
        'r_2_c_0': { v: 'Item Description', fmt: { bold: true, backgroundColor: '#78350f', color: '#ffffff' } },
        'r_2_c_1': { v: 'Quantity', fmt: { bold: true, backgroundColor: '#78350f', color: '#ffffff' } },
        'r_2_c_2': { v: 'Unit Price ($)', fmt: { bold: true, backgroundColor: '#78350f', color: '#ffffff' } },
        'r_2_c_3': { v: 'Total Price ($)', fmt: { bold: true, backgroundColor: '#78350f', color: '#ffffff' } },
        'r_3_c_0': { v: 'Spreadsheet Core Engine Development' },
        'r_3_c_1': { v: 45 },
        'r_3_c_2': { v: 80 },
        'r_3_c_3': { f: '=B4*C4', v: 3600 },
        'r_4_c_0': { v: 'Real-time Socket Collaboration Integration' },
        'r_4_c_1': { v: 20 },
        'r_4_c_2': { v: 75 },
        'r_4_c_3': { f: '=B5*C5', v: 1500 },
        'r_5_c_0': { v: 'Vanta Cinematic Aurora About Page Design' },
        'r_5_c_1': { v: 12 },
        'r_5_c_2': { v: 90 },
        'r_5_c_3': { f: '=B6*C6', v: 1080 },
        'r_7_c_0': { v: 'Grand Total', fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_7_c_3': { f: '=SUM(D4:D6)', v: 6180, fmt: { bold: true, backgroundColor: '#0f172a', color: '#f59e0b' } }
      }
    },
    {
      id: 'pipeline',
      name: 'Sales Deal Pipeline',
      description: 'Model customer sales prospects, target deals, closing probability percentages, and active weighted pipelines.',
      icon: TrendingUp,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.05)',
      borderColor: 'rgba(139, 92, 246, 0.2)',
      cells: {
        'r_0_c_0': { v: 'Sales Pipeline Cockpit', fmt: { bold: true, fontSize: 16, color: '#8b5cf6' } },
        'r_2_c_0': { v: 'Company Lead', fmt: { bold: true, backgroundColor: '#311042', color: '#ffffff' } },
        'r_2_c_1': { v: 'Deal Value ($)', fmt: { bold: true, backgroundColor: '#311042', color: '#ffffff' } },
        'r_2_c_2': { v: 'Probability (%)', fmt: { bold: true, backgroundColor: '#311042', color: '#ffffff' } },
        'r_2_c_3': { v: 'Weighted Pipeline ($)', fmt: { bold: true, backgroundColor: '#311042', color: '#ffffff' } },
        'r_3_c_0': { v: 'Acme Corporate Solutions' },
        'r_3_c_1': { v: 50000 },
        'r_3_c_2': { v: 0.8 },
        'r_3_c_3': { f: '=B4*C4', v: 40000 },
        'r_4_c_0': { v: 'Globex Retail Group' },
        'r_4_c_1': { v: 120000 },
        'r_4_c_2': { v: 0.5 },
        'r_4_c_3': { f: '=B5*C5', v: 60000 },
        'r_5_c_0': { v: 'Initech Enterprise Software' },
        'r_5_c_1': { v: 35000 },
        'r_5_c_2': { v: 0.9 },
        'r_5_c_3': { f: '=B6*C6', v: 31500 },
        'r_6_c_0': { v: 'Umbrella Security Systems' },
        'r_6_c_1': { v: 80000 },
        'r_6_c_2': { v: 0.2 },
        'r_6_c_3': { f: '=B7*C7', v: 16000 },
        'r_8_c_0': { v: 'Total Forecast Pipeline', fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_8_c_3': { f: '=SUM(D4:D7)', v: 147500, fmt: { bold: true, backgroundColor: '#0f172a', color: '#8b5cf6' } }
      }
    },
    {
      id: 'marketing',
      name: 'Marketing Campaign ROI',
      description: 'Audit marketing expenses across digital channels and measure customer acquisition efficiency.',
      icon: Target,
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.05)',
      borderColor: 'rgba(236, 72, 153, 0.2)',
      cells: {
        'r_0_c_0': { v: 'Marketing ROI Analytics', fmt: { bold: true, fontSize: 16, color: '#ec4899' } },
        'r_2_c_0': { v: 'Acquisition Channel', fmt: { bold: true, backgroundColor: '#500724', color: '#ffffff' } },
        'r_2_c_1': { v: 'Campaign Budget ($)', fmt: { bold: true, backgroundColor: '#500724', color: '#ffffff' } },
        'r_2_c_2': { v: 'Acquired Users', fmt: { bold: true, backgroundColor: '#500724', color: '#ffffff' } },
        'r_2_c_3': { v: 'CAC ($/User)', fmt: { bold: true, backgroundColor: '#500724', color: '#ffffff' } },
        'r_3_c_0': { v: 'Google Search Ads' },
        'r_3_c_1': { v: 2400 },
        'r_3_c_2': { v: 120 },
        'r_3_c_3': { f: '=B4/C4', v: 20 },
        'r_4_c_0': { v: 'Facebook Social Ads' },
        'r_4_c_1': { v: 1800 },
        'r_4_c_2': { v: 60 },
        'r_4_c_3': { f: '=B5/C5', v: 30 },
        'r_5_c_0': { v: 'Weekly Newsletters' },
        'r_5_c_1': { v: 300 },
        'r_5_c_2': { v: 50 },
        'r_5_c_3': { f: '=B6/C6', v: 6 },
        'r_6_c_0': { v: 'SEO & Content Hub' },
        'r_6_c_1': { v: 1200 },
        'r_6_c_2': { v: 150 },
        'r_6_c_3': { f: '=B7/C7', v: 8 },
        'r_8_c_0': { v: 'Aggregated Metrics', fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_8_c_1': { f: '=SUM(B4:B7)', v: 5700, fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } },
        'r_8_c_2': { f: '=SUM(C4:C7)', v: 380, fmt: { bold: true, backgroundColor: '#0f172a', color: '#f8fafc' } }
      }
    },
    {
      id: 'saas',
      name: 'SaaS Metric Cockpit',
      description: 'Model Monthly Recurring Revenue (MRR), subscription expansions, ARPU, and user churn growth ratios.',
      icon: Activity,
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.05)',
      borderColor: 'rgba(6, 182, 212, 0.2)',
      cells: {
        'r_0_c_0': { v: 'SaaS Performance Board', fmt: { bold: true, fontSize: 16, color: '#06b6d4' } },
        'r_2_c_0': { v: 'Executive KPI', fmt: { bold: true, backgroundColor: '#155e75', color: '#ffffff' } },
        'r_2_c_1': { v: 'Q1 Active ($)', fmt: { bold: true, backgroundColor: '#155e75', color: '#ffffff' } },
        'r_2_c_2': { v: 'Q2 Active ($)', fmt: { bold: true, backgroundColor: '#155e75', color: '#ffffff' } },
        'r_2_c_3': { v: 'Quarterly Growth', fmt: { bold: true, backgroundColor: '#155e75', color: '#ffffff' } },
        'r_3_c_0': { v: 'Recurring Revenue (MRR)' },
        'r_3_c_1': { v: 45000 },
        'r_3_c_2': { v: 54000 },
        'r_3_c_3': { f: '=(C4-B4)/B4', v: 0.2 },
        'r_4_c_0': { v: 'Active Subscriptions' },
        'r_4_c_1': { v: 1200 },
        'r_4_c_2': { v: 1380 },
        'r_4_c_3': { f: '=(C5-B5)/B5', v: 0.15 },
        'r_5_c_0': { v: 'User Churn Rate (%)' },
        'r_5_c_1': { v: 0.024 },
        'r_5_c_2': { v: 0.019 },
        'r_5_c_3': { f: '=(C6-B6)/B6', v: -0.208 }
      }
    }
  ];

  const handleSelectTemplate = (template: Template) => {
    // Stage and apply template locally
    bulkSetCellData(template.cells);

    // Sync template bulk changes to other connected collaborators via sockets
    const workbookId = getWorkbookIdFromUrl();
    socketService.emitBulkCellUpdate(workbookId, template.cells);

    toast(`Successfully loaded "${template.name}" Template!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/50 backdrop-blur-md">
      <div 
        ref={modalRef}
        className="w-full max-w-4xl bg-surface border border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-xl text-accent shadow-lg shadow-accent/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Sheet Templates Directory</h2>
              <p className="text-xs text-textMuted font-medium uppercase tracking-widest mt-0.5">Pre-built collaborative spreadsheet blueprints</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-textMuted hover:text-white transition-all"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-b from-transparent to-black/10">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group relative flex flex-col justify-between items-start text-left p-6 bg-surfaceHover/30 border border-white/5 rounded-2xl hover:border-accentHover hover:bg-accent/5 transition-all duration-300 shadow-sm"
                style={{ 
                  backgroundColor: template.bgColor,
                  borderColor: template.borderColor
                }}
              >
                {/* Floating shine */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
                  style={{
                    background: `radial-gradient(400px circle at var(--x, 0px) var(--y, 0px), rgba(255,255,255,0.03), transparent)`
                  }}
                />

                <div className="w-full">
                  {/* Icon */}
                  <div 
                    className="p-3 rounded-xl mb-5 flex items-center justify-center w-12 h-12 shadow-sm"
                    style={{ 
                      backgroundColor: `${template.color}15`, 
                      color: template.color 
                    }}
                  >
                    <Icon size={22} />
                  </div>

                  <h3 className="font-bold text-white text-base group-hover:text-accent transition-colors duration-300 mb-2">
                    {template.name}
                  </h3>
                  
                  <p className="text-xs text-textMuted leading-relaxed mb-6 font-medium">
                    {template.description}
                  </p>
                </div>

                <div className="w-full flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[10px] font-bold text-textMuted group-hover:text-accent uppercase tracking-wider transition-colors">
                    Load Blueprint
                  </span>
                  <div 
                    className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-textMuted group-hover:bg-accent group-hover:text-white group-hover:scale-110 transition-all duration-300"
                  >
                    <Check size={14} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
