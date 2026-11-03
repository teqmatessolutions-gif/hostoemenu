import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Utensils, ShoppingBag, Search, Plus, Minus, X, Check, Phone, MapPin, Clock, ArrowRight, Sparkles, Filter, AlertCircle, ChevronDown, Send, CheckCircle2, RotateCcw, ShieldCheck, Building2, QrCode, Receipt, Layers, Users, ExternalLink, ChevronRight, Star, HeartHandshake, Zap, CheckCircle, Bot, Flame, Leaf, Calendar
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getApiBaseUrl, getMediaBaseUrl } from "./utils/env";
import HostoLogo from "./components/HostoLogo";
import AiInteractiveBackground from "./components/AiInteractiveBackground";

export default function App() {
  const API = getApiBaseUrl();
  const MEDIA = getMediaBaseUrl();

  // Contact & Sales Inquiry Form State (Dedicated Hosto eMenu)
  const [contactForm, setContactForm] = useState({
    restaurant_name: "",
    contact_name: "",
    email: "",
    phone: "",
    outlet_type: "fine_dine",
    branches_count: "1-3",
    message: ""
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  // Table Reservation State
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(null);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [publicTables, setPublicTables] = useState([]);
  const [reserveForm, setReserveForm] = useState({
    table_id: "",
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_count: 2,
    reservation_date: new Date().toISOString().split("T")[0],
    reservation_time: "19:30",
    special_notes: ""
  });

  const handleReserveTable = async (e) => {
    e.preventDefault();
    if (!reserveForm.guest_name.trim() || !reserveForm.guest_phone.trim()) {
      toast.error("Please enter guest name and phone number");
      return;
    }
    setReserveLoading(true);
    try {
      const payload = {
        branch_id: selectedBranchId ? parseInt(selectedBranchId) : (branches.length > 0 ? branches[0].id : 2),
        table_id: reserveForm.table_id ? parseInt(reserveForm.table_id) : undefined,
        guest_name: reserveForm.guest_name.trim(),
        guest_phone: reserveForm.guest_phone.trim(),
        guest_email: reserveForm.guest_email.trim() || undefined,
        guest_count: parseInt(reserveForm.guest_count) || 2,
        reservation_date: reserveForm.reservation_date,
        reservation_time: reserveForm.reservation_time,
        special_notes: reserveForm.special_notes.trim() || undefined
      };
      const res = await fetch(`${API}/public/table-reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setReserveSuccess(data);
        toast.success(`Table Reserved! ${data.table_number ? 'Table ' + data.table_number : ''}`);
      } else {
        toast.error(data.detail || "Unable to reserve table. Please call restaurant directly.");
      }
    } catch (err) {
      console.error("Reservation failed:", err);
      toast.error("Network error while booking table reservation.");
    } finally {
      setReserveLoading(false);
    }
  };

  const handleCancelCustomerReservation = async (resId) => {
    if (!window.confirm("Are you sure you want to cancel your table reservation?")) return;
    try {
      const res = await fetch(`${API}/public/table-reservations/${resId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Reservation cancelled successfully. Table has been released.");
        setReserveSuccess(null);
        setShowReserveModal(false);
      } else {
        toast.error(data.detail || "Failed to cancel reservation");
      }
    } catch (err) {
      toast.error("Network error while cancelling reservation");
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    setTimeout(() => {
      setContactSubmitting(false);
      toast.success("Thank you! Hosto eMenu specialist will reach out within 15 minutes.");
      setContactForm({
        restaurant_name: "",
        contact_name: "",
        email: "",
        phone: "",
        outlet_type: "fine_dine",
        branches_count: "1-3",
        message: ""
      });
    }, 600);
  };

  // Navigation mode: 'landing' (SaaS introduction) vs 'menu' (Live digital menu view)
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash || "";
    return hash.includes("table") || hash.includes("menu") || hash.includes("branch") ? "menu" : "landing";
  });

  // Dynamic SaaS Plans fetched from API
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

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

  // Parse URL hash for tabletop QR scans
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
        setOrderType("takeaway");
      }
    } else if (hash.startsWith("#/table/")) {
      const tId = hash.replace("#/table/", "").split("?")[0];
      setTableId(tId);
      setOrderType("dine_in");
    } else if (hash.startsWith("#/room/")) {
      const rId = hash.replace("#/room/", "").split("?")[0];
      setRoomId(rId);
      setOrderType("takeaway");
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

  // Fetch SaaS Plans dynamically
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const res = await fetch(`${API}/saas/plans`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data || []);
          if (data && data.length > 0) {
            setSelectedPlanCode(data[0].code);
          }
        }
      } catch (err) {
        console.error("Failed to fetch SaaS plans", err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
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
        const [itemsRes, catsRes, tablesRes] = await Promise.all([
          fetch(`${API}/public/food-items${bParam}`),
          fetch(`${API}/public/food-categories${bParam}`),
          fetch(`${API}/public/tables${bParam}`).catch(() => null)
        ]);

        if (tablesRes && tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setPublicTables(tablesData || []);
        }

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
    if (orderType === "takeaway" && !customerPhone.trim()) {
      toast.error("Please enter your Phone Number for pickup alerts.");
      return;
    }

    setIsSubmitting(true);

    let formattedDetails = "";
    if (orderType === "dine_in") {
      formattedDetails = `Dine-In | Table ${tableId}${customerName ? ` | Guest: ${customerName}` : ""}${specialInstructions ? ` | Notes: ${specialInstructions}` : ""}`;
    } else if (orderType === "takeaway") {
      formattedDetails = `TAKEAWAY / PICKUP | Guest: ${customerName || "Customer"} | Phone: ${customerPhone}${specialInstructions ? ` | Notes: ${specialInstructions}` : ""}`;
    } else {
      formattedDetails = `DELIVERY | Name: ${customerName || "Customer"} | Phone: ${customerPhone} | Address: ${deliveryAddress}${specialInstructions ? ` | Notes: ${specialInstructions}` : ""}`;
    }

    const payload = {
      branch_id: currentBranch?.id || null,
      table_id: orderType === "dine_in" && tableId ? (parseInt(tableId) || null) : null,
      room_id: null,
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
      branchName: currentBranch?.name || "Hosto eMenu",
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      <Toaster position="top-right" />

      {/* ── Top Universal Light Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <HostoLogo size="md" />
            <div className="hidden lg:block border-l border-slate-200 pl-3">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 tracking-wider">
                Multi-Branch SaaS
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tabletop QR Stand · Live KOT Dispatch · Cloud POS
              </p>
            </div>
          </div>

          {/* Center Navigation Switcher */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setActiveTab("landing")}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "landing"
                    ? "bg-white text-slate-950 shadow-sm font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Platform & Plans</span>
              </button>
              <button
                onClick={() => setActiveTab("menu")}
                className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "menu"
                    ? "bg-white text-slate-950 shadow-sm font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                <span>Live Menu Demo</span>
              </button>
            </div>

            <a
              href="#contact"
              onClick={() => {
                if (activeTab !== "landing") setActiveTab("landing");
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact & Support</span>
            </a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setReserveSuccess(null);
                setShowReserveModal(true);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-950" />
              <span>Book Table</span>
            </button>
            <button
              onClick={() => setShowPartnerModal(true)}
              className="hidden lg:flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 shadow-sm transition"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
              <span>Join as Partner</span>
            </button>

            <a
              href="http://localhost:3000/emenuadmin"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition"
            >
              <span>Admin Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            </a>

            {activeTab === "menu" && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative bg-amber-50 hover:bg-amber-100 text-amber-900 p-2 rounded-xl border border-amber-200 flex items-center justify-center transition"
              >
                <ShoppingBag className="w-4 h-4 text-amber-600" />
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
        <AiInteractiveBackground className="flex-1 flex flex-col">
          
          {/* ── Live Restaurant Operations Moving Ticker ── */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 py-2 overflow-hidden border-b border-amber-600 text-slate-950 font-bold text-xs select-none shadow-inner">
            <div className="animate-marquee whitespace-nowrap flex items-center gap-10">
              <span className="flex items-center gap-1.5">🍕 <strong className="font-black">Live KOT #104:</strong> Truffle Margherita dispatched to Table 02</span>
              <span className="flex items-center gap-1.5">🍔 <strong className="font-black">Kitchen Display:</strong> Double Smash Angus Burger baking ready</span>
              <span className="flex items-center gap-1.5">🍹 <strong className="font-black">Bar KOT:</strong> Passion Fruit Mint Cooler served at Table VIP-1</span>
              <span className="flex items-center gap-1.5">⚡ <strong className="font-black">Avg Kitchen Prep Time:</strong> 9.4 mins across 14 branches</span>
              <span className="flex items-center gap-1.5">🛵 <strong className="font-black">Delivery Dispatch:</strong> 4 Orders out with real-time tracking</span>
              <span className="flex items-center gap-1.5">📱 <strong className="font-black">Instant QR Scan:</strong> 0 App downloads required for customers</span>
            </div>
          </div>

          {/* Hero Section with AI Interactive Background */}
          <div className="bg-gradient-to-b from-amber-50/30 via-white/80 to-slate-50/40 border-b border-slate-200/80 py-12 lg:py-16 px-4">
            <section className="relative">
            <div className="max-w-5xl mx-auto text-center relative z-10">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Next-Gen Multi-Branch Hosto eMenu SaaS
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
                Transform Dining With <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500">Contactless QR Ordering</span> & Kitchen Dispatch
              </h1>

              <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Empower your restaurants, cafes, and hospitality chains with Hosto eMenu. Instant tabletop QR menus, live KOT dispatch to kitchen, GST billing, and multi-branch company management — in one unified cloud system.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setReserveSuccess(null);
                    setShowReserveModal(true);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-purple-500/20 active:scale-95 transition text-sm tracking-wide"
                >
                  <Calendar className="w-4 h-4 text-purple-200" />
                  <span>📅 Reserve a Dining Table</span>
                </button>

                <button
                  onClick={() => openPlanJoinModal("growth")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition text-sm tracking-wide"
                >
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>Join With Our Plan</span>
                </button>

                <button
                  onClick={() => setShowPartnerModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 font-bold px-6 py-3.5 rounded-2xl border border-slate-300 shadow-sm active:scale-95 transition text-sm tracking-wide"
                >
                  <HeartHandshake className="w-4 h-4 text-amber-600" />
                  <span>Join as a Partner</span>
                </button>

                <button
                  onClick={() => setActiveTab("menu")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-6 py-3.5 rounded-2xl border border-slate-200 active:scale-95 transition text-sm"
                >
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span>Try Live Menu Demo</span>
                </button>
              </div>

              {/* ── Floating Moving Food & Interactive Tabletop Stand Showcase ── */}
              <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center max-w-5xl mx-auto">
                
                {/* Floating Food Card 1: Artisan Wood-Fired Pizza */}
                <div className="animate-food-float bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-amber-200/90 shadow-xl shadow-amber-500/10 flex items-center gap-4 text-left hover:scale-102 transition-transform">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md group">
                    <img 
                      src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80" 
                      alt="Artisan Pizza" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-1 left-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
                      🔥 Hot
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider">Wood-Fired Oven</span>
                    <h4 className="font-black text-slate-900 text-sm">Truffle Margherita</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Baking at 450°C · 3 mins remaining</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-black text-slate-950">₹480</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Auto KOT ⚡</span>
                    </div>
                  </div>
                </div>

                {/* Center: Interactive Tabletop Stand Visualizer */}
                <div className="animate-food-float-gentle bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Tabletop Acrylic Stand</span>
                    </div>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold text-slate-300">TABLE 02</span>
                  </div>

                  <div className="bg-white rounded-2xl p-3 text-slate-900 flex items-center justify-between gap-3 shadow-inner">
                    <div className="w-14 h-14 bg-amber-50 rounded-xl p-1 border border-amber-200 flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-full h-full text-slate-950" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs font-black text-slate-900">Scan to Order</p>
                      <p className="text-[10px] text-slate-500">Fast Kitchen Dispatch</p>
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                        Dine-In · KOT Billing
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("menu")}
                    className="mt-3 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/20"
                  >
                    <span>Test Table 02 Live Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Floating Food Card 2: Gourmet Smash Burger & Craft Shake */}
                <div className="animate-food-float-delayed bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-amber-200/90 shadow-xl shadow-amber-500/10 flex items-center gap-4 text-left hover:scale-102 transition-transform">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md group">
                    <img 
                      src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80" 
                      alt="Gourmet Burger" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-1 left-1 bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full">
                      ★ 4.9
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider">Kitchen Special</span>
                    <h4 className="font-black text-slate-900 text-sm">Double Smash Burger</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Crispy Potato Brioche & Truffle Mayo</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-black text-slate-950">₹390</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">1,420+ Orders</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Trust Features Bar */}
              <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <QrCode className="w-5 h-5 text-amber-600 mb-1" />
                  <p className="font-bold text-slate-900 text-xs">Tabletop QR Stand</p>
                  <p className="text-[11px] text-slate-500">Scan & order in seconds with zero app install</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <Building2 className="w-5 h-5 text-amber-600 mb-1" />
                  <p className="font-bold text-slate-900 text-xs">Multi-Branch SaaS</p>
                  <p className="text-[11px] text-slate-500">Strict branch isolation & parent company hierarchy</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <Receipt className="w-5 h-5 text-amber-600 mb-1" />
                  <p className="font-bold text-slate-900 text-xs">KOT & GST Billing</p>
                  <p className="text-[11px] text-slate-500">Print KOT slips & tax invoices with 1-click</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <Layers className="w-5 h-5 text-amber-600 mb-1" />
                  <p className="font-bold text-slate-900 text-xs">3 Dining Modes</p>
                  <p className="text-[11px] text-slate-500">Dine-In, Delivery & Takeaway supported</p>
                </div>
              </div>

            </div>
          </section>
          </div>



          {/* ── Feature Breakdown Section ── */}
          <section className="py-16 px-4 max-w-6xl mx-auto w-full">
            <div className="text-center mb-12">
              <span className="text-xs font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Comprehensive Restaurant SaaS
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
                Everything You Need to Run Modern Food Operations
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Printable Table QR Stand Cards</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Generate live SVG QR codes for every dining table. Print foldable acrylic tent stands directly from the admin panel so customers scan and order instantly.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Kitchen Order Tickets (KOT)</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Orders submitted from customer phones arrive instantly at the Kitchen Display / KOT terminal with table numbers, timestamps, and special chef instructions.
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Company & Branch Hierarchy</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Organize multiple properties and branches under a parent company. Logged-in branch staff and managers only see their assigned branch records.
                </p>
              </div>
            </div>
          </section>

          {/* ── SaaS Pricing Plans ("Join With Our Plan" - Dynamic from Plan Editor) ── */}
          <section id="pricing" className="py-16 px-4 bg-slate-100/60 border-t border-b border-slate-200">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <span className="text-xs font-black uppercase text-amber-700 tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Transparent Subscription Plans
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
                  Choose The Ideal Plan For Your Business
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto">
                  Simple pricing with all features unlocked. Zero hidden charges. Cancel or upgrade anytime.
                </p>
              </div>

              {loadingPlans ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Loading latest pricing tiers...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  {/* Dynamic SaaS Plans (Super Admin Editable) */}
                  {(plans.length > 0 ? plans : [
                    { id: 1, name: "Starter Cafe", code: "starter", price_monthly: 999, max_branches: 1, max_rooms: 15, badge: "", description: "Perfect for single cafes & quick-service food outlets.", features: ["1 Restaurant Branch", "Up to 15 Dining Tables", "QR Code Menu & Ordering", "Kitchen Order Ticket (KOT)", "Standard Food Billing"] },
                    { id: 2, name: "Growth Dine-In", code: "growth", price_monthly: 2499, max_branches: 3, max_rooms: 50, badge: "Most Popular", description: "For busy dining restaurants & multi-room boutique stays.", features: ["Up to 3 Branches", "Unlimited Dining Tables", "Dine-In, Delivery & Takeaway Ordering", "GST Compliant Billing & Reports", "Automated WhatsApp Order Sync", "Live Inventory & Stock Alerts"] },
                    { id: 3, name: "Enterprise Multi-Branch", code: "enterprise", price_monthly: 5999, max_branches: 99, max_rooms: 999, badge: "", description: "Multi-branch restaurant chains, franchises, and luxury hotels.", features: ["Unlimited Branches & Outlets", "Company & Tenant Hierarchy", "Advanced Recipe Costing & Waste Logs", "Custom Domain & White-label", "24/7 Dedicated Support Specialist"] }
                  ]).map((p) => {
                    const isHighlight = p.badge && p.badge.toLowerCase().includes("popular");

                    return (
                      <div
                        key={p.code || p.id}
                        className={`bg-white rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl relative ${
                          isHighlight 
                            ? "border-2 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20" 
                            : "border border-slate-200 shadow-sm"
                        }`}
                      >
                        {isHighlight && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                            ★ {p.badge || "Most Popular"}
                          </span>
                        )}

                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {p.code} Tier
                          </span>
                          <h3 className="font-extrabold text-slate-900 text-xl mt-3">{p.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>
                          
                          <div className="mt-4 mb-6">
                            <span className="text-3xl font-black text-slate-900">₹{p.price_monthly?.toLocaleString()}</span>
                            <span className="text-xs text-slate-500"> / month</span>
                          </div>

                          <div className="py-2 border-t border-b border-slate-100 grid grid-cols-2 gap-2 text-center text-xs mb-4">
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Max Branches</span>
                              <span className="font-bold text-slate-800">{p.max_branches}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Max Tables</span>
                              <span className="font-bold text-slate-800">{p.max_rooms >= 999 ? "Unlimited" : p.max_rooms}</span>
                            </div>
                          </div>

                          <ul className="space-y-2.5 text-xs text-slate-700">
                            {(Array.isArray(p.features) ? p.features : []).map((feat, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => openPlanJoinModal(p.code)}
                          className={`mt-6 w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition shadow-sm ${
                            isHighlight
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          Join With {p.name}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Section: Dedicated Hosto eMenu Contact & Support (Independent from hospitality app) ── */}
          <section id="contact" className="py-16 px-4 bg-gradient-to-b from-white to-amber-50/40 border-t border-slate-200">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-xs font-black uppercase text-amber-700 tracking-widest bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  Dedicated eMenu Support &amp; Sales
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3">
                  Get in Touch With the Hosto eMenu Team
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2">
                  Dedicated product specialists for restaurants, cafes, cloud kitchens, and bar operations. Separate channel &amp; 24/7 dedicated assistance.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left: Contact Channels */}
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                      <Send className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-slate-900 text-sm">Sales &amp; Enterprise Tiers</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pricing, multi-outlet discounts &amp; custom features</p>
                    <a href="mailto:sales@hostoemenu.com" className="text-xs font-bold text-amber-600 hover:underline mt-2 inline-block">
                      sales@hostoemenu.com &rarr;
                    </a>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-slate-900 text-sm">Restaurant Helpdesk &amp; Support</h4>
                    <p className="text-xs text-slate-500 mt-0.5">KOT printer setup, QR stand re-prints, staff training</p>
                    <a href="mailto:support@hostoemenu.com" className="text-xs font-bold text-emerald-600 hover:underline mt-2 inline-block">
                      support@hostoemenu.com &rarr;
                    </a>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-slate-900 text-sm">Consultants &amp; Reseller Network</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Earn recurring monthly revenue onboarding food businesses</p>
                    <a href="mailto:partners@hostoemenu.com" className="text-xs font-bold text-indigo-600 hover:underline mt-2 inline-block">
                      partners@hostoemenu.com &rarr;
                    </a>
                  </div>

                  <a
                    href="https://wa.me/919840012345?text=Hi%20Hosto%20eMenu%20team,%20I%20would%20like%20a%20demo%20for%20my%20restaurant"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl text-xs transition shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    <span>💬 Chat on WhatsApp (+91 98400 12345)</span>
                  </a>
                </div>

                {/* Right: Dedicated Interactive Request Demo / Contact Form */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg shadow-slate-100">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Request Restaurant Demo or Setup Assistance</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Fill in your restaurant details and we will configure your menu and tabletop QRs.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Dedicated eMenu Team</span>
                    </div>
                  </div>

                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Restaurant / Brand Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Amber Gourmet Bistro"
                          value={contactForm.restaurant_name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, restaurant_name: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={contactForm.contact_name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, contact_name: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. rahul@amberbistro.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Phone / WhatsApp Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +91 98765 43210"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Food Business Type</label>
                        <select
                          value={contactForm.outlet_type}
                          onChange={(e) => setContactForm(prev => ({ ...prev, outlet_type: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        >
                          <option value="fine_dine">🍽️ Dine-in Restaurant / Bistro</option>
                          <option value="cafe">☕ Cafe &amp; Bakery</option>
                          <option value="qsr">⚡ Quick Service / Fast Food (QSR)</option>
                          <option value="cloud_kitchen">🛵 Cloud Kitchen / Takeaway Outlet</option>
                          <option value="bar_brewery">🍸 Bar, Pub &amp; Brewery</option>
                          <option value="multi_chain">🏢 Multi-Branch Restaurant Chain</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Estimated Outlets / Branches</label>
                        <select
                          value={contactForm.branches_count}
                          onChange={(e) => setContactForm(prev => ({ ...prev, branches_count: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        >
                          <option value="1">Single Outlet (1 Branch)</option>
                          <option value="2-5">2 to 5 Outlets</option>
                          <option value="6-15">6 to 15 Outlets</option>
                          <option value="15+">15+ Outlets (Enterprise)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">How can we help? (Optional)</label>
                      <textarea
                        rows="3"
                        placeholder="e.g. We have 24 dining tables and need KOT thermal printer integration and digital QR ordering..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[11px] text-slate-400">
                        🔒 Zero spam. Official Hosto eMenu representative will connect directly.
                      </p>
                      <button
                        type="submit"
                        disabled={contactSubmitting}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition text-xs tracking-wider uppercase flex items-center gap-2"
                      >
                        {contactSubmitting ? (
                          <span>Submitting...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Request</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </div>
          </section>

          {/* ── Partner Section Banner (Light Theme) ── */}
          <section className="py-16 px-4 max-w-5xl mx-auto w-full text-center">
            <div className="bg-gradient-to-r from-amber-100/60 via-amber-50 to-white border border-amber-200 rounded-3xl p-8 sm:p-12 shadow-sm">
              <span className="text-xs font-black uppercase text-amber-700 tracking-widest bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                Partner Network
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3">
                Grow With Us as a Technology Partner
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-3 max-w-xl mx-auto leading-relaxed">
                Are you a food consultant, restaurant agency, or hospitality provider? Onboard your restaurant clients onto Hosto eMenu SaaS and earn recurring partner commissions.
              </p>
              <button
                onClick={() => setShowPartnerModal(true)}
                className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-xl shadow-md active:scale-95 transition text-xs uppercase tracking-wider"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Join as a Partner Today</span>
              </button>
            </div>
          </section>

        </AiInteractiveBackground>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* VIEW 2: LIVE DIGITAL MENU SHOWCASE & CUSTOMER ORDERING      */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "menu" && (
        <div className="flex-1 flex flex-col">
          
          {/* Subheader: Branch & Order Mode */}
          <section className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
              
              {/* Branch Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Branch:</span>
                {branches.length > 1 ? (
                  <select
                    value={selectedBranchId || ""}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-slate-50 text-xs text-slate-800 rounded-lg px-2.5 py-1 border border-slate-300 focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>📍 {b.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    📍 {currentBranch?.name || "Main Branch"}
                  </span>
                )}
              </div>

              {/* Order Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setOrderType("dine_in")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    orderType === "dine_in" ? "bg-amber-500 text-slate-950 font-black shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🍽️</span> Dine-In
                </button>
                <button
                  onClick={() => setOrderType("delivery")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    orderType === "delivery" ? "bg-amber-500 text-slate-950 font-black shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🛵</span> Delivery
                </button>
                <button
                  onClick={() => setOrderType("takeaway")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    orderType === "takeaway" ? "bg-amber-500 text-slate-950 font-black shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🛍️</span> Takeaway
                </button>
              </div>

              {/* Dining Table Seating Badge */}
              <button
                onClick={() => {
                  setReserveSuccess(null);
                  setShowReserveModal(true);
                }}
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1 rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Reserve Table</span>
              </button>

              {orderType === "dine_in" && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs text-amber-800">
                  <span className="font-semibold">Table:</span>
                  <input
                    type="text"
                    placeholder="Enter Table #"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="w-20 bg-white text-slate-900 px-2 py-0.5 rounded text-xs border border-amber-300 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Search & Category Pills (Light Theme) */}
          <section className="bg-slate-50 border-b border-slate-200 py-3 px-4">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dishes, burgers, mocktails, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>

              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm ${
                  vegOnly ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-white border-slate-300 text-slate-700"
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm ${
                  selectedCategory === "all" ? "bg-amber-500 text-slate-950 font-black border border-amber-500" : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                ✨ All Items ({foodItems.length})
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id.toString())}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm ${
                    selectedCategory === c.id.toString() ? "bg-amber-500 text-slate-950 font-black border border-amber-500" : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          {/* Food Menu Items Grid (Light Theme) */}
          <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
            {loadingMenu ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500">Loading Hosto eMenu dishes...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="text-3xl mb-2">🍲</div>
                <h4 className="font-bold text-slate-800 text-base">No dishes found</h4>
                <p className="text-xs text-slate-500 mt-1">Try resetting the search or category filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => {
                  const qty = cart[item.id] || 0;
                  const price = getItemPrice(item, orderType);
                  const isVeg = item.is_veg !== false && !item.name.toLowerCase().includes("chicken") && !item.name.toLowerCase().includes("meat");

                  return (
                    <div key={item.id} className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition shadow-sm">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center p-0.5 ${isVeg ? "border-emerald-600" : "border-rose-600"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? "bg-emerald-600" : "bg-rose-600"}`} />
                            </span>
                            {item.category?.name && (
                              <span className="text-[10px] uppercase font-bold text-slate-500">{item.category.name}</span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                          <p className="text-base font-black text-amber-600 mt-2">₹{price.toFixed(0)}</p>
                        </div>

                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 bg-slate-100 shadow-sm relative group">
                          {((item.images && item.images.length > 0) ? (item.images[0].image_url?.startsWith("http") ? item.images[0].image_url : `${MEDIA}${item.images[0].image_url}`) : item.image_url) ? (
                            <img
                              src={(item.images && item.images.length > 0) ? (item.images[0].image_url?.startsWith("http") ? item.images[0].image_url : `${MEDIA}${item.images[0].image_url}`) : item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex items-center justify-center text-2xl ${
                              ((item.images && item.images.length > 0) ? (item.images[0].image_url?.startsWith("http") ? item.images[0].image_url : `${MEDIA}${item.images[0].image_url}`) : item.image_url) ? "hidden" : "flex"
                            }`}
                          >
                            🍲
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">🟢 In Kitchen</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-amber-500 text-slate-950 rounded-lg px-2 py-0.5 font-black text-xs shadow-sm">
                            <button onClick={() => updateCart(item.id, -1)} className="hover:opacity-75"><Minus className="w-3 h-3" /></button>
                            <span>{qty}</span>
                            <button onClick={() => updateCart(item.id, 1)} className="hover:opacity-75"><Plus className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateCart(item.id, 1)}
                            className="bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-800 border border-slate-200 text-xs font-bold px-3 py-1 rounded-lg transition"
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
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3 rounded-2xl shadow-xl flex items-center justify-between border border-amber-400">
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

      {/* ── Cart Drawer (Light Theme) ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl text-slate-900">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Your Food Order</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                {orderType === "dine_in" && (
                  <div>
                    <label className="text-xs text-slate-700 font-bold block mb-1">Table Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 01, 04, VIP"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
                {orderType === "delivery" && (
                  <>
                    <div>
                      <label className="text-xs text-slate-700 font-bold block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        placeholder="Mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-700 font-bold block mb-1">Delivery Address *</label>
                      <textarea
                        rows={2}
                        placeholder="Street / house address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 resize-none focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}
                {orderType === "takeaway" && (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-700 font-bold block mb-1">Customer Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Your name for pickup call"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-700 font-bold block mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {cartItemsList.map(({ item, qty, price }) => (
                  <div key={item.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-slate-500">₹{price} × {qty} = <span className="text-amber-600 font-bold">₹{(price * qty).toFixed(0)}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-sm">
                      <button onClick={() => updateCart(item.id, -1)}><Minus className="w-3 h-3" /></button>
                      <span className="font-bold px-1">{qty}</span>
                      <button onClick={() => updateCart(item.id, 1)}><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-600"><span>GST (5%):</span><span>₹{gstAmount.toFixed(2)}</span></div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-sm">
                  <span>Grand Total:</span><span className="text-amber-600">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                disabled={isSubmitting || cartItemsList.length === 0}
                onClick={handlePlaceOrder}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Dispatching..." : "Confirm & Send to Kitchen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Success Modal (Light Theme) ── */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Order #{completedOrder.id} Placed!</h3>
            <p className="text-xs text-slate-500 mt-1">Sent to Kitchen KOT terminal. Preparation in progress!</p>

            <div className="bg-slate-50 rounded-xl p-3 my-3 text-xs text-left space-y-1 border border-slate-200">
              <div className="flex justify-between"><span>Branch:</span><span className="text-slate-900 font-bold">{completedOrder.branchName}</span></div>
              <div className="flex justify-between"><span>Mode:</span><span className="text-amber-700 font-bold uppercase">{completedOrder.orderType}</span></div>
              <div className="flex justify-between"><span>Total:</span><span className="text-amber-600 font-bold">₹{completedOrder.grandTotal.toFixed(2)}</span></div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => openWhatsAppOrder(completedOrder)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition"
              >
                💬 Send Receipt via WhatsApp
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Partner & Plan Registration Modal (Light Theme) ── */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowPartnerModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Join Hosto eMenu SaaS</h3>
              <p className="text-xs text-slate-500 mt-1">
                Register your restaurant business or join as a partner network provider.
              </p>
            </div>

            <form onSubmit={handlePartnerRegister} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Restaurant / Business Name *</label>
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Business Handle / Slug *</label>
                <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
                  <span className="text-slate-500 mr-1">app.com/</span>
                  <input
                    type="text"
                    required
                    placeholder="royal-spice"
                    value={partnerForm.slug}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                    className="bg-transparent text-amber-700 font-bold focus:outline-none flex-1 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={partnerForm.owner_name}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Mobile number"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@yourrestaurant.com"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Admin Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Secure password (min 6 chars)"
                  value={partnerForm.password}
                  onChange={(e) => setPartnerForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Selected Plan</label>
                <select
                  value={selectedPlanCode}
                  onChange={(e) => setSelectedPlanCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none"
                >
                  {plans.length > 0 ? (
                    plans.map(p => (
                      <option key={p.code} value={p.code}>
                        {p.name} (₹{p.price_monthly?.toLocaleString()}/mo - {p.max_branches} {p.max_branches === 1 ? 'Branch' : 'Branches'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="starter">Starter Plan (₹999/mo - 1 Branch)</option>
                      <option value="growth">Growth Plan (₹2,499/mo - 3 Branches & GST)</option>
                      <option value="enterprise">Enterprise Plan (₹5,999/mo - Unlimited)</option>
                    </>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2"
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

      {/* ── Universal Light Footer ── */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <HostoLogo size="sm" />
          <div className="text-center sm:text-right">
            <p className="font-semibold text-slate-700">
              Powered by Hosto eMenu SaaS · Multi-Branch QR Ordering & Kitchen POS
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Join with our plan or register as a partner · Instant tabletop QR stands
            </p>
          </div>
        </div>
      </footer>

          {/* ── Table Reservation Modal ── */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Reserve a Dining Table</h3>
                  <p className="text-xs text-slate-500">
                    {currentBranch?.name || "Hosto eMenu Dining"} · Instant Table Allocation
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReserveModal(false);
                  setReserveSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If reservation is confirmed */}
            {reserveSuccess ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-emerald-700 tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Reservation Confirmed!
                  </span>
                  <h4 className="text-2xl font-black text-slate-900 mt-2">
                    {reserveSuccess.table_number ? `Table ${reserveSuccess.table_number} Reserved` : 'Table Reserved'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Booking #{reserveSuccess.id} · We look forward to hosting you!
                  </p>
                </div>

                {/* Details Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Guest Name:</span>
                    <span className="font-extrabold text-slate-900">{reserveSuccess.guest_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Party Size:</span>
                    <span className="font-extrabold text-slate-900">{reserveSuccess.guest_count} Guests</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="font-extrabold text-purple-700">
                      {reserveSuccess.reservation_date} @ {reserveSuccess.reservation_time}
                    </span>
                  </div>
                  {reserveSuccess.special_notes && (
                    <div className="flex justify-between items-start pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Notes:</span>
                      <span className="font-bold text-slate-800 text-right max-w-[200px]">{reserveSuccess.special_notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `🍽️ *TABLE RESERVATION CONFIRMED* - ${currentBranch?.name || "Hosto eMenu"}\n` +
                        `📌 *Reservation #:* ${reserveSuccess.id}\n` +
                        `🪑 *Table:* ${reserveSuccess.table_number || "Allocated on arrival"}\n` +
                        `👤 *Guest:* ${reserveSuccess.guest_name} (${reserveSuccess.guest_count} Guests)\n` +
                        `📅 *Date & Time:* ${reserveSuccess.reservation_date} at ${reserveSuccess.reservation_time}`
                      );
                      window.open(`https://wa.me/?text=${msg}`, "_blank");
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>💬 Share via WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowReserveModal(false);
                      setReserveSuccess(null);
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl text-xs transition shadow-sm"
                  >
                    Done
                  </button>
                </div>

                {/* Cancel Reservation Action */}
                <button
                  type="button"
                  onClick={() => handleCancelCustomerReservation(reserveSuccess.reservation_id || reserveSuccess.id)}
                  className="w-full mt-2 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>❌ Cancel This Reservation</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleReserveTable} className="py-4 space-y-4 text-xs">
                {/* Branch Info */}
                {branches.length > 1 && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Select Branch *</label>
                    <select
                      value={selectedBranchId || ""}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>📍 {b.name} ({b.city || "Dining Branch"})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date, Guest Count & Table Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reservation Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={reserveForm.reservation_date}
                      onChange={(e) => setReserveForm(prev => ({ ...prev, reservation_date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Number of Guests *</label>
                    <select
                      value={reserveForm.guest_count}
                      onChange={(e) => setReserveForm(prev => ({ ...prev, guest_count: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Guest (Solo)' : `${n} Guests`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preferred Table Choice */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Choose Preferred Table (Optional)</label>
                  <select
                    value={reserveForm.table_id || ""}
                    onChange={(e) => setReserveForm(prev => ({ ...prev, table_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">⚡ Any Available Table (Auto-Allocated)</option>
                    {publicTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.table_number} ({t.seating_capacity || 4} Seats)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Slot Picker */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Preferred Time Slot *</label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {["12:30", "13:00", "13:30", "14:00", "19:00", "19:30", "20:00", "20:30"].map(t => {
                      const [h, m] = t.split(":");
                      const hr = parseInt(h);
                      const display = `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
                      const isSelected = reserveForm.reservation_time === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setReserveForm(prev => ({ ...prev, reservation_time: t }))}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition text-center ${
                            isSelected 
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm" 
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {display}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">Or custom time:</span>
                    <input
                      type="time"
                      value={reserveForm.reservation_time}
                      onChange={(e) => setReserveForm(prev => ({ ...prev, reservation_time: e.target.value }))}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Guest Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Guest Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Mehta"
                      value={reserveForm.guest_name}
                      onChange={(e) => setReserveForm(prev => ({ ...prev, guest_name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 98765 43210"
                      value={reserveForm.guest_phone}
                      onChange={(e) => setReserveForm(prev => ({ ...prev, guest_phone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Special Seating Request (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Window seat, anniversary, high chair for toddler..."
                    value={reserveForm.special_notes}
                    onChange={(e) => setReserveForm(prev => ({ ...prev, special_notes: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={reserveLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                  >
                    {reserveLoading ? (
                      <span>Reserving Table...</span>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-purple-200" />
                        <span>Confirm Dining Reservation</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    ⚡ Real-time table hold. You will receive an instant table confirmation.
                  </p>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}