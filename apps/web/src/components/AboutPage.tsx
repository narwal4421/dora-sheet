import { useEffect, useRef } from 'react';
import { X, Mail, MessageCircle, Sparkles, Cpu, Database, Globe, Zap, Shield, Code } from 'lucide-react';
import gsap from 'gsap';
import { Howl } from 'howler';

interface VantaEffect {
  destroy: () => void;
}

export const AboutPage = ({ onClose }: { onClose: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vantaRef = useRef<VantaEffect | null>(null);

  // Sounds
  const sounds = useRef({
    reveal: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.2 }),
    hover: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.1 })
  });

  useEffect(() => {
    // 1. SHATTER / ENTRANCE LOGIC
    const tl = gsap.timeline();
    
    // 2. ROBUST LIBS LOADING
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
          amplitudeFactor: 2.00,
          scale: 1.00,
          scaleMobile: 1.00
        });
      }
    };

    initVanta();

    // 3. CINEMATIC SEQUENCING
    sounds.current.reveal.play();
    
    // Initial Flash
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    
    // Card materialization
    tl.fromTo(cardRef.current, 
      { 
        scale: 0.8, 
        opacity: 0, 
        rotateX: 45,
        y: 100,
        filter: 'blur(30px)' 
      }, 
      { 
        scale: 1, 
        opacity: 1, 
        rotateX: 0,
        y: 0,
        filter: 'blur(0px)', 
        duration: 1.5, 
        ease: "expo.out" 
      }
    );

    // Staggered text reveal
    tl.from(".vision-text", {
      y: 20,
      opacity: 0,
      duration: 1,
      ease: "power3.out"
    }, "-=0.8");

    tl.from(".feature-badge", {
      scale: 0,
      opacity: 0,
      stagger: 0.05,
      duration: 0.6,
      ease: "back.out(2)"
    }, "-=1");

    return () => {
      if (vantaRef.current) vantaRef.current.destroy();
    };
  }, []);

  const handleEmailClick = () => {
    window.location.href = "mailto:doranarwal27@gmail.com";
  };

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/919997780055", "_blank");
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#080808] flex items-center justify-center overflow-hidden font-inter selection:bg-accent/30 selection:text-white"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[110]" />
      
      {/* Cinematic Close Button */}
      <button 
        onClick={onClose}
        className="fixed top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-300 z-[150] group"
      >
        <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      <div 
        ref={cardRef}
        className="relative w-full max-w-5xl mx-4 aspect-[16/9] bg-white/[0.01] backdrop-blur-[100px] border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden group perspective-1000"
      >
        {/* Inner Glass Glow */}
        <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
        <div className="absolute inset-0 rounded-[40px] border border-white/10 pointer-events-none shadow-[inset_0_0_60px_rgba(255,255,255,0.02)]" />

        {/* Left: Identity Section */}
        <div className="flex-1 p-10 md:p-16 flex flex-col justify-center items-center md:items-start space-y-8 relative border-b md:border-b-0 md:border-r border-white/5 z-10">
          <div className="relative group/avatar">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-8 border-white/[0.03] shadow-2xl relative z-10 transition-transform duration-700 group-hover/avatar:scale-105">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pranjal" 
                alt="Pranjal Narwal" 
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <div className="absolute inset-[-12px] rounded-full animate-spin-slow opacity-40 blur-sm" 
                 style={{ background: 'conic-gradient(from 0deg, transparent, #7B5EF6, #00E5A0, transparent)' }} />
          </div>

          <div className="text-center md:text-left space-y-3">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-accent/80 to-white/60 animate-liquid-chrome leading-tight">
              Pranjal Narwal
            </h1>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <span className="h-px w-8 bg-accent" />
              <p className="text-accent font-bold tracking-[0.4em] uppercase text-xs md:text-sm">
                Next-Gen Architect
              </p>
            </div>
          </div>

          <p className="text-textMuted text-sm md:text-lg leading-relaxed max-w-sm text-center md:text-left font-light">
            Merging high-performance utility with advanced neural intelligence to redefine the digital canvas.
          </p>

          <div className="flex flex-wrap gap-2.5 justify-center md:justify-start pt-4">
            {[
              { icon: Zap, label: 'Fast' },
              { icon: Shield, label: 'Secure' },
              { icon: Cpu, label: 'AI' },
              { icon: Code, label: 'Web' }
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="feature-badge flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white/80 hover:bg-accent/20 hover:text-white transition-all cursor-default uppercase tracking-widest">
                <Icon size={14} className="text-accent" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Vision & Contact */}
        <div className="flex-1 p-10 md:p-16 bg-white/[0.01] flex flex-col justify-between relative z-10">
          <div className="space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-accent/80">
                <Sparkles size={24} className="animate-pulse" />
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">The Vision</h2>
              </div>
              <p className="vision-text text-2xl md:text-4xl font-medium text-white/90 leading-tight tracking-tight italic font-syne">
                "To bridge the gap between human intent and data intelligence."
              </p>
              <div className="h-1 w-24 bg-accent rounded-full shadow-[0_0_15px_rgba(123,94,246,0.5)]" />
            </div>

            <div className="grid grid-cols-1 gap-5 pt-4">
              <button 
                onMouseEnter={() => sounds.current.hover.play()}
                onClick={handleEmailClick}
                className="group/btn relative overflow-hidden flex items-center gap-5 p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-accent/40 transition-all duration-500 hover:-translate-y-1 shadow-lg"
              >
                <div className="absolute inset-0 bg-accent/5 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent relative z-10 group-hover/btn:scale-110 transition-transform duration-500 shadow-inner">
                  <Mail size={28} className="group-hover/btn:rotate-12 transition-transform" />
                </div>
                <div className="flex flex-col items-start relative z-10">
                  <span className="text-[10px] text-accent font-bold uppercase tracking-[0.3em] mb-1">Direct Line</span>
                  <span className="text-base md:text-lg text-white font-semibold">doranarwal27@gmail.com</span>
                </div>
              </button>

              <button 
                onMouseEnter={() => sounds.current.hover.play()}
                onClick={handleWhatsAppClick}
                className="group/btn relative overflow-hidden flex items-center gap-5 p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-[#25D366]/40 transition-all duration-500 hover:-translate-y-1 shadow-lg"
              >
                <div className="absolute inset-0 bg-[#25D366]/5 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] relative z-10 group-hover/btn:scale-110 transition-transform duration-500 shadow-inner">
                  <MessageCircle size={28} className="group-hover/btn:animate-pulse" />
                </div>
                <div className="flex flex-col items-start relative z-10">
                  <span className="text-[10px] text-[#25D366] font-bold uppercase tracking-[0.3em] mb-1">WhatsApp</span>
                  <span className="text-base md:text-lg text-white font-semibold">+91 99977-80055</span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-10 flex items-center justify-between text-[11px] text-white/20 font-bold uppercase tracking-[0.4em]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span>Dora AI Node</span>
            </div>
            <div className="flex gap-6">
              <Globe size={16} className="hover:text-accent transition-colors cursor-pointer" />
              <Database size={16} />
            </div>
            <span>v1.0.0 Stable</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;700;900&display=swap');
        
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }

        .animate-liquid-chrome {
          background-size: 200% auto;
          animation: chrome 5s linear infinite;
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
        
        .perspective-1000 { perspective: 1000px; }
      `}} />
    </div>
  );
};
