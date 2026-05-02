import { X, Mail, MessageCircle, Github, Info, Zap, Shield, Sparkles } from 'lucide-react';

export const AboutPage = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-surface border border-white/10 shadow-2xl rounded-2xl overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-accent/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-accent/20 blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-8 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accentHover flex items-center justify-center text-white shadow-lg shadow-accent/20">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dora AI</h1>
              <p className="text-xs text-textMuted uppercase tracking-widest font-semibold">The Future of Spreadsheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surfaceHover text-textMuted hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          
          {/* Why We Built This */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Info size={18} />
              <h2 className="font-bold text-lg text-white">Why We Built This?</h2>
            </div>
            <p className="text-textMuted leading-relaxed">
              Traditional spreadsheets are powerful but often complex and manual. 
              <strong> Dora AI</strong> was built to bridge the gap between data and intelligence. 
              Our mission is to empower users to analyze, automate, and visualize data using natural language, 
              turning complex calculations into simple conversations.
            </p>
          </section>

          {/* Features Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4">
              <div className="text-accent shrink-0"><Zap size={20} /></div>
              <div>
                <h3 className="text-white font-semibold text-sm">Smart Formulas</h3>
                <p className="text-xs text-textMuted mt-1">Generate complex Excel/Google Sheet formulas just by asking.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4">
              <div className="text-accent shrink-0"><Shield size={20} /></div>
              <div>
                <h3 className="text-white font-semibold text-sm">Real-time Collaboration</h3>
                <p className="text-xs text-textMuted mt-1">Multiplayer editing with instant synchronization across users.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4">
              <div className="text-accent shrink-0"><Github size={20} /></div>
              <div>
                <h3 className="text-white font-semibold text-sm">Document Analysis</h3>
                <p className="text-xs text-textMuted mt-1">Upload PDFs, CSVs, or images and let Dora AI extract the data.</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-4">
              <div className="text-accent shrink-0"><Sparkles size={20} /></div>
              <div>
                <h3 className="text-white font-semibold text-sm">Vision Intelligence</h3>
                <p className="text-xs text-textMuted mt-1">Smart context-aware AI that understands your grid layout.</p>
              </div>
            </div>
          </section>

          {/* Developer Section */}
          <section className="pt-4 border-t border-white/5 flex flex-col items-center text-center gap-4">
            <div>
              <p className="text-xs text-textMuted uppercase tracking-widest mb-1">Developed By</p>
              <h3 className="text-xl font-bold text-white bg-gradient-to-r from-accent to-white bg-clip-text text-transparent">Pranjal Narwal</h3>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="mailto:doranarwal27@gmail.com" className="flex items-center gap-2 text-textMuted hover:text-accent transition-colors text-sm">
                <Mail size={18} />
                <span>doranarwal27@gmail.com</span>
              </a>
              <a href="https://wa.me/919997780055" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-textMuted hover:text-[#25D366] transition-colors text-sm">
                <MessageCircle size={18} />
                <span>+91 99977-80055</span>
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-black/20 text-center">
          <p className="text-[10px] text-textMuted uppercase tracking-widest">© 2026 Dora AI • Version 1.0.0 Stable</p>
        </div>
      </div>
    </div>
  );
};
