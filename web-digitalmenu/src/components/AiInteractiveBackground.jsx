import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Flame, Leaf, Wine } from "lucide-react";

/**
 * AI Interactive Culinary Background
 * Features:
 * - Dynamic HTML5 Canvas with neural culinary particle mesh (sparks, aroma motes, neural connections)
 * - Real-time cursor interaction (gentle repulsion, mouse spotlight aura, connecting neural filaments)
 * - Interactive AI Restaurant Ambiance Mood Switcher (Sizzling Grill 🔥, Bistro Garden 🌿, Midnight Lounge 🍸)
 */
export default function AiInteractiveBackground({ children, className = "" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [ambientMood, setAmbientMood] = useState("sizzle"); // 'sizzle' | 'fresh' | 'midnight'
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);

  // Color schemes for each AI culinary mood
  const moodThemes = {
    sizzle: {
      name: "Sizzling Grill",
      icon: Flame,
      primaryColor: "rgba(245, 158, 11, 0.14)", // Amber-500
      secondaryColor: "rgba(239, 68, 68, 0.08)", // Red-500
      particleColor: "rgba(245, 158, 11, ",
      lineColor: "rgba(245, 158, 11, ",
      accentHex: "#F59E0B",
      activeBg: "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30",
    },
    fresh: {
      name: "Fresh Garden Bistro",
      icon: Leaf,
      primaryColor: "rgba(16, 185, 129, 0.14)", // Emerald-500
      secondaryColor: "rgba(59, 130, 246, 0.08)", // Blue-500
      particleColor: "rgba(16, 185, 129, ",
      lineColor: "rgba(16, 185, 129, ",
      accentHex: "#10B981",
      activeBg: "bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/30",
    },
    midnight: {
      name: "Midnight Lounge",
      icon: Wine,
      primaryColor: "rgba(139, 92, 246, 0.16)", // Purple-500
      secondaryColor: "rgba(236, 72, 153, 0.08)", // Pink-500
      particleColor: "rgba(168, 85, 247, ",
      lineColor: "rgba(168, 85, 247, ",
      accentHex: "#8B5CF6",
      activeBg: "bg-purple-600 text-white font-black shadow-md shadow-purple-600/30",
    },
  };

  const currentTheme = moodThemes[ambientMood];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle settings
    const particleCount = Math.min(Math.floor((width * height) / 18000), 45);
    const particles = [];
    const maxLineDist = 120;
    const maxMouseDist = 140;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7 - 0.2, // slight upward float like aroma
        radius: Math.random() * 2.5 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.25,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseVal: Math.random() * Math.PI,
      });
    }

    const mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
      setMousePos({ x: mouse.x, y: mouse.y });
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
      container.addEventListener("mouseenter", handleMouseEnter);
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render Neural Connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Update position
        p1.x += p1.vx;
        p1.y += p1.vy;
        p1.pulseVal += p1.pulseSpeed;

        // Wrap around bounds
        if (p1.x < -10) p1.x = width + 10;
        if (p1.x > width + 10) p1.x = -10;
        if (p1.y < -10) p1.y = height + 10;
        if (p1.y > height + 10) p1.y = -10;

        // Mouse gentle repulsion / interaction
        if (mouse.active) {
          const dx = p1.x - mouse.x;
          const dy = p1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxMouseDist && dist > 0) {
            const force = (maxMouseDist - dist) / maxMouseDist;
            p1.x += (dx / dist) * force * 2.5;
            p1.y += (dy / dist) * force * 2.5;

            // Draw line to cursor with glowing gradient
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            const lineAlpha = (1 - dist / maxMouseDist) * 0.4;
            ctx.strokeStyle = `${currentTheme.lineColor}${lineAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        // Connect particles within proximity
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxLineDist) {
            const alpha = (1 - dist / maxLineDist) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${currentTheme.lineColor}${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw particle node
        const currentAlpha = p1.baseAlpha + Math.sin(p1.pulseVal) * 0.15;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${currentTheme.particleColor}${Math.max(0.1, currentAlpha)})`;
        ctx.shadowColor = currentTheme.accentHex;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("mouseenter", handleMouseEnter);
      }
    };
  }, [ambientMood, currentTheme]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* HTML5 Canvas Neural Mesh */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Dynamic Cursor Spotlight Aura */}
      {isHovered && mousePos.x > 0 && (
        <div
          className="pointer-events-none absolute w-[600px] h-[600px] rounded-full blur-3xl transition-opacity duration-300 z-0"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${currentTheme.primaryColor} 0%, ${currentTheme.secondaryColor} 45%, transparent 70%)`,
          }}
        />
      )}

      {/* Ambient Radial Diffuse Backlight Orbs */}
      <div
        className="pointer-events-none absolute top-12 left-1/4 w-[500px] h-[300px] rounded-full blur-[100px] transition-colors duration-1000 -z-10"
        style={{ background: currentTheme.primaryColor }}
      />
      <div
        className="pointer-events-none absolute bottom-10 right-1/4 w-[450px] h-[280px] rounded-full blur-[100px] transition-colors duration-1000 -z-10"
        style={{ background: currentTheme.secondaryColor }}
      />

      {/* Floating AI Dining Ambiance Switcher Pill */}
      <div className="relative z-20 flex justify-center mb-4">
        <div className="inline-flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md">
          <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>AI Ambiance</span>
          </div>

          <button
            onClick={() => setAmbientMood("sizzle")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              ambientMood === "sizzle"
                ? moodThemes.sizzle.activeBg
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Sizzling Grill</span>
          </button>

          <button
            onClick={() => setAmbientMood("fresh")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              ambientMood === "fresh"
                ? moodThemes.fresh.activeBg
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>Bistro Garden</span>
          </button>

          <button
            onClick={() => setAmbientMood("midnight")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              ambientMood === "midnight"
                ? moodThemes.midnight.activeBg
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Midnight Lounge</span>
          </button>
        </div>
      </div>

      {/* Children content (Hero, Cards, Ticker, etc.) */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
