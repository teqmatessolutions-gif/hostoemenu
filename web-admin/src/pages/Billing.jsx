import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import { useBranch } from "../contexts/BranchContext";
import { printTableBill } from "../utils/printBill";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  DollarSign,
  UtensilsCrossed,
  CreditCard,
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Truck,
  ExternalLink,
  Store,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const PAYMENT_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899"];

export default function Billing() {
  const navigate = useNavigate();
  const { activeBranchId, activeBranch, branches } = useBranch();
  
  // States
  const [liveData, setLiveData] = useState({ tables: [], summary: {} });
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isSettling, setIsSettling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'dine_in', 'takeaway', 'delivery', 'paid', 'unpaid'

  const resolvedBranchId = activeBranch?.id || (activeBranchId !== 'all' ? activeBranchId : null) || (branches.length > 0 ? branches[0].id : 2);
  const branchId = resolvedBranchId ? parseInt(resolvedBranchId) : null;
  const currentBranch = activeBranch || branches.find(b => b.id?.toString() === branchId?.toString()) || null;

  // 1. Fetch live tables and orders
  const fetchBillingData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const headers = branchId ? { "X-Branch-ID": branchId.toString() } : {};
      
      const [liveRes, ordersRes] = await Promise.all([
        api.get("/restaurant-tables/live-status", { headers }).catch(() => ({ data: { tables: [], summary: {} } })),
        api.get("/food-orders?limit=100", { headers }).catch(() => ({ data: [] }))
      ]);

      const liveTables = liveRes.data?.tables || [];
      setLiveData(liveRes.data || { tables: [], summary: {} });
      setAllOrders(ordersRes.data || []);

      // Auto-select first occupied or waiting bill table if none selected
      setSelectedTable(prev => {
        if (prev) {
          const updated = liveTables.find(t => t.id === prev.id);
          return updated || null;
        }
        const active = liveTables.find(t => t.status === "Waiting for Bill" || t.status === "Occupied");
        return active || null;
      });

    } catch (err) {
      console.error("Failed to load billing data:", err);
      if (!silent) toast.error("Failed to refresh billing console");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchBillingData();
    const interval = setInterval(() => {
      fetchBillingData(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchBillingData]);

  // Settle Bill Handler
  const handleSettleBill = async (tableToSettle) => {
    const target = tableToSettle || selectedTable;
    if (!target) {
      toast.error("Please select a table to settle");
      return;
    }

    try {
      setIsSettling(true);
      const headers = branchId ? { "X-Branch-ID": branchId.toString() } : {};
      const res = await api.post(`/restaurant-tables/${target.id}/settle`, {
        payment_method: paymentMethod
      }, { headers });

      toast.success(res.data?.message || `Table ${target.table_number} bill settled and freed!`);
      setSelectedTable(null);
      fetchBillingData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to settle bill");
    } finally {
      setIsSettling(false);
    }
  };

  // KPIs Calculations
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    
    // Settled today
    const paidToday = allOrders.filter(o => 
      o.billing_status === "paid" && (o.created_at || "").startsWith(today)
    );
    const totalTodayRevenue = paidToday.reduce((sum, o) => sum + (o.total_with_gst || o.amount || 0), 0);

    // Active unbilled tables on floor
    const activeFloorTables = (liveData.tables || []).filter(t => t.status === "Occupied" || t.status === "Waiting for Bill");
    const activeFloorAmount = activeFloorTables.reduce((sum, t) => sum + (t.current_bill_amount || 0), 0);

    // Takeaway & Delivery
    const onlineOrders = allOrders.filter(o => o.order_type === "takeaway" || o.order_type === "delivery");
    const onlineRevenue = onlineOrders.reduce((sum, o) => sum + (o.total_with_gst || o.amount || 0), 0);

    // Total Invoices
    const totalBillsCount = allOrders.length;
    const avgOrder = totalBillsCount > 0 
      ? Math.round(allOrders.reduce((sum, o) => sum + (o.total_with_gst || o.amount || 0), 0) / totalBillsCount)
      : 0;

    return {
      todayRevenue: Math.round(totalTodayRevenue),
      todayBillsCount: paidToday.length,
      activeTablesCount: activeFloorTables.length,
      activeFloorAmount: Math.round(activeFloorAmount),
      onlineRevenue: Math.round(onlineRevenue),
      avgOrder
    };
  }, [allOrders, liveData.tables]);

  // Chart data: Channels & Payment Methods
  const { channelData, tenderData } = useMemo(() => {
    let dineInCount = 0;
    let takeawayCount = 0;
    let deliveryCount = 0;
    let cashCount = 0;
    let upiCount = 0;
    let cardCount = 0;

    allOrders.forEach(o => {
      if (o.order_type === "delivery") deliveryCount++;
      else if (o.order_type === "takeaway") takeawayCount++;
      else dineInCount++;

      const method = (o.payment_method || "cash").toLowerCase();
      if (method.includes("upi") || method.includes("qr") || method.includes("online")) upiCount++;
      else if (method.includes("card")) cardCount++;
      else cashCount++;
    });

    const channels = [
      { name: "🍽️ Dine-In", value: dineInCount || 1 },
      { name: "🛍️ Takeaway", value: takeawayCount },
      { name: "🛵 Delivery", value: deliveryCount },
    ].filter(c => c.value > 0);

    const tenders = [
      { name: "💵 Cash", value: cashCount || 1 },
      { name: "📱 UPI / QR", value: upiCount },
      { name: "💳 Card", value: cardCount },
    ].filter(t => t.value > 0);

    return { channelData: channels, tenderData: tenders };
  }, [allOrders]);

  // Filtered Orders Table
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (filterType === "dine_in" && o.order_type !== "dine_in") return false;
      if (filterType === "takeaway" && o.order_type !== "takeaway") return false;
      if (filterType === "delivery" && o.order_type !== "delivery") return false;
      if (filterType === "paid" && o.billing_status !== "paid") return false;
      if (filterType === "unpaid" && o.billing_status === "paid") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idMatch = `#${o.id}`.includes(q);
        const reqMatch = (o.delivery_request || "").toLowerCase().includes(q);
        const typeMatch = (o.order_type || "").toLowerCase().includes(q);
        return idMatch || reqMatch || typeMatch;
      }
      return true;
    });
  }, [allOrders, filterType, searchQuery]);

  // Active occupied tables list for quick picker
  const activeTables = useMemo(() => {
    return (liveData.tables || []).filter(t => t.status === "Occupied" || t.status === "Waiting for Bill");
  }, [liveData.tables]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6">
        
        {/* ── Top Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                Restaurant POS & Invoicing
              </span>
              <span className="text-xs text-slate-500 font-bold hidden sm:inline">
                • {currentBranch?.name || "Hosto eMenu"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Billing & Counter POS Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time table settlements, walk-in takeaway billing, GST invoice printouts & audit register.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchBillingData(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={() => navigate("/table-qr")}
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tables & Floor</span>
            </button>

            <button
              onClick={() => navigate("/subscription")}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>SaaS Bill</span>
            </button>
          </div>
        </div>

        {/* ── Top F&B Billing KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Today's Billings</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">₹{kpis.todayRevenue.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600 mt-0.5 block">{kpis.todayBillsCount} bills settled</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block">Active Unbilled Tables</span>
              <span className="text-2xl font-black text-rose-600 mt-1 block">{kpis.activeTablesCount} Tables</span>
              <span className="text-[11px] font-bold text-slate-500 mt-0.5 block">₹{kpis.activeFloorAmount.toLocaleString()} pending bill</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 block">Online & Takeaway</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">₹{kpis.onlineRevenue.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-indigo-600 mt-0.5 block">Pickups & Delivery</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block">Avg Bill Spend</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">₹{kpis.avgOrder.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">Per customer table</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Receipt className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Total Invoices</span>
              <span className="text-2xl font-black text-white mt-1 block">{allOrders.length}</span>
              <span className="text-[11px] font-bold text-slate-400 mt-0.5 block">All-time billing count</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* ── Interactive POS Settlement Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Quick Table Checkout & Bill Settle Box */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      Instant Table Checkout & Settlement
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select an occupied dining table to generate GST invoice & record payment
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {activeTables.length} Tables Dining
                </span>
              </div>

              {/* Table Picker Chips */}
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Select Active Dining Table:
                </label>

                {activeTables.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-4 text-center border border-dashed border-slate-200 text-xs text-slate-500">
                    🟢 All dining tables are currently vacant and settled.
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {activeTables.map((t) => {
                      const isSelected = selectedTable?.id === t.id;
                      const isWaiting = t.status === "Waiting for Bill";
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTable(t)}
                          className={`p-3 rounded-2xl border text-left transition-all active:scale-95 shadow-sm ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 ring-2 ring-amber-400"
                              : isWaiting
                              ? "bg-amber-50 border-amber-300 text-slate-900 hover:bg-amber-100"
                              : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-black text-sm">Table {t.table_number}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected ? "bg-white/20 text-white" : isWaiting ? "bg-amber-200 text-amber-900" : "bg-rose-100 text-rose-800"
                            }`}>
                              {isWaiting ? "🔔 Bill Ready" : "Dining"}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between gap-4">
                            <span className={`text-xs font-black ${isSelected ? "text-amber-400" : "text-emerald-700"}`}>
                              ₹{t.current_bill_amount.toFixed(2)}
                            </span>
                            <span className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                              {t.items?.length || 0} items
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Table Bill Detail */}
              {selectedTable ? (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          Table {selectedTable.table_number}
                        </span>
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                          {selectedTable.seating_capacity || 4} Seats
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Guest: <strong className="text-slate-900">{selectedTable.guest_name || "Walk-in Guest"}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-semibold">Total Payable</span>
                      <span className="text-2xl font-black text-emerald-600 block">
                        ₹{selectedTable.current_bill_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  {selectedTable.items && selectedTable.items.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ordered Dishes:</span>
                      {selectedTable.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs text-slate-800">
                          <span className="font-semibold truncate pr-2">{it.name}</span>
                          <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">×{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-2">Tender / Payment Mode:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "cash", label: "💵 Cash" },
                        { id: "upi", label: "📱 UPI / QR" },
                        { id: "card", label: "💳 Card" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-black border transition ${
                            paymentMethod === m.id
                              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
                  Click on an active table card above to preview its itemized bill and collect payment.
                </div>
              )}
            </div>

            {/* Bottom Actions for Selected Table */}
            {selectedTable && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => printTableBill({ table: selectedTable, branch: currentBranch, paymentMethod, isPaid: false })}
                  className="flex-1 min-w-[140px] py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition"
                >
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>Print Tax Invoice (80mm)</span>
                </button>

                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() => {
                    printTableBill({ table: selectedTable, branch: currentBranch, paymentMethod, isPaid: true });
                    handleSettleBill(selectedTable);
                  }}
                  className="flex-1 min-w-[140px] py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print & Settle</span>
                </button>

                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() => handleSettleBill(selectedTable)}
                  className="flex-1 min-w-[140px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  {isSettling ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Settle & Free Table</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Revenue Breakdown & Channel Mix */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 mb-1">
                Dining Channel Breakdown
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Distribution of dine-in, takeaway, and delivery orders
              </p>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={38}
                      paddingAngle={3}
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Tender / Payment Mix:</h4>
                <div className="space-y-1.5">
                  {tenderData.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium">{t.name}</span>
                      <span className="font-bold text-slate-900">{t.value} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 bg-amber-50/60 p-3 rounded-2xl border border-amber-200/60">
              <span className="text-[11px] font-black text-amber-900 block mb-0.5">Quick Cashier Tip:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Clicking <strong>"Print & Settle"</strong> automatically triggers the 80mm thermal receipt dialog and frees up the dining table on the live QR floor in one step.
              </p>
            </div>
          </div>

        </div>

        {/* ── Recent Invoices & Settled Bills Register ── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Invoice & Billing Register
              </h3>
              <p className="text-xs text-slate-500">
                History of all dining bills, invoices, and payment statuses
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice #, guest..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "all", label: "All" },
                  { id: "dine_in", label: "Dine-In" },
                  { id: "takeaway", label: "Takeaway" },
                  { id: "paid", label: "Settled" },
                  { id: "unpaid", label: "Due" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filterType === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No billing records match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Dining Channel</th>
                    <th className="py-3 px-3">Customer / Guest</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Tender</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.map((order) => {
                    const isPaid = order.billing_status === "paid";
                    const orderTypeDisplay = order.order_type === "dine_in" 
                      ? (order.table_id ? `🍽️ Table ${order.table_id}` : "🍽️ Dine-in")
                      : order.order_type === "takeaway" 
                      ? "🛍️ Takeaway" 
                      : "🛵 Delivery";

                    let guestName = "Dine-in Guest";
                    if (order.delivery_request && order.delivery_request.includes("Guest:")) {
                      try {
                        guestName = order.delivery_request.split("Guest:")[1].split("|")[0].trim();
                      } catch (e) {}
                    } else if (order.delivery_request && order.delivery_request.includes("Name:")) {
                      try {
                        guestName = order.delivery_request.split("Name:")[1].split("|")[0].trim();
                      } catch (e) {}
                    }

                    const billAmount = order.total_with_gst || order.amount || 0;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          #{order.id}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {orderTypeDisplay}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-900">{guestName}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{billAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPaid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {isPaid ? "PAID" : "DUE"}
                          </span>
                        </td>
                        <td className="py-3 px-3 uppercase text-[11px] font-bold text-slate-600">
                          {order.payment_method || "Cash"}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {order.created_at ? new Date(order.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "-"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => printTableBill({
                              table: {
                                table_number: order.table_id || order.id,
                                guest_name: guestName,
                                current_bill_amount: billAmount,
                                items: (order.items || []).map(i => ({ name: i.food_item_name || `Item #${i.food_item_id}`, quantity: i.quantity }))
                              },
                              branch: currentBranch,
                              paymentMethod: order.payment_method || "cash",
                              isPaid
                            })}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Print Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </DashboardLayout>
  );
}
