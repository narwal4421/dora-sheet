import { useToastStore } from '../store/useToastStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400 flex-shrink-0" />,
  error: <AlertCircle size={16} className="text-red-400 flex-shrink-0" />,
  warning: <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />,
  info: <Info size={16} className="text-blue-400 flex-shrink-0" />,
};

const COLORS = {
  success: 'border-green-500/30 bg-green-500/10',
  error:   'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info:    'border-blue-500/30 bg-blue-500/10',
};

export const ToastContainer = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl text-sm text-white font-medium min-w-[260px] max-w-[420px] animate-in slide-in-from-top-4 duration-300 ${COLORS[t.type]}`}
        >
          {ICONS[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-white/40 hover:text-white transition-colors ml-2"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
