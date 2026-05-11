import { useState } from 'react';
import { X, LayoutTemplate, DollarSign, CheckSquare, TrendingUp, FileText, ChevronRight } from 'lucide-react';
import { useSheetStore, type CellData } from '../../store/useSheetStore';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  data: Record<string, Partial<CellData>>;
}

const TEMPLATES: Template[] = [
  {
    id: 'budget',
    name: 'Personal Budget',
    description: 'Track monthly income vs expenses with auto-calculated totals.',
    icon: <DollarSign size={24} />,
    color: '#22c55e',
    data: {
      r_0_c_0: { v: 'Category', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#22c55e' } },
      r_0_c_1: { v: 'Planned (₹)', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#22c55e' } },
      r_0_c_2: { v: 'Actual (₹)', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#22c55e' } },
      r_0_c_3: { v: 'Difference', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#22c55e' } },
      r_1_c_0: { v: 'INCOME', fmt: { bold: true, color: '#22c55e' } },
      r_2_c_0: { v: 'Salary' }, r_2_c_1: { v: 50000 }, r_2_c_2: { v: 50000 }, r_2_c_3: { f: '=C3-B3' },
      r_3_c_0: { v: 'Freelance' }, r_3_c_1: { v: 10000 }, r_3_c_2: { v: 8000 }, r_3_c_3: { f: '=C4-B4' },
      r_4_c_0: { v: 'Other' }, r_4_c_1: { v: 2000 }, r_4_c_2: { v: 1500 }, r_4_c_3: { f: '=C5-B5' },
      r_5_c_0: { v: 'Total Income', fmt: { bold: true } }, r_5_c_1: { f: '=SUM(B3:B5)' }, r_5_c_2: { f: '=SUM(C3:C5)' }, r_5_c_3: { f: '=C6-B6' },
      r_6_c_0: { v: '' },
      r_7_c_0: { v: 'EXPENSES', fmt: { bold: true, color: '#ef4444' } },
      r_8_c_0: { v: 'Rent' }, r_8_c_1: { v: 15000 }, r_8_c_2: { v: 15000 }, r_8_c_3: { f: '=C9-B9' },
      r_9_c_0: { v: 'Food' }, r_9_c_1: { v: 8000 }, r_9_c_2: { v: 9500 }, r_9_c_3: { f: '=C10-B10' },
      r_10_c_0: { v: 'Transport' }, r_10_c_1: { v: 3000 }, r_10_c_2: { v: 2500 }, r_10_c_3: { f: '=C11-B11' },
      r_11_c_0: { v: 'Utilities' }, r_11_c_1: { v: 2000 }, r_11_c_2: { v: 2200 }, r_11_c_3: { f: '=C12-B12' },
      r_12_c_0: { v: 'Entertainment' }, r_12_c_1: { v: 3000 }, r_12_c_2: { v: 4000 }, r_12_c_3: { f: '=C13-B13' },
      r_13_c_0: { v: 'Total Expenses', fmt: { bold: true } }, r_13_c_1: { f: '=SUM(B9:B13)' }, r_13_c_2: { f: '=SUM(C9:C13)' }, r_13_c_3: { f: '=C14-B14' },
      r_14_c_0: { v: '' },
      r_15_c_0: { v: 'NET SAVINGS', fmt: { bold: true, color: '#7b5ef6' } }, r_15_c_1: { f: '=B6-B14' }, r_15_c_2: { f: '=C6-C14' }, r_15_c_3: { f: '=C16-B16' },
    }
  },
  {
    id: 'tasks',
    name: 'Task Manager',
    description: 'Organize your work with status, priority, and deadlines.',
    icon: <CheckSquare size={24} />,
    color: '#7b5ef6',
    data: {
      r_0_c_0: { v: 'Task', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#7b5ef6' } },
      r_0_c_1: { v: 'Priority', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#7b5ef6' } },
      r_0_c_2: { v: 'Status', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#7b5ef6' } },
      r_0_c_3: { v: 'Deadline', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#7b5ef6' } },
      r_0_c_4: { v: 'Assigned To', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#7b5ef6' } },
      r_1_c_0: { v: 'Design landing page' }, r_1_c_1: { v: '🔴 High' }, r_1_c_2: { v: '✅ Done' }, r_1_c_3: { v: '2025-05-10' }, r_1_c_4: { v: 'Pranjal' },
      r_2_c_0: { v: 'Build API endpoints' }, r_2_c_1: { v: '🔴 High' }, r_2_c_2: { v: '🔄 In Progress' }, r_2_c_3: { v: '2025-05-15' }, r_2_c_4: { v: 'Pranjal' },
      r_3_c_0: { v: 'Write documentation' }, r_3_c_1: { v: '🟡 Medium' }, r_3_c_2: { v: '⏳ Pending' }, r_3_c_3: { v: '2025-05-20' }, r_3_c_4: { v: 'Team' },
      r_4_c_0: { v: 'Setup CI/CD pipeline' }, r_4_c_1: { v: '🟡 Medium' }, r_4_c_2: { v: '⏳ Pending' }, r_4_c_3: { v: '2025-05-22' }, r_4_c_4: { v: 'DevOps' },
      r_5_c_0: { v: 'User testing' }, r_5_c_1: { v: '🟢 Low' }, r_5_c_2: { v: '⏳ Pending' }, r_5_c_3: { v: '2025-05-30' }, r_5_c_4: { v: 'QA Team' },
      r_6_c_0: { v: 'Launch on Product Hunt' }, r_6_c_1: { v: '🔴 High' }, r_6_c_2: { v: '⏳ Pending' }, r_6_c_3: { v: '2025-06-01' }, r_6_c_4: { v: 'Pranjal' },
      r_7_c_0: { v: 'Send investor update' }, r_7_c_1: { v: '🟡 Medium' }, r_7_c_2: { v: '⏳ Pending' }, r_7_c_3: { v: '2025-06-05' }, r_7_c_4: { v: 'Pranjal' },
      r_8_c_0: { v: 'Add payment gateway' }, r_8_c_1: { v: '🔴 High' }, r_8_c_2: { v: '⏳ Pending' }, r_8_c_3: { v: '2025-06-10' }, r_8_c_4: { v: 'Pranjal' },
    }
  },
  {
    id: 'sales',
    name: 'Sales Tracker',
    description: 'Track your leads, deals, and revenue with conversion rates.',
    icon: <TrendingUp size={24} />,
    color: '#f97316',
    data: {
      r_0_c_0: { v: 'Lead Name', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#f97316' } },
      r_0_c_1: { v: 'Company', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#f97316' } },
      r_0_c_2: { v: 'Stage', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#f97316' } },
      r_0_c_3: { v: 'Deal Value (₹)', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#f97316' } },
      r_0_c_4: { v: 'Close Date', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#f97316' } },
      r_0_c_5: { v: 'Status', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#f97316' } },
      r_1_c_0: { v: 'Rahul Sharma' }, r_1_c_1: { v: 'Tech Corp' }, r_1_c_2: { v: 'Proposal' }, r_1_c_3: { v: 75000 }, r_1_c_4: { v: '2025-05-15' }, r_1_c_5: { v: '🟡 In Progress' },
      r_2_c_0: { v: 'Ananya Singh' }, r_2_c_1: { v: 'Design Studio' }, r_2_c_2: { v: 'Negotiation' }, r_2_c_3: { v: 45000 }, r_2_c_4: { v: '2025-05-20' }, r_2_c_5: { v: '🔴 At Risk' },
      r_3_c_0: { v: 'Vikram Patel' }, r_3_c_1: { v: 'StartupX' }, r_3_c_2: { v: 'Closed Won' }, r_3_c_3: { v: 120000 }, r_3_c_4: { v: '2025-05-05' }, r_3_c_5: { v: '✅ Won' },
      r_4_c_0: { v: 'Sneha Gupta' }, r_4_c_1: { v: 'Media House' }, r_4_c_2: { v: 'Discovery' }, r_4_c_3: { v: 30000 }, r_4_c_4: { v: '2025-06-01' }, r_4_c_5: { v: '🟢 On Track' },
      r_5_c_0: { v: 'Arjun Mehta' }, r_5_c_1: { v: 'Finance Inc' }, r_5_c_2: { v: 'Closed Lost' }, r_5_c_3: { v: 90000 }, r_5_c_4: { v: '2025-04-30' }, r_5_c_5: { v: '❌ Lost' },
      r_6_c_0: { v: '' },
      r_7_c_0: { v: 'Total Pipeline', fmt: { bold: true } }, r_7_c_3: { f: '=SUM(D2:D6)' },
      r_8_c_0: { v: 'Won Revenue', fmt: { bold: true, color: '#22c55e' } }, r_8_c_3: { v: 120000 },
      r_9_c_0: { v: 'Win Rate', fmt: { bold: true } }, r_9_c_3: { v: '20%' },
    }
  },
  {
    id: 'invoice',
    name: 'Invoice Generator',
    description: 'Create professional invoices with auto-calculated totals and GST.',
    icon: <FileText size={24} />,
    color: '#06b6d4',
    data: {
      r_0_c_0: { v: 'INVOICE', fmt: { bold: true, fontSize: 20, color: '#06b6d4' } },
      r_1_c_0: { v: 'From:', fmt: { bold: true } }, r_1_c_1: { v: 'Pranjal Narwal' },
      r_2_c_0: { v: 'Email:', fmt: { bold: true } }, r_2_c_1: { v: 'doranarwal@gmail.com' },
      r_3_c_0: { v: 'Invoice No:', fmt: { bold: true } }, r_3_c_1: { v: 'INV-001' },
      r_4_c_0: { v: 'Date:', fmt: { bold: true } }, r_4_c_1: { v: new Date().toLocaleDateString('en-IN') },
      r_5_c_0: { v: '' },
      r_6_c_0: { v: 'Bill To:', fmt: { bold: true } }, r_6_c_1: { v: 'Client Name' },
      r_7_c_0: { v: '' },
      r_8_c_0: { v: 'Item', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#06b6d4' } },
      r_8_c_1: { v: 'Description', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#06b6d4' } },
      r_8_c_2: { v: 'Qty', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#06b6d4' } },
      r_8_c_3: { v: 'Rate (₹)', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#06b6d4' } },
      r_8_c_4: { v: 'Amount (₹)', fmt: { bold: true, backgroundColor: '#1a1a2e', color: '#06b6d4' } },
      r_9_c_0: { v: 'Web Development' }, r_9_c_1: { v: 'Frontend UI Design' }, r_9_c_2: { v: 1 }, r_9_c_3: { v: 25000 }, r_9_c_4: { f: '=C10*D10' },
      r_10_c_0: { v: 'API Integration' }, r_10_c_1: { v: 'Backend Services' }, r_10_c_2: { v: 2 }, r_10_c_3: { v: 15000 }, r_10_c_4: { f: '=C11*D11' },
      r_11_c_0: { v: 'Consultation' }, r_11_c_1: { v: 'Technical Advice' }, r_11_c_2: { v: 3 }, r_11_c_3: { v: 5000 }, r_11_c_4: { f: '=C12*D12' },
      r_12_c_0: { v: '' },
      r_13_c_3: { v: 'Subtotal', fmt: { bold: true } }, r_13_c_4: { f: '=SUM(E10:E12)' },
      r_14_c_3: { v: 'GST (18%)', fmt: { bold: true } }, r_14_c_4: { f: '=E14*0.18' },
      r_15_c_3: { v: 'TOTAL', fmt: { bold: true, color: '#06b6d4' } }, r_15_c_4: { f: '=E14+E15', fmt: { bold: true, color: '#06b6d4' } },
      r_16_c_0: { v: '' },
      r_17_c_0: { v: 'Payment Terms: Due within 30 days', fmt: { italic: true, color: '#666' } },
      r_18_c_0: { v: 'Thank you for your business! 🙏', fmt: { italic: true, color: '#7b5ef6' } },
    }
  }
];

export const TemplatesModal = ({ onClose }: { onClose: () => void }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const bulkSetCellData = useSheetStore(s => s.bulkSetCellData);

  const handleLoad = () => {
    const template = TEMPLATES.find(t => t.id === selected);
    if (!template) return;
    // Clear existing data first, then bulk load
    useSheetStore.setState({ data: {}, history: [], future: [] });
    bulkSetCellData(template.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
      <div className="bg-[#0f0f1a] border border-white/10 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Templates</h2>
              <p className="text-xs text-textMuted">Choose a template to get started instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-textMuted hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-8 grid grid-cols-2 gap-4">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`relative text-left p-6 rounded-2xl border transition-all duration-300 group overflow-hidden ${
                selected === t.id
                  ? 'border-white/30 bg-white/5 scale-[1.02]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              {/* Color glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top left, ${t.color}15, transparent 70%)` }}
              />
              {selected === t.id && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top left, ${t.color}20, transparent 70%)` }}
                />
              )}

              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${t.color}20`, color: t.color }}
                >
                  {t.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{t.name}</h3>
                <p className="text-xs text-textMuted leading-relaxed">{t.description}</p>
              </div>

              {selected === t.id && (
                <div
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: t.color }}
                >
                  <span className="text-white text-[10px] font-black">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-8 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-white/10 text-textMuted hover:text-white hover:bg-white/5 text-sm font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selected}
            className="flex-1 py-3 rounded-2xl bg-accent hover:bg-accentHover text-white text-sm font-bold transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Load Template</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
