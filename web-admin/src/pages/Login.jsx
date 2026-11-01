import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import hostoLogo from "../assets/hosto-emenu-logo.png";
import { jwtDecode } from "jwt-decode";
import { Mail, Lock, ArrowRight, Loader2, Sparkles, Building2, ShieldCheck, Clock, AlertCircle, TrendingUp, Zap, Radio, Globe } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data && response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);

        try {
          const settingsRes = await api.get("settings/");
          const tzSetting = settingsRes.data.find(s => s.key === "timezone");
          if (tzSetting && tzSetting.value) {
            localStorage.setItem("SYSTEM_TIMEZONE", tzSetting.value);
          }
        } catch (settingsError) {
          console.error("Failed to sync system timezone on login:", settingsError);
        }

        try {
          const decoded = jwtDecode(response.data.access_token);
          const permissions = decoded.permissions || [];
          const role = decoded.role ? decoded.role.toLowerCase() : 'guest';
          const isSuperadmin = decoded.is_superadmin || false;
          const userBranchId = decoded.branch_id;

          localStorage.setItem("user", JSON.stringify({
            role,
            is_superadmin: isSuperadmin,
            permissions
          }));
          localStorage.setItem("permissions", JSON.stringify(permissions));

          if (isSuperadmin) {
            localStorage.setItem("activeBranchId", "all");
            navigate("/superadmin-dashboard", { replace: true });
          } else if (userBranchId) {
            localStorage.setItem("activeBranchId", userBranchId);
            
            if (role === 'admin' || permissions.some(p => p === '/dashboard' || p === 'dashboard:view' || p === 'dashboard')) {
              navigate("/dashboard", { replace: true });
            } else if (permissions.length > 0) {
              const firstPerm = permissions[0];
              const redirectPath = firstPerm.startsWith('/') 
                ? firstPerm 
                : `/${firstPerm.split(':')[0].replace('_', '-')}`;
              navigate(redirectPath, { replace: true });
            } else {
              navigate("/dashboard", { replace: true });
            }
          }
        } catch (error) {
          console.error("Token decode error:", error);
          navigate("/dashboard", { replace: true });
        }
      } else {
        setErrorMessage("Login failed: No authorization token received from server.");
      }
    } catch (err) {
      console.error("Login error:", err);
      const detail = err.response?.data?.detail || err.message || "Login failed. Please check your credentials.";
      const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isPendingApprovalError = errorMessage && (
    errorMessage.toLowerCase().includes("pending approval") || 
    errorMessage.toLowerCase().includes("pending activation") ||
    errorMessage.toLowerCase().includes("super admin accepts")
  );

  return (
    <div className="min-h-screen w-full flex bg-[#0f172a] font-sans overflow-hidden">
      
      {/* LEFT PANEL - Form Area */}
      <div className="w-full lg:w-[45%] xl:w-[35%] flex flex-col justify-between bg-white relative z-10 shadow-2xl">
        
        {/* Subtle top decoration */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500"></div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 md:px-16 lg:px-20 py-12">
          
          {/* Logo Section with floating & ambient breathing glow */}
          <div className="mb-10 text-center flex flex-col items-center">
            <div className="relative group mb-6 animate-logo-float">
              {/* Dynamic breathing multi-color aura */}
              <div className="absolute -inset-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 rounded-[2.2rem] blur-xl opacity-25 group-hover:opacity-50 transition duration-1000 animate-pulse-glow"></div>
              {/* Enhanced Logo Container */}
              <div className="relative bg-white rounded-3xl p-3 shadow-2xl transform transition-transform duration-500 group-hover:scale-105 border border-indigo-50 ring-4 ring-indigo-50/60 overflow-hidden">
                <img
                  src={hostoLogo}
                  alt="Hosto Hospitality Logo"
                  className="h-24 w-auto object-contain transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
            
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              Enter your credentials to access the portal
            </p>
          </div>

          {/* Error / Pending Approval Notification Banner */}
          {errorMessage && (
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 mb-6 transition-all ${
              isPendingApprovalError
                ? "bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}>
              {isPendingApprovalError ? (
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <p className="font-bold text-sm leading-tight">
                  {isPendingApprovalError ? "Property Pending Approval" : "Authentication Failed"}
                </p>
                <p className="leading-relaxed font-medium">{errorMessage}</p>
                {isPendingApprovalError && (
                  <div className="pt-2 mt-2 border-t border-amber-200/70 flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-amber-900">
                      ⚡ Pay at Teqmates &amp; share screenshot for instant activation within minutes!
                    </span>
                    <a
                      href="https://api.whatsapp.com/send?phone=919876543210&text=Hi%20Teqmates%2C%20I%20have%20registered%20my%20property%20and%20need%20it%20activated."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
                    >
                      Share Screenshot on WhatsApp (+91 98765 43210) &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 block ml-1">Email / Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-none"
                  placeholder="name@hosto.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-gray-700 block">Password</label>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Forgot password?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center ml-1">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer transition-colors"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative overflow-hidden w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl shadow-xl shadow-gray-900/25 transform transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {/* Animated shimmer light sheen */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"></div>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">Sign In to Dashboard</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                </>
              )}
            </button>
          </form>

          {/* SaaS Self-Service Registration Callout */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              New property or resort chain?{" "}
              <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                Register Your Property &rarr;
              </Link>
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>© {new Date().getFullYear()} Hosto Group</span>
          <div className="flex items-center gap-1.5 font-medium text-gray-500">
            <ShieldCheck size={14} className="text-indigo-500" />
            Secure Login
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Brand Image & Animated Showcase Area */}
      <div className="hidden lg:flex flex-1 relative bg-slate-950 overflow-hidden">
        {/* Animated Business Growth Image 1 */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-slideshow-1 scale-102"
          style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/growth-bg1.png')` }}
        />
        {/* Animated Business Growth Image 2 */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-slideshow-2 scale-102"
          style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/growth-bg2.png')` }}
        />
        
        {/* Animated Drifting Aurora Glow Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-indigo-600/35 to-purple-600/35 blur-[120px] animate-orb-drift-1"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] rounded-full bg-gradient-to-tl from-amber-500/25 via-teal-500/20 to-blue-600/30 blur-[150px] animate-orb-drift-2"></div>
          <div className="absolute top-[40%] right-[30%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[100px] animate-pulse-slow"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

        {/* Ambient Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950/20"></div>

        {/* ── 1. Floating Metric Badge: Live OTA Channel Sync (Top Right) ── */}
        <div className="absolute top-8 right-10 z-20 animate-float-slow hidden xl:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-white/15 shadow-2xl shadow-indigo-950/60 hover:border-emerald-400/40 transition-all duration-300 group cursor-default">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
            <Zap size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Live Channel Sync</span>
            </div>
            <div className="text-xs font-bold text-slate-200">Aiosell • 4 Channels Active</div>
          </div>
        </div>

        {/* ── 2. Floating Metric Badge: Today's Occupancy & Yield (Center Right) ── */}
        <div className="absolute top-[32%] right-8 z-20 animate-float-delayed hidden xl:flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl shadow-purple-950/60 hover:border-indigo-400/40 transition-all duration-300 group cursor-default">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Today's Occupancy</div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black text-white">94.8%</span>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md border border-emerald-500/30">+18% Yield</span>
            </div>
          </div>
        </div>

        {/* ── 3. Floating Toast Badge: Just Booked Notification (Top Left) ── */}
        <div className="absolute top-[16%] left-10 z-20 animate-float-alt hidden 2xl:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl shadow-amber-950/40 hover:border-amber-400/40 transition-all duration-300 group cursor-default">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Just Booked
            </div>
            <div className="text-xs font-bold text-white">Heritage Villa 201 • ₹12,500</div>
          </div>
        </div>

        {/* Content over image */}
        <div className="relative z-10 flex flex-col justify-end p-12 xl:p-16 w-full h-full text-white">
          <div className="max-w-xl">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold mb-6 hover:bg-white/15 transition-colors shadow-lg cursor-default">
              <Sparkles size={15} className="text-amber-400 animate-spin-slow" />
              <span className="text-slate-100 uppercase tracking-wider text-[11px]">Business Growth &amp; Analytics</span>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-black leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-tight drop-shadow-sm">
              Unlock Your <br /> Property's Potential
            </h2>
            
            <p className="text-base xl:text-lg text-slate-300 leading-relaxed font-light border-l-2 border-indigo-400 pl-4 drop-shadow-sm">
              Actionable insights, dynamic reporting, and robust tools to drive revenue, streamline operations, and accelerate business growth.
            </p>

            {/* Feature Pills Grid */}
            <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/10 flex-wrap">
              <div className="flex items-center gap-3 group cursor-default p-2 rounded-2xl hover:bg-white/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 group-hover:border-indigo-400 transition-all">
                  <Building2 size={24} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Multi-Property</p>
                  <p className="text-xs text-slate-400">Centralized control</p>
                </div>
              </div>

              <div className="w-px h-10 bg-white/15 hidden sm:block"></div>

              <div className="flex items-center gap-3 group cursor-default p-2 rounded-2xl hover:bg-white/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg group-hover:scale-110 group-hover:border-indigo-400 transition-all">
                  <ShieldCheck size={24} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Enterprise Grade</p>
                  <p className="text-xs text-slate-400">Secure &amp; Reliable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Developer Credit */}
        <div className="absolute bottom-6 right-8 z-20">
          <a 
            href="https://teqmates.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-400/80 hover:text-white text-[11px] font-medium transition-all duration-300 group bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10"
          >
            <span>Powered by</span>
            <span className="text-indigo-400 group-hover:text-indigo-300 font-bold tracking-wider">Teqmates.com</span>
          </a>
        </div>
      </div>

      {/* Embedded CSS Animations */}
      <style>
        {`
          @keyframes kenburns {
            0% { transform: scale(1.02) translate(0, 0); }
            50% { transform: scale(1.07) translate(-1%, -1%); }
            100% { transform: scale(1.02) translate(0, 0); }
          }
          @keyframes fade1 {
            0%, 45% { opacity: 0.9; }
            50%, 95% { opacity: 0; }
            100% { opacity: 0.9; }
          }
          @keyframes fade2 {
            0%, 45% { opacity: 0; }
            50%, 95% { opacity: 0.9; }
            100% { opacity: 0; }
          }
          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes floatDelayed {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes floatAlt {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-7px); }
          }
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.25; transform: scale(0.98); }
            50% { opacity: 0.45; transform: scale(1.03); }
          }
          @keyframes orbDrift1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(35px, 25px) scale(1.08); }
          }
          @keyframes orbDrift2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-30px, -20px) scale(1.12); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes spinSlow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-slideshow-1 {
            animation: kenburns 35s ease-in-out infinite, fade1 35s ease-in-out infinite;
          }
          .animate-slideshow-2 {
            animation: kenburns 35s ease-in-out infinite, fade2 35s ease-in-out infinite;
          }
          .animate-float-slow {
            animation: floatSlow 5s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: floatDelayed 6s ease-in-out 1.2s infinite;
          }
          .animate-float-alt {
            animation: floatAlt 5.5s ease-in-out 0.6s infinite;
          }
          .animate-logo-float {
            animation: logoFloat 4.5s ease-in-out infinite;
          }
          .animate-pulse-glow {
            animation: pulseGlow 4s ease-in-out infinite;
          }
          .animate-orb-drift-1 {
            animation: orbDrift1 14s ease-in-out infinite;
          }
          .animate-orb-drift-2 {
            animation: orbDrift2 16s ease-in-out infinite;
          }
          .animate-pulse-slow {
            animation: pulseGlow 8s ease-in-out infinite;
          }
          .animate-shimmer {
            animation: shimmer 1.5s ease-in-out infinite;
          }
          .animate-spin-slow {
            animation: spinSlow 12s linear infinite;
          }
        `}
      </style>
    </div>
  );
}
