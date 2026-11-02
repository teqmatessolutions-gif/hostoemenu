import React, { useEffect, useRef } from "react";

/**
 * Full-Page Silky Smooth Bistro Garden Interactive Culinary Background
 * - Native 60-120fps hardware-accelerated canvas with zero React re-render lag
 * - Fluid inertia-based cursor tracking with linear interpolation (LERP)
 * - Gentle particle repulsion with Bistro Garden aroma motes & filaments across entire page
 * - Fixed elegant Bistro Garden aesthetic (emerald & mint fresh culinary botanical aura)
 */
export default function AiInteractiveBackground({ children, className = "" }) {
  const canvasRef = useRef(null);

  // Bistro Garden fixed theme
  const theme = {
    name: "Fresh Garden Bistro",
    particleColor: "rgba(16, 185, 129, ", // Emerald-500
    lineColor: "rgba(16, 185, 129, ",
    accentHex: "#10B981",
    auraCenter: "rgba(16, 185, 129, 0.16)",
    auraMid: "rgba(59, 130, 246, 0.05)",
    ambientGlow1: "rgba(16, 185, 129, 0.10)",
    ambientGlow2: "rgba(59, 130, 246, 0.06)",
  };

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
          aura.addColorStop(0, theme.auraCenter);
          aura.addColorStop(0.45, theme.auraMid);
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
            ctx.strokeStyle = `${theme.lineColor}${filamentAlpha})`;
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
            ctx.strokeStyle = `${theme.lineColor}${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Render glowing particle mote
        const currentAlpha = p1.baseAlpha + Math.sin(p1.pulseVal) * 0.15;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${theme.particleColor}${Math.max(0.12, currentAlpha)})`;
        ctx.shadowColor = theme.accentHex;
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
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Full-Page Fixed Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Ambient Diffuse Backlight Orbs */}
      <div
        className="pointer-events-none fixed top-16 left-1/4 w-[600px] h-[350px] rounded-full blur-[130px] -z-10"
        style={{ background: theme.ambientGlow1 }}
      />
      <div
        className="pointer-events-none fixed bottom-20 right-1/4 w-[550px] h-[320px] rounded-full blur-[130px] -z-10"
        style={{ background: theme.ambientGlow2 }}
      />

      {/* Children content (Full Page: Hero, Cards, Ticker, Pricing, Contact, etc.) */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
