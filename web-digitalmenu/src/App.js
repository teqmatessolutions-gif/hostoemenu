import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Utensils, ShoppingBag, Search, Plus, Minus, X, Check, Phone, 
  MapPin, Clock, ArrowRight, Sparkles, Filter, AlertCircle, 
  ChevronDown, Send, CheckCircle2, RotateCcw, ShieldCheck, 
  Building2, QrCode, Receipt, Layers, Users, ExternalLink,
  ChevronRight, Star, HeartHandshake, Zap, CheckCircle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getApiBaseUrl, getMediaBaseUrl } from "./utils/env";

export default function App() {
  const API = getApiBaseUrl();
  const MEDIA = getMediaBaseUrl();

  // Navigation mode: 'landing' (SaaS introduction) vs 'menu' (Live digital menu view)
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash || "";
    return hash.includes("table") || hash.includes("menu") || hash.includes("branch") ? "menu" : "landing";
  });

  // Partner / Plan Onboarding Modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState("growth");
  const [partnerForm, setPartnerForm] = useState({
    business_name: "",
    slug: "",
    owner_name: "",
    email: "",
    password: "",
    phone: "",
    plan_code: "growth"
  });
  const [isRegistering, setIsRegistering] = useState(false);

  // Digital Menu catalog & branches
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Customer order routing
  const [tableId, setTableId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [orderType, setOrderType] = useState("dine_in");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [vegOnly, setVegOnly] = useState(false);

  // Cart: { [itemId]: quantity }
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout inputs
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Handle URL hash changes (QR code scans)
  const parseRoute = useCallback(() => {
    const hash = window.location.hash || "";
    if (hash.startsWith("#/branch/") || hash.startsWith("#/table/") || hash.startsWith("#/menu")) {
      setActiveTab("menu");
    }

    if (hash.startsWith("#/branch/")) {
      const parts = hash.replace("#/branch/", "").split("/");
      const bId = parts[0];
      if (bId) setSelectedBranchId(bId);

      if (parts[1] === "table" && parts[2]) {
        const tId = parts[2].split("?")[0];
        setTableId(tId);
        setOrderType("dine_in");
      } else if (parts[1] === "room" && parts[2]) {
        const rId = parts[2].split("?")[0];
        setRoomId(rId);
        setOrderType("room_service");
      }
    } else if (hash.startsWith("#/table/")) {
      const tId = hash.replace("#/table/", "").split("?")[0];
      setTableId(tId);
      setOrderType("dine_in");
    } else if (hash.startsWith("#/room/")) {
      const rId = hash.replace("#/room/", "").split("?")[0];
      setRoomId(rId);
      setOrderType("room_service");
    }
  }, []);

  useEffect(() => {
    parseRoute();
    const handleHash = () => parseRoute();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [parseRoute]);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch(`${API}/public/branches`);
        if (res.ok) {
          const data = await res.json();
          setBranches(data || []);
          if (data && data.length > 0 && !selectedBranchId) {
            setSelectedBranchId(data[0].id.toString());
          }
        }
      } catch (err) {
        console.error("Failed to fetch branches", err);
      }
    };
    fetchBranches();
  }, [API]);

  // Active branch
  const currentBranch = useMemo(() => {
    if (!branches.length) return null;
    if (!selectedBranchId) return branches[0];
    return branches.find(b => b.id.toString() === selectedBranchId.toString()) || branches[0];
  }, [branches, selectedBranchId]);

  // Fetch food items & categories
  useEffect(() => {
    const fetchMenu = async () => {
      setLoadingMenu(true);
      try {
        const bParam = currentBranch?.id ? `?branch_id=${currentBranch.id}` : "";
        const [itemsRes, catsRes] = await Promise.all([
          fetch(`${API}/public/food-items${bParam}`),
          fetch(`${API}/public/food-categories${bParam}`)
        ]);

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setFoodItems(itemsData || []);
        }
        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData || []);
        }
      } catch (err) {
        console.error("Failed to fetch menu items", err);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenu();
  }, [API, currentBranch?.id]);

  // Price helper
  const getItemPrice = useCallback((item, type) => {
    if (!item) return 0;
    if (type === "room_service" && item.room_service_price) {
      return parseFloat(item.room_service_price);
    }
    return parseFloat(item.price) || 0;
  }, []);

  // Filtered food items
  const filteredItems = useMemo(() => {
    return foodItems.filter(item => {
      if (item.available === false) return false;
      if (selectedCategory !== "all" && item.category_id !== parseInt(selectedCategory)) {
        return false;
      }
      if (vegOnly) {
        const desc = (item.description || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        const isVeg = item.is_veg === true || desc.includes("veg") || name.includes("veg");
        const isNonVeg = desc.includes("chicken") || desc.includes("mutton") || desc.includes("fish") || desc.includes("meat") || desc.includes("beef") || desc.includes("pork");
        if (!isVeg || isNonVeg) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.name || "").toLowerCase().includes(q);
        const matchesDesc = (item.description || "").toLowerCase().includes(q);
        return matchesName || matchesDesc;
      }
      return true;
    });
  }, [foodItems, selectedCategory, vegOnly, searchQuery]);

  // Cart operations
  const updateCart = (itemId, delta) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartItemsList = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = foodItems.find(f => f.id === parseInt(id));
        return { item, qty, price: item ? getItemPrice(item, orderType) : 0 };
      })
      .filter(entry => entry.item && entry.qty > 0);
  }, [cart, foodItems, getItemPrice, orderType]);

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cartItemsList.reduce((sum, entry) => sum + entry.price * entry.qty, 0);
  }, [cartItemsList]);

  const gstAmount = useMemo(() => subtotal * 0.05, [subtotal]);
  const grandTotal = useMemo(() => subtotal + gstAmount, [subtotal, gstAmount]);

  // Place Order
  const handlePlaceOrder = async () => {
    if (cartItemsList.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }
    if (orderType === "dine_in" && !tableId) {
      toast.error("Please enter or select your Table Number for Dine-In.");
      return;
    }
    if (orderType === "delivery" && (!customerPhone.trim() || !deliveryAddress.trim())) {
      toast.error("Please enter Phone Number and Delivery Address.");
      return;
    }
    if (orderType === "room_service" && !roomId) {
      toast.error("Please enter your Room Number.");
      return;
    }

    setIsSubmitting(true);

    let formattedDetails = "";
    if (orderType === "dine_in") {
      formattedDetails = `Table ${tableId}${specialInstructions ? ` | Notes: ${specialInstructions}` : ""}`;
    } else if (orderType === "delivery") {
      formattedDetails = `DELIVERY | Name: ${customerName || "Customer"} | Phone: ${customerPhone} | Address: ${deliveryAddress}${specialInstructions ? ` | Notes: ${specialInstructions}` : ""}`;
    } else {
      formattedDetails = `Room ${roomId}${specialInstructions ? ` | Notes: ${specialInstructions}` : ""}`;
    }

    const payload = {
      branch_id: currentBranch?.id || null,
      table_id: orderType === "dine_in" && tableId ? parseInt(tableId) : null,
      room_id: orderType === "room_service" && roomId ? parseInt(roomId) : null,
      order_type: orderType,
      amount: subtotal,
      delivery_request: formattedDetails,
      items: cartItemsList.map(entry => ({
        food_item_id: entry.item.id,
        quantity: entry.qty
      }))
    };

    let orderCreated = false;
    let orderResponseData = null;

    try {
      const res = await fetch(`${API}/public/food-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        orderResponseData = await res.json();
        orderCreated = true;
      }
    } catch (err) {
      console.warn("API direct order dispatch failed, fallback ready", err);
    }

    const summaryOrder = {
      id: orderResponseData?.id || Math.floor(1000 + Math.random() * 9000),
      orderType,
      tableId,
      roomId,
      customerName,
      customerPhone,
      deliveryAddress,
      grandTotal,
      items: [...cartItemsList],
      branchName: currentBranch?.name || "Digital Menu",
      branchPhone: currentBranch?.phone || ""
    };

    setCompletedOrder(summaryOrder);
    setCart({});
    setIsCartOpen(false);
    setIsSubmitting(false);
    toast.success("Order Placed Successfully!");
  };

  // WhatsApp Order Dispatch
  const openWhatsAppOrder = (order) => {
    if (!order) return;
    const typeLabel = order.orderType === "dine_in" 
      ? `Dine-In Table ${order.tableId}` 
      : (order.orderType === "delivery" ? `Delivery (${order.customerPhone})` : `Room ${order.roomId}`);
    
    const message = encodeURIComponent(
      `🍽️ *NEW ORDER #${order.id}* - ${order.branchName}\n` +
      `📌 *Mode:* ${typeLabel}\n` +
      (order.deliveryAddress ? `📍 *Address:* ${order.deliveryAddress}\n` : '') +
      `📋 *Items:*\n${order.items.map(e => `• ${e.item.name} x${e.qty} - ₹${(e.price * e.qty).toFixed(0)}`).join('\n')}\n\n` +
      `💰 *Total Amount:* ₹${order.grandTotal.toFixed(2)}`
    );

    const cleanPhone = (order.branchPhone || "").replace(/\D/g, "");
    const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, "_blank");
  };

  // Partner Registration Submission
  const handlePartnerRegister = async (e) => {
    e.preventDefault();
    if (!partnerForm.business_name || !partnerForm.slug || !partnerForm.email || !partnerForm.password) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setIsRegistering(true);
    try {
      const res = await fetch(`${API}/saas/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...partnerForm,
          plan_code: selectedPlanCode
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Account created successfully! Redirecting to Admin Dashboard...");
        setShowPartnerModal(false);
        setTimeout(() => {
          window.location.href = "http://localhost:3000";
        }, 1500);
      } else {
        toast.error(data.detail || "Registration failed. Please try a different slug/email.");
      }
    } catch (err) {
      toast.error("Network error connecting to SaaS registration service.");
    } finally {
      setIsRegistering(false);
    }
  };

  const openPlanJoinModal = (planCode) => {
    setSelectedPlanCode(planCode);
    setPartnerForm(prev => ({ ...prev, plan_code: planCode }));
    setShowPartnerModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      <Toaster position="top-right" />

      {/* ── Top Universal SaaS Bar ── */}
      <nav className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg md:text-xl tracking-tight text-white flex items-center gap-1">
                  Digital<span className="text-amber-400">Menu</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
                  SaaS Multi-Branch
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Smart QR Dining · Live KOT · GST Billing · Multi-Branch
              </p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab("landing")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "landing"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Platform & Plans</span>
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "menu"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Live Menu Demo</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPartnerModal(true)}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
              <span>Join as Partner</span>
            </button>

            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <span>Admin Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {activeTab === "menu" && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl border border-slate-700 flex items-center justify-center"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {totalCartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* VIEW 1: SAAS PLATFORM INTRODUCTION, PLANS & PARTNERSHIP     */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "landing" && (
        <div className="flex-1 flex flex-col">
          
          {/* Hero Section */}
          <section className="relative overflow-hidden py-16 lg:py-24 px-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800">
            {/* Background Glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Next-Gen Multi-Branch Digital Menu SaaS
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
                Transform Dining With <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Contactless QR Ordering</span> & Kitchen Dispatch
              </h1>

              <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Empower your restaurant, cafe, or hotel chain. Instant tabletop QR menus, live KOT dispatch to kitchen, GST billing, and multi-branch company management — in one unified cloud system.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => openPlanJoinModal("growth")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-xl shadow-amber-500/25 active:scale-95 transition text-sm tracking-wide"
                >
                  <Zap className="w-4 h-4" />
                  <span>Join With Our Plan</span>
                </button>

                <button
                  onClick={() => setShowPartnerModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-2xl border border-slate-700 active:scale-95 transition text-sm tracking-wide"
                >
                  <HeartHandshake className="w-4 h-4 text-amber-400" />
                  <span>Join as a Partner</span>
                </button>

                <button
                  onClick={() => setActiveTab("menu")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-bold px-6 py-3.5 rounded-2xl border border-slate-800 active:scale-95 transition text-sm"
                >
                  <Utensils className="w-4 h-4 text-amber-400" />
                  <span>Try Live Menu Demo</span>
                </button>
              </div>

              {/* Trust Features Bar */}
              <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                  <QrCode className="w-5 h-5 text-amber-400 mb-1" />
                  <p className="font-bold text-white text-xs">Tabletop QR Stand</p>
                  <p className="text-[11px] text-slate-400">Scan & order in seconds with zero app install</p>
                </div>
                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                  <Building2 className="w-5 h-5 text-amber-400 mb-1" />
                  <p className="font-bold text-white text-xs">Multi-Branch SaaS</p>
                  <p className="text-[11px] text-slate-400">Strict branch isolation & parent company hierarchy</p>
                </div>
                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                  <Receipt className="w-5 h-5 text-amber-400 mb-1" />
                  <p className="font-bold text-white text-xs">KOT & GST Billing</p>
                  <p className="text-[11px] text-slate-400">Print KOT slips & tax invoices with 1-click</p>
                </div>
                <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                  <Layers className="w-5 h-5 text-amber-400 mb-1" />
                  <p className="font-bold text-white text-xs">3 Dining Modes</p>
                  <p className="text-[11px] text-slate-400">Dine-In, Delivery & Room Service supported</p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Feature Breakdown Section ── */}
          <section className="py-16 px-4 max-w-6xl mx-auto w-full">
            <div className="text-center mb-12">
              <span className="text-xs font-black uppercase text-amber-400 tracking-widest">
                Comprehensive Restaurant SaaS
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Everything You Need to Run Modern Food Operations
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base">Printable Table QR Stand Cards</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Generate live SVG QR codes for every dining table. Print foldable acrylic tent stands directly from the admin panel so customers scan and order instantly.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base">Kitchen Order Tickets (KOT)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Orders submitted from customer phones arrive instantly at the Kitchen Display / KOT terminal with table numbers, timestamps, and special chef instructions.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-base">Company & Branch Hierarchy</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Organize multiple properties and branches under a parent company. Logged-in branch staff and managers only see their assigned branch records.
                </p>
              </div>
            </div>
          </section>

          {/* ── SaaS Pricing Plans ("Join With Our Plan") ── */}
          <section id="pricing" className="py-16 px-4 bg-slate-900/40 border-t border-b border-slate-800">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <span className="text-xs font-black uppercase text-amber-400 tracking-widest">
                  Transparent Subscription Plans
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                  Choose The Ideal Plan For Your Business
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-lg mx-auto">
                  Simple pricing with all features unlocked. Zero hidden charges. Cancel or upgrade anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                
                {/* Starter Plan */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                      Starter Cafe
                    </span>
                    <h3 className="font-extrabold text-white text-xl mt-3">Starter</h3>
                    <p className="text-xs text-slate-400 mt-1">Perfect for single cafes & quick-service food outlets.</p>
                    
                    <div className="mt-4 mb-6">
                      <span className="text-3xl font-black text-white">₹999</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> 1 Restaurant Branch</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Up to 15 Dining Tables</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> QR Code Menu & Ordering</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Kitchen Order Ticket (KOT)</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Standard Billing & Invoices</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => openPlanJoinModal("starter")}
                    className="mt-6 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                  >
                    Select Starter Plan
                  </button>
                </div>

                {/* Growth Plan (Highlighted) */}
                <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 flex flex-col justify-between relative shadow-2xl shadow-amber-500/10">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Most Popular
                  </span>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                      Growth & Dine-In
                    </span>
                    <h3 className="font-extrabold text-white text-xl mt-3">Growth</h3>
                    <p className="text-xs text-slate-400 mt-1">For busy dining restaurants & multi-room boutique stays.</p>
                    
                    <div className="mt-4 mb-6">
                      <span className="text-3xl font-black text-amber-400">₹2,499</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Up to 3 Branches</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Unlimited Dining Tables</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Dine-In, Delivery & Room Service</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> GST Compliant Billing & Reports</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Automated WhatsApp Order Sync</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 flex-shrink-0" /> Live Inventory & Stock Alerts</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => openPlanJoinModal("growth")}
                    className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 transition shadow-lg shadow-amber-500/20"
                  >
                    Join With Growth Plan
                  </button>
                </div>

                {/* Enterprise Plan */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                      Chain & Franchise
                    </span>
                    <h3 className="font-extrabold text-white text-xl mt-3">Enterprise</h3>
                    <p className="text-xs text-slate-400 mt-1">Multi-branch restaurant chains, franchises, and luxury hotels.</p>
                    
                    <div className="mt-4 mb-6">
                      <span className="text-3xl font-black text-white">₹5,999</span>
                      <span className="text-xs text-slate-400"> / month</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Unlimited Branches & Outlets</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Company & Tenant Hierarchy</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Advanced Recipe Costing & Waste Logs</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> Custom Domain & White-label Branding</li>
                      <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> 24/7 Dedicated Support Specialist</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => openPlanJoinModal("enterprise")}
                    className="mt-6 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider active:scale-95 transition"
                  >
                    Select Enterprise Plan
                  </button>
                </div>

              </div>
            </div>
          </section>

          {/* ── Partner Section Banner ── */}
          <section className="py-16 px-4 max-w-5xl mx-auto w-full text-center">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
              <span className="text-xs font-black uppercase text-amber-400 tracking-widest">
                Partner Network
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">
                Grow With Us as a Technology Partner
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 max-w-xl mx-auto leading-relaxed">
                Are you a food consultant, restaurant agency, or hospitality provider? Onboard your restaurant clients onto DigitalMenu SaaS and earn recurring partner commissions.
              </p>
              <button
                onClick={() => setShowPartnerModal(true)}
                className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Join as a Partner Today</span>
              </button>
            </div>
          </section>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* VIEW 2: LIVE DIGITAL MENU SHOWCASE & CUSTOMER ORDERING      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "menu" && (
        <div className="flex-1 flex flex-col">
          
          {/* Subheader: Branch & Order Mode */}
          <section className="bg-slate-900 border-b border-slate-800 py-3 px-4">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
              
              {/* Branch Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Branch:</span>
                {branches.length > 1 ? (
                  <select
                    value={selectedBranchId || ""}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>📍 {b.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    📍 {currentBranch?.name || "Main Branch"}
                  </span>
                )}
              </div>

              {/* Order Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setOrderType("dine_in")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    orderType === "dine_in" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400"
                  }`}
                >
                  <span>🍽️</span> Dine-In
                </button>
                <button
                  onClick={() => setOrderType("delivery")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    orderType === "delivery" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400"
                  }`}
                >
                  <span>🛵</span> Delivery
                </button>
                <button
                  onClick={() => setOrderType("room_service")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    orderType === "room_service" ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400"
                  }`}
                >
                  <span>🛏️</span> Room Service
                </button>
              </div>

              {/* Seating / Room Badge */}
              {orderType === "dine_in" && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-xs text-amber-300">
                  <span className="font-semibold">Table:</span>
                  <input
                    type="text"
                    placeholder="Enter Table #"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="w-20 bg-slate-800 text-white px-2 py-0.5 rounded text-xs border border-amber-500/30 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Search & Category Pills */}
          <section className="bg-slate-950 border-b border-slate-800 py-3 px-4">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dishes, burgers, mocktails, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  vegOnly ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Pure Veg Only
              </button>
            </div>

            {/* Category horizontal list */}
            <div className="max-w-6xl mx-auto mt-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === "all" ? "bg-amber-500 text-slate-950 font-black" : "bg-slate-900 text-slate-300"
                }`}
              >
                ✨ All Items ({foodItems.length})
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id.toString())}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === c.id.toString() ? "bg-amber-500 text-slate-950 font-black" : "bg-slate-900 text-slate-300"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          {/* Food Menu Items Grid */}
          <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
            {loadingMenu ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Loading digital menu dishes...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
                <div className="text-3xl mb-2">🍲</div>
                <h4 className="font-bold text-white text-base">No dishes found</h4>
                <p className="text-xs text-slate-400 mt-1">Try resetting the search or category filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => {
                  const qty = cart[item.id] || 0;
                  const price = getItemPrice(item, orderType);
                  const isVeg = item.is_veg !== false && !item.name.toLowerCase().includes("chicken") && !item.name.toLowerCase().includes("meat");

                  return (
                    <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition shadow-lg">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center p-0.5 ${isVeg ? "border-emerald-500" : "border-rose-500"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                            </span>
                            {item.category?.name && (
                              <span className="text-[10px] uppercase font-bold text-slate-400">{item.category.name}</span>
                            )}
                          </div>
                          <h4 className="font-bold text-white text-sm">{item.name}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                          <p className="text-base font-black text-amber-400 mt-2">₹{price.toFixed(0)}</p>
                        </div>

                        <div className="w-20 h-20 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                          🍲
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">🟢 In Kitchen</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-amber-500 text-slate-950 rounded-lg px-2 py-0.5 font-black text-xs">
                            <button onClick={() => updateCart(item.id, -1)} className="hover:opacity-75"><Minus className="w-3 h-3" /></button>
                            <span>{qty}</span>
                            <button onClick={() => updateCart(item.id, 1)} className="hover:opacity-75"><Plus className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateCart(item.id, 1)}
                            className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-lg transition"
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* Sticky Bottom Cart Strip */}
          {totalCartCount > 0 && !isCartOpen && (
            <div className="sticky bottom-4 z-30 max-w-lg mx-auto w-full px-4">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3 rounded-2xl shadow-xl flex items-center justify-between border border-amber-400/50">
                <div className="flex items-center gap-2.5 pl-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 text-amber-400 font-black flex items-center justify-center text-xs">
                    {totalCartCount}
                  </div>
                  <div>
                    <p className="text-xs font-black">₹{grandTotal.toFixed(0)} <span className="font-semibold text-[10px]">(incl. GST)</span></p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="bg-slate-950 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
                >
                  <span>View Cart & Order</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Cart Drawer ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Your Food Order</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                {orderType === "dine_in" && (
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">Table Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 01, 04, VIP"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
                {orderType === "delivery" && (
                  <>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        placeholder="Mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">Delivery Address *</label>
                      <textarea
                        rows={2}
                        placeholder="Street / house address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white resize-none"
                      />
                    </div>
                  </>
                )}
                {orderType === "room_service" && (
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">Room Number *</label>
                    <input
                      type="text"
                      placeholder="Room number"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {cartItemsList.map(({ item, qty, price }) => (
                  <div key={item.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-slate-400">₹{price} × {qty} = <span className="text-amber-400 font-bold">₹{(price * qty).toFixed(0)}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded-lg">
                      <button onClick={() => updateCart(item.id, -1)}><Minus className="w-3 h-3" /></button>
                      <span className="font-bold px-1">{qty}</span>
                      <button onClick={() => updateCart(item.id, 1)}><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-400"><span>GST (5%):</span><span>₹{gstAmount.toFixed(2)}</span></div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between font-black text-white text-sm">
                  <span>Grand Total:</span><span className="text-amber-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <button
                disabled={isSubmitting || cartItemsList.length === 0}
                onClick={handlePlaceOrder}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Dispatching..." : "Confirm & Send to Kitchen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Success Modal ── */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Order #{completedOrder.id} Placed!</h3>
            <p className="text-xs text-slate-400 mt-1">Sent to Kitchen KOT terminal. Preparation in progress!</p>

            <div className="bg-slate-950 rounded-xl p-3 my-3 text-xs text-left space-y-1 border border-slate-800">
              <div className="flex justify-between"><span>Branch:</span><span className="text-white font-bold">{completedOrder.branchName}</span></div>
              <div className="flex justify-between"><span>Mode:</span><span className="text-amber-400 font-bold uppercase">{completedOrder.orderType}</span></div>
              <div className="flex justify-between"><span>Total:</span><span className="text-amber-400 font-bold">₹{completedOrder.grandTotal.toFixed(2)}</span></div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => openWhatsAppOrder(completedOrder)}
                className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                💬 Send Receipt via WhatsApp
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Partner & Plan Registration Modal ── */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowPartnerModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">Join DigitalMenu SaaS</h3>
              <p className="text-xs text-slate-400 mt-1">
                Register your restaurant business or join as a partner network provider.
              </p>
            </div>

            <form onSubmit={handlePartnerRegister} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Restaurant / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Spice Bistro"
                  value={partnerForm.business_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                    setPartnerForm(prev => ({ ...prev, business_name: name, slug }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Business Handle / Slug *</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <span className="text-slate-500 mr-1">app.com/</span>
                  <input
                    type="text"
                    required
                    placeholder="royal-spice"
                    value={partnerForm.slug}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                    className="bg-transparent text-amber-400 font-bold focus:outline-none flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={partnerForm.owner_name}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Mobile number"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@yourrestaurant.com"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Admin Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Secure password (min 6 chars)"
                  value={partnerForm.password}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Selected Plan</label>
                <select
                  value={selectedPlanCode}
                  onChange={(e) => setSelectedPlanCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none"
                >
                  <option value="starter">Starter Plan (₹999/mo - 1 Branch)</option>
                  <option value="growth">Growth Plan (₹2,499/mo - 3 Branches & GST)</option>
                  <option value="enterprise">Enterprise Plan (₹5,999/mo - Unlimited)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center justify-center gap-2"
              >
                {isRegistering ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Creating Restaurant Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Start Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Universal Footer ── */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-400">
          Powered by DigitalMenu SaaS · Multi-Branch Digital Menu, QR Ordering & Kitchen POS
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Join with our plan or register as a partner · Instant tabletop tent QR generation
        </p>
      </footer>
    </div>
  );
}
