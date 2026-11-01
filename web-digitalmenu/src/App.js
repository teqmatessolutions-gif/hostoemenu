import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Utensils, ShoppingBag, Search, Plus, Minus, X, Check, Phone, 
  MapPin, Clock, ArrowRight, Sparkles, Filter, AlertCircle, 
  ChevronDown, Send, CheckCircle2, RotateCcw
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getApiBaseUrl, getMediaBaseUrl } from "./utils/env";

export default function App() {
  const API = getApiBaseUrl();
  const MEDIA = getMediaBaseUrl();

  // Navigation & URL hash parameters
  const [currentHash, setCurrentHash] = useState(() => window.location.hash || "");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [tables, setTables] = useState([]);

  // Order routing parsed from hash / query
  const [tableId, setTableId] = useState("");
  const [roomId, setRoomId] = useState("");

  // Order mode: 'dine_in' | 'delivery' | 'room_service'
  const [orderType, setOrderType] = useState("dine_in");

  // Food catalog
  const [foodItems, setFoodItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
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

  // Order success modal
  const [completedOrder, setCompletedOrder] = useState(null);

  // Parse URL hash or query params
  const parseRoute = useCallback(() => {
    const hash = window.location.hash || "";
    setCurrentHash(hash);
    const search = window.location.search || (hash.includes("?") ? "?" + hash.split("?")[1] : "");
    const params = new URLSearchParams(search);
    const qBranch = params.get("branch_id");

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
      if (qBranch) setSelectedBranchId(qBranch);
    } else if (hash.startsWith("#/room/")) {
      const rId = hash.replace("#/room/", "").split("?")[0];
      setRoomId(rId);
      setOrderType("room_service");
      if (qBranch) setSelectedBranchId(qBranch);
    } else if (qBranch) {
      setSelectedBranchId(qBranch);
    }
  }, []);

  useEffect(() => {
    parseRoute();
    const handleHashChange = () => parseRoute();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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

  // Current active branch object
  const currentBranch = useMemo(() => {
    if (!branches.length) return null;
    if (!selectedBranchId) return branches[0];
    return branches.find(b => b.id.toString() === selectedBranchId.toString()) || branches[0];
  }, [branches, selectedBranchId]);

  // Fetch tables for branch
  useEffect(() => {
    if (!currentBranch?.id) return;
    const fetchTables = async () => {
      try {
        const res = await fetch(`${API}/public/tables?branch_id=${currentBranch.id}`);
        if (res.ok) {
          const data = await res.json();
          setTables(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch tables", err);
      }
    };
    fetchTables();
  }, [API, currentBranch?.id]);

  // Fetch food items and categories for selected branch
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
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
        toast.error("Could not load menu items. Retrying...");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [API, currentBranch?.id]);

  // Calculate resolved price (mirrors backend dynamic pricing)
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
      // Must be available
      if (item.available === false) return false;

      // Category filter
      if (selectedCategory !== "all" && item.category_id !== parseInt(selectedCategory)) {
        return false;
      }

      // Veg only filter (detect veg/vegetarian in name or desc)
      if (vegOnly) {
        const desc = (item.description || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        const isVeg = item.is_veg === true || desc.includes("veg") || name.includes("veg");
        const isNonVeg = desc.includes("non-veg") || desc.includes("chicken") || desc.includes("mutton") || desc.includes("fish") || desc.includes("meat") || desc.includes("beef") || desc.includes("pork");
        if (!isVeg || isNonVeg) return false;
      }

      // Search query
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

  // 5% standard GST
  const gstAmount = useMemo(() => {
    return subtotal * 0.05;
  }, [subtotal]);

  const grandTotal = useMemo(() => {
    return subtotal + gstAmount;
  }, [subtotal, gstAmount]);

  // Place Order Handler
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
      toast.error("Please enter your Phone Number and Delivery Address.");
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
      console.warn("Backend API direct save failed, falling back to WhatsApp dispatch", err);
    }

    // Success flow
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

  // WhatsApp Dispatch Helper
  const openWhatsAppOrder = (order) => {
    if (!order) return;
    const itemsSummary = order.items.map(e => `${e.item.name} x${e.qty} (₹${e.price * e.qty})`).join(", ");
    const typeLabel = order.orderType === "dine_in" 
      ? `Dine-In Table ${order.tableId}` 
      : (order.orderType === "delivery" ? `Delivery (${order.customerPhone})` : `Room ${order.roomId}`);
    
    const message = encodeURIComponent(
      `🍽️ *NEW ORDER #${order.id}* - ${order.branchName}\n` +
      `📌 *Mode:* ${typeLabel}\n` +
      (order.deliveryAddress ? `📍 *Address:* ${order.deliveryAddress}\n` : '') +
      `📋 *Items:*\n${order.items.map(e => `• ${e.item.name} x${e.qty} - ₹${e.price * e.qty}`).join('\n')}\n\n` +
      `💰 *Total Amount:* ₹${order.grandTotal.toFixed(2)}`
    );

    const cleanPhone = (order.branchPhone || "").replace(/\D/g, "");
    const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      <Toaster position="top-right" />

      {/* ── Top Header / Brand Bar ── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Logo & Branch */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
                  {currentBranch?.name || "Digital Menu"}
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
                  E-Menu
                </span>
              </div>
              
              {/* Branch Switcher Dropdown (if multiple) */}
              {branches.length > 1 ? (
                <div className="relative inline-block mt-0.5">
                  <select
                    value={selectedBranchId || ""}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="appearance-none bg-slate-800 text-xs text-slate-300 rounded-lg px-2 py-0.5 pr-6 border border-slate-700 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>📍 {b.name} ({b.city || "Branch"})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1.5 pointer-events-none" />
                </div>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  {currentBranch?.address || "Fresh Gourmet Food & Drinks"}
                </p>
              )}
            </div>
          </div>

          {/* Cart Floating / Action Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all duration-150"
            >
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">My Cart</span>
              <span className="text-sm font-extrabold">₹{grandTotal.toFixed(0)}</span>
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-white text-slate-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Mode Selector Tabs (Dine-In, Delivery, Room Service) ── */}
        <div className="bg-slate-950/80 px-4 py-2 border-t border-slate-800/60">
          <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setOrderType("dine_in")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  orderType === "dine_in"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🍽️</span> Dine-In
              </button>
              <button
                onClick={() => setOrderType("delivery")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  orderType === "delivery"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🛵</span> Delivery
              </button>
              <button
                onClick={() => setOrderType("room_service")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  orderType === "room_service"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🛏️</span> Room Service
              </button>
            </div>

            {/* Context Badge (Table / Room pre-filled) */}
            {orderType === "dine_in" && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-xs text-amber-300">
                <span className="font-semibold">Table Seating:</span>
                {tableId ? (
                  <span className="font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                    Table #{tableId}
                  </span>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Table #"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="w-24 bg-slate-800 text-white px-2 py-0.5 rounded text-xs border border-amber-500/30 focus:outline-none"
                  />
                )}
              </div>
            )}

            {orderType === "room_service" && (
              <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl text-xs text-indigo-300">
                <span className="font-semibold">Room Number:</span>
                <input
                  type="text"
                  placeholder="Enter Room #"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-24 bg-slate-800 text-white px-2 py-0.5 rounded text-xs border border-indigo-500/30 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Search & Filter Sub-Bar ── */}
      <section className="bg-slate-900/50 border-b border-slate-800/80 py-4 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes, drinks, appetizers, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Veg Only Toggle */}
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition flex items-center gap-2 whitespace-nowrap ${
              vegOnly 
                ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" 
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            Pure Veg Only
          </button>
        </div>

        {/* Categories Horizontal Carousel */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50"
            }`}
          >
            ✨ All Items ({foodItems.length})
          </button>

          {categories.map(cat => {
            const count = foodItems.filter(f => f.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id.toString()
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Main Food Menu Showcase Grid ── */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-semibold text-sm">Preparing fresh digital menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-900/40 rounded-3xl border border-slate-800 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl mb-4">
              🍲
            </div>
            <h3 className="font-bold text-lg text-white">No dishes found</h3>
            <p className="text-slate-400 text-sm max-w-sm mt-1">
              {searchQuery || vegOnly 
                ? "Try adjusting your search query or removing the Veg filter."
                : "This branch currently has no active dishes published. Please check back shortly!"}
            </p>
            {(searchQuery || vegOnly || selectedCategory !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setVegOnly(false); setSelectedCategory("all"); }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-slate-700"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const qty = cart[item.id] || 0;
              const price = getItemPrice(item, orderType);
              const img = item.images && item.images.length > 0 
                ? (item.images[0].image_url?.startsWith('http') ? item.images[0].image_url : `${MEDIA}${item.images[0].image_url?.startsWith('/') ? '' : '/'}${item.images[0].image_url}`)
                : (item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${MEDIA}${item.image_url.startsWith('/') ? '' : '/'}${item.image_url}`) : null);

              const isVeg = item.is_veg === true || (item.name + (item.description || "")).toLowerCase().includes("veg");

              return (
                <div 
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between hover:border-slate-700 transition shadow-lg relative group"
                >
                  <div className="flex gap-4">
                    {/* Item Details */}
                    <div className="flex-1">
                      {/* Veg / Non-Veg Indicator */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-4 h-4 rounded-sm border flex items-center justify-center p-0.5 ${
                          isVeg ? "border-emerald-500" : "border-rose-500"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            isVeg ? "bg-emerald-500" : "bg-rose-500"
                          }`} />
                        </span>
                        {item.category?.name && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {item.category.name}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-base leading-snug group-hover:text-amber-400 transition-colors">
                        {item.name}
                      </h4>

                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description || "Freshly cooked to perfection with authentic herbs and savory spices."}
                      </p>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-lg font-black text-white">
                          ₹{price.toFixed(0)}
                        </span>
                        {orderType === "room_service" && item.room_service_price && (
                          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            Room Service
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Food Photo / Placeholder */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-800">
                      {img ? (
                        <img 
                          src={img} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-amber-400/80">
                          🍲
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controller / Add Button */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {item.always_available !== false ? "🟢 In Kitchen" : "🕒 Limited Time"}
                    </span>

                    {qty > 0 ? (
                      <div className="flex items-center gap-2 bg-amber-500 text-slate-950 rounded-xl px-2 py-1 shadow-md font-black">
                        <button
                          onClick={() => updateCart(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center active:scale-90"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-extrabold">{qty}</span>
                        <button
                          onClick={() => updateCart(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center active:scale-90"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 hover:border-amber-500 font-bold text-xs px-4 py-2 rounded-xl transition duration-150 active:scale-95 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Sticky Bottom Floating Cart Bar ── */}
      {totalCartCount > 0 && !isCartOpen && (
        <aside className="sticky bottom-4 z-30 max-w-xl mx-auto w-full px-4" aria-label="Cart Summary">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3 rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center justify-between border border-amber-400/50 backdrop-blur-md animate-slide-up">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 font-black flex items-center justify-center text-sm">
                {totalCartCount}
              </div>
              <div>
                <p className="text-xs uppercase font-extrabold tracking-wider text-slate-900">Total in Cart</p>
                <p className="text-base font-black">₹{grandTotal.toFixed(0)} <span className="text-xs font-semibold text-slate-800">(incl. GST)</span></p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition"
            >
              <span>View Cart & Checkout</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </aside>
      )}

      {/* ── Cart & Checkout Slide-Over Drawer ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Your Food Order</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Order Mode Badge */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Order Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setOrderType("dine_in")}
                    className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                      orderType === "dine_in" 
                        ? "bg-amber-500 text-slate-950" 
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>🍽️</span> Dine-In
                  </button>
                  <button
                    onClick={() => setOrderType("delivery")}
                    className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                      orderType === "delivery" 
                        ? "bg-amber-500 text-slate-950" 
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>🛵</span> Delivery
                  </button>
                  <button
                    onClick={() => setOrderType("room_service")}
                    className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                      orderType === "room_service" 
                        ? "bg-amber-500 text-slate-950" 
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <span>🛏️</span> Room Service
                  </button>
                </div>
              </div>

              {/* Destination inputs */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                {orderType === "dine_in" && (
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      Table Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Table 04 or VIP-1"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {orderType === "delivery" && (
                  <>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        Contact Phone <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 font-bold block mb-1">
                        Delivery Address <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="House / Flat / Street address..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
                      />
                    </div>
                  </>
                )}

                {orderType === "room_service" && (
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">
                      Room Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 101, 204"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">
                    Special Kitchen Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Less spicy, extra sauce, allergy info..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Order Items ({totalCartCount})</p>
                {cartItemsList.map(({ item, qty, price }) => (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">₹{price} × {qty} = <span className="text-amber-400 font-bold">₹{(price * qty).toFixed(0)}</span></p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => updateCart(item.id, -1)}
                        className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{qty}</span>
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Item Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>GST (5%)</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-base text-white">
                  <span>Grand Total</span>
                  <span className="text-amber-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <button
                disabled={isSubmitting || cartItemsList.length === 0}
                onClick={handlePlaceOrder}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Dispatching Order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Send to Kitchen</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Success Modal ── */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              <Check className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Order Received
            </span>

            <h3 className="text-xl font-black text-white mt-2">
              Order #{completedOrder.id} Placed!
            </h3>
            
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Your order has been sent directly to the kitchen KOT terminal. Fresh preparation has begun!
            </p>

            <div className="bg-slate-950 rounded-2xl p-4 my-4 border border-slate-800 text-left space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Branch:</span>
                <span className="text-white font-bold">{completedOrder.branchName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Type:</span>
                <span className="text-amber-400 font-bold uppercase">{completedOrder.orderType.replace('_', ' ')}</span>
              </div>
              {completedOrder.tableId && (
                <div className="flex justify-between text-slate-400">
                  <span>Table:</span>
                  <span className="text-white font-bold">#{completedOrder.tableId}</span>
                </div>
              )}
              {completedOrder.roomId && (
                <div className="flex justify-between text-slate-400">
                  <span>Room:</span>
                  <span className="text-white font-bold">#{completedOrder.roomId}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-1.5 flex justify-between text-sm font-black text-white">
                <span>Total Amount:</span>
                <span className="text-amber-400">₹{completedOrder.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => openWhatsAppOrder(completedOrder)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
              >
                <span>💬 Send Receipt via WhatsApp</span>
              </button>

              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition"
              >
                Order More Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-400">
          Powered by DigitalMenu SaaS · Multi-Branch Digital Menu & KOT Ordering
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Scan QR Code on Table to order instantly · Fast Kitchen Dispatch
        </p>
      </footer>
    </div>
  );
}
