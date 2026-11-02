import React, { useEffect, useRef, useState, useMemo } from "react";
import { Sparkles, Flame, Leaf, Wine } from "lucide-react";

/**
 * Full-Page Silky Smooth AI Interactive Culinary Background
 * - Native 60-120fps hardware-accelerated canvas with zero React re-render lag
 * - Fluid inertia-based cursor tracking with linear interpolation (LERP)
 * - Gentle particle repulsion with culinary sparks & aroma filaments across entire page
 * - Dynamic AI Culinary Moods: Sizzling Grill 🔥, Bistro Garden 🌿, Midnight Lounge 🍸
 */
export default function AiInteractiveBackground({ children, className = "" }) {
  const canvasRef = useRef(null);
  const [ambientMood, setAmbientMood] = useState("sizzle"); // 'sizzle' | 'fresh' | 'midnight'

  // Color schemes for each AI culinary mood
  const moodThemes = useMemo(() => ({
    sizzle: {
      name: "Sizzling Grill",
      icon: Flame,
      particleColor: "rgba(245, 158, 11, ", // Amber-500
      lineColor: "rgba(245, 158, 11, ",
      accentHex: "#F59E0B",
      auraCenter: "rgba(245, 158, 11, 0.16)",
      auraMid: "rgba(239, 68, 68, 0.05)",
      ambientGlow1: "rgba(245, 158, 11, 0.10)",
      ambientGlow2: "rgba(239, 68, 68, 0.06)",
      activeBg: "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30",
    },
    fresh: {
      name: "Fresh Garden Bistro",
      icon: Leaf,
      particleColor: "rgba(16, 185, 129, ", // Emerald-500
      lineColor: "rgba(16, 185, 129, ",
      accentHex: "#10B981",
      auraCenter: "rgba(16, 185, 129, 0.16)",
      auraMid: "rgba(59, 130, 246, 0.05)",
      ambientGlow1: "rgba(16, 185, 129, 0.10)",
      ambientGlow2: "rgba(59, 130, 246, 0.06)",
      activeBg: "bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/30",
    },
    midnight: {
      name: "Midnight Lounge",
      icon: Wine,
      particleColor: "rgba(168, 85, 247, ", // Purple-500
      lineColor: "rgba(168, 85, 247, ",
      accentHex: "#8B5CF6",
      auraCenter: "rgba(139, 92, 246, 0.18)",
      auraMid: "rgba(236, 72, 153, 0.05)",
      ambientGlow1: "rgba(139, 92, 246, 0.10)",
      ambientGlow2: "rgba(236, 72, 153, 0.06)",
      activeBg: "bg-purple-600 text-white font-black shadow-md shadow-purple-600/30",
    },
  }), []);

  const currentTheme = moodThemes[ambientMood];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Track mouse with smooth inertia (LERP) - no React state updates
    const mouse = {
      targetX: -1000,
      targetY: -1000,
      currentX: -1000,
      currentY: -1000,
      active: false
    };

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Particle settings for full-page distribution
    const particleCount = Math.min(Math.max(Math.floor((width * height) / 20000), 50), 75);
    const particles = [];
    const maxLineDist = 140;
    const maxMouseDist = 175;

    for (let i = 0; i < particleCount; i++) {
      const baseVx = (Math.random() - 0.5) * 0.55;
      const baseVy = (Math.random() - 0.5) * 0.55 - 0.18; // gentle upward culinary aroma drift
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        radius: Math.random() * 2.2 + 1.2,
        baseAlpha: Math.random() * 0.4 + 0.28,
        pulseSpeed: Math.random() * 0.025 + 0.015,
        pulseVal: Math.random() * Math.PI * 2,
      });
    }

    const handleWindowMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
      if (mouse.currentX < -500) {
        mouse.currentX = e.clientX;
        mouse.currentY = e.clientY;
      }
    };

    const handleWindowMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleWindowMouseLeave, { passive: true });

    // 60-120fps Smooth Animation Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth LERP mouse tracking (buttery 60/120fps inertia)
      if (mouse.active) {
        mouse.currentX += (mouse.targetX - mouse.currentX) * 0.12;
        mouse.currentY += (mouse.targetY - mouse.currentY) * 0.12;

        // Render Cursor Spotlight Aura directly to Canvas (zero DOM lag!)
        if (mouse.currentX > 0 && mouse.currentX < width && mouse.currentY > 0 && mouse.currentY < height) {
          const aura = ctx.createRadialGradient(
            mouse.currentX, mouse.currentY, 0,
            mouse.currentX, mouse.currentY, 340
          );
          aura.addColorStop(0, currentTheme.auraCenter);
          aura.addColorStop(0.45, currentTheme.auraMid);
          aura.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = aura;
          ctx.fillRect(0, 0, width, height);
        }
      }

      // Render Particles and Connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Smooth physics update
        p1.pulseVal += p1.pulseSpeed;

        // Mouse interaction: silky smooth repulsion & filament connection
        if (mouse.active) {
          const dx = p1.x - mouse.currentX;
          const dy = p1.y - mouse.currentY;
          const dist = Math.hypot(dx, dy);

          if (dist < maxMouseDist && dist > 0) {
            const force = Math.pow((maxMouseDist - dist) / maxMouseDist, 1.4);
            const angle = Math.atan2(dy, dx);
            p1.vx += Math.cos(angle) * force * 0.7;
            p1.vy += Math.sin(angle) * force * 0.7;

            // Fluid glowing filament connecting particle to cursor
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.currentX, mouse.currentY);
            const filamentAlpha = force * 0.38;
            ctx.strokeStyle = `${currentTheme.lineColor}${filamentAlpha})`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
        }

        // Apply smooth inertia friction & gentle wander drift
        p1.vx = p1.vx * 0.95 + p1.baseVx * 0.05;
        p1.vy = p1.vy * 0.95 + p1.baseVy * 0.05;

        p1.x += p1.vx;
        p1.y += p1.vy;

        // Wrap around viewport edges seamlessly
        if (p1.x < -20) p1.x = width + 20;
        if (p1.x > width + 20) p1.x = -20;
        if (p1.y < -20) p1.y = height + 20;
        if (p1.y > height + 20) p1.y = -20;

        // Neural filaments between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);

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

        // Render glowing particle mote
        const currentAlpha = p1.baseAlpha + Math.sin(p1.pulseVal) * 0.15;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${currentTheme.particleColor}${Math.max(0.12, currentAlpha)})`;
        ctx.shadowColor = currentTheme.accentHex;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseleave", handleWindowMouseLeave);
    };
  }, [ambientMood, currentTheme]);

  return (
    <div className={`relative ${className}`}>
      {/* Full-Page Fixed Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Ambient Diffuse Backlight Orbs */}
      <div
        className="pointer-events-none fixed top-16 left-1/4 w-[600px] h-[350px] rounded-full blur-[130px] transition-colors duration-1000 -z-10"
        style={{ background: currentTheme.ambientGlow1 }}
      />
      <div
        className="pointer-events-none fixed bottom-20 right-1/4 w-[550px] h-[320px] rounded-full blur-[130px] transition-colors duration-1000 -z-10"
        style={{ background: currentTheme.ambientGlow2 }}
      />

      {/* Floating AI Dining Ambiance Switcher Pill */}
      <div className="relative z-20 flex justify-center pt-3 pb-1">
        <div className="inline-flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md">
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

      {/* Children content (Full Page: Hero, Cards, Ticker, Pricing, Contact, etc.) */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
