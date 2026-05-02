import { useEffect, useRef } from 'react';
import { X, Mail, MessageCircle, Sparkles, Cpu, Database, Globe, Zap, Code } from 'lucide-react';
import gsap from 'gsap';
import { Howl } from 'howler';

interface VantaEffect {
  destroy: () => void;
}

export const AboutPage = ({ onClose }: { onClose: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<VantaEffect | null>(null);

  // Sounds (Luxury Tones)
  const sounds = useRef({
    reveal: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.15 }),
    hover: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.05 })
  });

  useEffect(() => {
    const tl = gsap.timeline();
    
    const loadScript = (src: string) => {
      return new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const initVanta = async () => {
      const win = window as unknown as { THREE: unknown; VANTA: { AURORA: (config: Record<string, unknown>) => VantaEffect } };
      if (!win.THREE) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js");
      }
      await loadScript("https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.aurora.min.js");
      
      if (containerRef.current && win.VANTA) {
        vantaRef.current = win.VANTA.AURORA({
          el: containerRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          highlightColor: 0x7b5ef6,
          midtoneColor: 0x00e5a0,
          lowlightColor: 0x080808,
          baseColor: 0x080808,
          amplitudeFactor: 1.5,
          scale: 1.0,
          scaleMobile: 1.0
        });
      }
    };

    initVanta();

    // Cinematic Reveal Sequence
    sounds.current.reveal.play();
    tl.to(containerRef.current, { opacity: 1, duration: 1 });
    tl.fromTo(cardRef.current, 
      { scale: 0.95, opacity: 0, y: 40, filter: 'blur(20px)' }, 
      { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.8, ease: "expo.out" },
      "-=0.5"
    );

    tl.from(".stagger-in", {
      y: 20,
      opacity: 0,
      stagger: 0.1,
      duration: 1,
      ease: "power3.out"
    }, "-=1");

    return () => {
      if (vantaRef.current) vantaRef.current.destroy();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#080808] opacity-0 flex items-center justify-center overflow-hidden font-inter"
    >
      {/* Soft Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-10" />
      
      {/* Drifting Light Leaks */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[150px] animate-drift-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] animate-drift-slow-reverse pointer-events-none" />

      <button 
        onClick={onClose}
        className="fixed top-10 right-10 w-14 h-14 rounded-full border border-white/5 bg-white/[0.03] backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all duration-700 z-[150] group"
      >
        <X size={20} className="group-hover:rotate-90 transition-transform duration-700" />
      </button>

      <div 
        ref={cardRef}
        className="relative w-full max-w-6xl mx-6 my-8 bg-white/[0.01] backdrop-blur-[120px] border border-white/[0.08] rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden z-20 max-h-[90vh] scrollbar-none"
      >
        {/* Physical Glass Reflection Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-transparent to-white/[0.05] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

        {/* Left: Identity Section */}
        <div className="flex-1 md:flex-[1.2] p-8 md:p-16 flex flex-col justify-center items-center md:items-start space-y-8 md:space-y-12 relative border-b md:border-b-0 md:border-r border-white/5">
          <div className="relative group">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-10 transition-transform duration-1000 group-hover:scale-[1.02] rotate-[-2deg] group-hover:rotate-0">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pranjal&backgroundColor=080808" 
                alt="Pranjal Narwal" 
                className="w-full h-full object-cover scale-110 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/60 to-transparent" />
            </div>
            {/* Floating Halo */}
            <div className="absolute inset-[-20px] border border-accent/20 rounded-[40px] animate-pulse-slow pointer-events-none" />
          </div>

          <div className="text-center md:text-left space-y-4 stagger-in">
            <h1 className="text-6xl md:text-8xl font-black tracking-[-0.04em] text-white leading-[0.9] font-syne">
              Pranjal <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-white to-accent animate-liquid-chrome">Narwal</span>
            </h1>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <span className="h-[2px] w-12 bg-accent/40" />
              <p className="text-textMuted font-bold tracking-[0.5em] uppercase text-[10px] md:text-xs">
                Visionary Developer
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full stagger-in">
            {[
              { icon: Zap, label: 'Performance' },
              { icon: Sparkles, label: 'Aesthetics' },
              { icon: Cpu, label: 'Intelligence' },
              { icon: Code, label: 'Craftmanship' }
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-white/20 transition-all duration-500 group">
                <Icon size={16} className="text-accent group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Vision Section */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-between bg-white/[0.01]">
          <div className="space-y-12">
            <div className="space-y-8 stagger-in">
              <div className="flex items-center gap-3 text-accent/60">
                <Globe size={20} className="animate-spin-slow" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em]">The Core Vision</h2>
              </div>
              <p className="text-3xl md:text-5xl font-medium text-white/95 leading-[1.1] tracking-tight font-syne italic">
                "We don't build tools. <br />
                We build <span className="text-accent">Intelligence</span>."
              </p>
              <p className="text-sm md:text-lg text-textMuted leading-relaxed font-light max-w-md">
                Dora AI is the culmination of a obsession with data clarity. It is designed to be the bridge between human intuition and machine-scale logic.
              </p>
            </div>

            <div className="flex flex-col gap-4 stagger-in">
              <button 
                onMouseEnter={() => sounds.current.hover.play()}
                onClick={() => window.location.href = "mailto:doranarwal27@gmail.com"}
                className="group/btn relative h-20 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-accent/40 transition-all duration-700 overflow-hidden flex items-center px-8"
              >
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700" />
                <Mail size={24} className="text-accent mr-6 group-hover/btn:scale-110 transition-transform" />
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-textMuted font-black uppercase tracking-[0.3em] mb-1">Email Inquiry</span>
                  <span className="text-base text-white font-medium">doranarwal27@gmail.com</span>
                </div>
                <div className="ml-auto opacity-0 group-hover/btn:opacity-100 translate-x-4 group-hover/btn:translate-x-0 transition-all duration-700">
                  <Sparkles size={16} className="text-accent" />
                </div>
              </button>

              <button 
                onMouseEnter={() => sounds.current.hover.play()}
                onClick={() => window.open("https://wa.me/919997780055", "_blank")}
                className="group/btn relative h-20 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-[#25D366]/40 transition-all duration-700 overflow-hidden flex items-center px-8"
              >
                <div className="absolute inset-0 bg-[#25D366]/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700" />
                <MessageCircle size={24} className="text-[#25D366] mr-6 group-hover/btn:scale-110 transition-transform" />
                <div className="flex flex-col items-start">
                  <span className="text-[9px] text-textMuted font-black uppercase tracking-[0.3em] mb-1">WhatsApp Hub</span>
                  <span className="text-base text-white font-medium">+91 99977-80055</span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-12 flex items-center justify-between text-[9px] text-white/20 font-black uppercase tracking-[0.5em] stagger-in">
            <div className="flex items-center gap-3">
              <Database size={14} />
              <span>System.Live</span>
            </div>
            <span>© 2026 Dora AI Collective</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;700;900&display=swap');
        
        .animate-drift-slow { animation: drift 20s ease-in-out infinite; }
        .animate-drift-slow-reverse { animation: drift-reverse 25s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 4s ease-in-out infinite; }
        .animate-spin-slow { animation: spin 15s linear infinite; }
        .animate-liquid-chrome { background-size: 200% auto; animation: chrome 6s linear infinite; }

        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(10%, 10%) scale(1.1); }
        }
        @keyframes drift-reverse {
          0%, 100% { transform: translate(0, 0) scale(1.1); }
          50% { transform: translate(-10%, -10%) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes chrome {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .font-syne { font-family: 'Syne', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
      `}} />
    </div>
  );
};
