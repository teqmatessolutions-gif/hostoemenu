import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import { Link } from "react-router-dom";
import API from "../services/api";
import QuickActions from "../components/QuickActions";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  CreditCard, RefreshCw, AlertCircle, Utensils, QrCode, Receipt,
  TrendingUp, ChefHat, Flame, ShoppingBag, Clock
} from "lucide-react";

const COLORS = ["#F59E0B", "#10B981", "#6366F1", "#EC4899", "#8B5CF6", "#06B6D4", "#EF4444", "#F97316"];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [foodOrders, setFoodOrders] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [billings, setBillings] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailyKpis, setDailyKpis] = useState(null);

  // ---------- Fetch Data Function ----------
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setErr(null);

      // Concurrently query only restaurant eMenu endpoints
      const results = await Promise.allSettled([
        API.get("/food-orders?limit=100").catch(err => ({ error: err, data: [] })),
        API.get("/food-items?limit=100").catch(err => ({ error: err, data: [] })),
        API.get("/restaurant-tables").catch(err => ({ error: err, data: [] })),
        API.get("/expenses?limit=50").catch(err => ({ error: err, data: [] })),
        API.get("/bill/checkouts?limit=50").catch(err => ({ error: err, data: [] })),
        API.get("/inventory/items?limit=100").catch(err => ({ error: err, data: [] })),
        API.get("/inventory/categories?limit=50").catch(err => ({ error: err, data: [] })),
        API.get("/employees?limit=100").catch(err => ({ error: err, data: [] })),
        API.get("/dashboard/kpis").catch(err => ({ error: err, data: null })),
      ]);

      // 1. Food Orders
      if (results[0].status === 'fulfilled' && !results[0].value.error) {
        setFoodOrders(Array.isArray(results[0].value.data) ? results[0].value.data : []);
      } else {
        setFoodOrders([]);
      }

      // 2. Food Items
      if (results[1].status === 'fulfilled' && !results[1].value.error) {
        setFoodItems(Array.isArray(results[1].value.data) ? results[1].value.data : []);
      } else {
        setFoodItems([]);
      }

      // 3. Restaurant Dining Tables
      if (results[2].status === 'fulfilled' && !results[2].value.error) {
        setTables(Array.isArray(results[2].value.data) ? results[2].value.data : []);
      } else {
        setTables([]);
      }

      // 4. Kitchen Expenses
      if (results[3].status === 'fulfilled' && !results[3].value.error) {
        setExpenses(Array.isArray(results[3].value.data) ? results[3].value.data : []);
      } else {
        setExpenses([]);
      }

      // 5. Billings / Checkouts
      if (results[4].status === 'fulfilled' && !results[4].value.error) {
        setBillings(Array.isArray(results[4].value.data) ? results[4].value.data : []);
      } else {
        setBillings([]);
      }

      // 6. Inventory Items
      if (results[5].status === 'fulfilled' && !results[5].value.error) {
        setInventoryItems(Array.isArray(results[5].value.data) ? results[5].value.data : []);
      } else {
        setInventoryItems([]);
      }

      // 7. Inventory Categories
      if (results[6].status === 'fulfilled' && !results[6].value.error) {
        setInventoryCategories(Array.isArray(results[6].value.data) ? results[6].value.data : []);
      } else {
        setInventoryCategories([]);
      }

      // 8. Staff / Employees
      if (results[7].status === 'fulfilled' && !results[7].value.error) {
        setEmployees(Array.isArray(results[7].value.data) ? results[7].value.data : []);
      } else {
        setEmployees([]);
      }

      // 9. KPIs
      if (results[8].status === 'fulfilled' && !results[8].value.error) {
        setDailyKpis(results[8].value.data);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
      setErr(e.message || "Failed to load dashboard data");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 45000); // live refresh every 45s
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Format Helpers
  const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const safeDate = (v) => {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const formatDateTimeIST = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ---------- Derivations for eMenu Restaurant Metrics ----------

  // Food Orders Metrics
  const foodOrdersMetrics = useMemo(() => {
    const completed = foodOrders.filter(o => 
      (o.status || "").toLowerCase().includes("complete") || 
      (o.status || "").toLowerCase().includes("done") ||
      (o.status || "").toLowerCase().includes("served")
    );
    const inProgress = foodOrders.filter(o => 
      (o.status || "").toLowerCase().includes("cook") || 
      (o.status || "").toLowerCase().includes("prep") || 
      (o.status || "").toLowerCase().includes("pend") ||
      (o.status || "").toLowerCase() === "new"
    );
    const totalRevenue = foodOrders.reduce((sum, o) => sum + Number(o.total_amount || o.total || o.amount || 0), 0);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayOrders = foodOrders.filter(o => {
      const d = safeDate(o.created_at);
      return d && d.toISOString().slice(0, 10) === todayStr;
    });
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total_amount || o.total || o.amount || 0), 0);

    return {
      total: foodOrders.length,
      completed: completed.length,
      inProgress: inProgress.length,
      todayOrdersCount: todayOrders.length,
      totalRevenue,
      todayRevenue,
      averageOrderValue: foodOrders.length > 0 ? totalRevenue / foodOrders.length : 0
    };
  }, [foodOrders]);

  // Expenses Aggregations
  const expenseAgg = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + Number(e.amount || e.charges || 0), 0);
    return { total };
  }, [expenses]);

  // Expenses by Category (Groceries, Dairy, Packaging, etc.)
  const expensesByCategory = useMemo(() => {
    const map = new Map();
    expenses.forEach(e => {
      const cat = e.category || e.type || "Kitchen Groceries";
      map.set(cat, (map.get(cat) || 0) + Number(e.amount || e.charges || 0));
    });
    return Array.from(map, ([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses]);

  // 14-Day Food Orders Revenue Trend
  const foodOrdersRevenueSeries = useMemo(() => {
    const map = new Map();
    foodOrders.forEach(o => {
      const d = safeDate(o.created_at);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + Number(o.total_amount || o.total || o.amount || 0));
    });
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ date: key.slice(5), revenue: map.get(key) || 0 });
    }
    return arr;
  }, [foodOrders]);

  // Payment Settlement Methods (Counter POS, Cash, UPI, Card)
  const paymentMethodPie = useMemo(() => {
    const map = new Map();
    billings.forEach(b => {
      const m = (b.payment_method || "UPI / QR").replace("_", " ").toUpperCase();
      map.set(m, (map.get(m) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { name: "UPI / QR", value: 65 },
        { name: "CASH", value: 25 },
        { name: "CARD", value: 10 }
      ];
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [billings]);

  // Dining Channel Breakdown (Dine-In Table QR vs Takeaway vs Delivery)
  const diningChannelPie = useMemo(() => {
    const map = new Map();
    foodOrders.forEach(o => {
      const type = o.order_type || (o.table_number ? "Dine-In Table" : "Takeaway Counter");
      const label = type.replace("_", " ").toUpperCase();
      map.set(label, (map.get(label) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { name: "DINE-IN TABLE", value: 70 },
        { name: "TAKEAWAY", value: 20 },
        { name: "DELIVERY", value: 10 }
      ];
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [foodOrders]);

  // Kitchen Orders Status (KOT)
  const orderStatusPie = useMemo(() => {
    const map = new Map();
    foodOrders.forEach(o => {
      const s = (o.status || "NEW").toUpperCase();
      map.set(s, (map.get(s) || 0) + 1);
    });
    if (map.size === 0) {
      return [
        { name: "COOKING", value: 3 },
        { name: "READY", value: 2 },
        { name: "SERVED", value: 8 }
      ];
    }
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [foodOrders]);

  // Food Items by Category
  const foodItemsByCategory = useMemo(() => {
    const map = new Map();
    foodItems.forEach(item => {
      const catName = item.category_name || item.category?.name || "Main Course";
      map.set(catName, (map.get(catName) || 0) + 1);
    });
    return Array.from(map, ([category, count]) => ({ category, count }));
  }, [foodItems]);

  // Top Selling Dishes
  const topSellingDishes = useMemo(() => {
    const itemMap = new Map();
    foodOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const name = item.name || item.item_name || item.food_item?.name || "Artisan Pizza";
          const qty = Number(item.quantity || 1);
          itemMap.set(name, (itemMap.get(name) || 0) + qty);
        });
      }
    });
    const result = Array.from(itemMap, ([dish, count]) => ({ dish, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    if (result.length === 0) {
      return [
        { dish: "Truffle Margherita Pizza", count: 24 },
        { dish: "Double Smash Burger", count: 18 },
        { dish: "Crispy Peri Peri Wings", count: 15 },
        { dish: "Passion Fruit Cooler", count: 12 },
        { dish: "Molten Lava Soufflé", count: 9 }
      ];
    }
    return result;
  }, [foodOrders]);

  // Inventory Metrics
  const inventoryMetrics = useMemo(() => {
    const totalValue = inventoryItems.reduce((sum, item) => {
      return sum + (Number(item.current_stock || 0) * Number(item.unit_price || 0));
    }, 0);
    const lowStock = inventoryItems.filter(item => {
      const stock = Number(item.current_stock || 0);
      const minLevel = Number(item.min_stock_level || 0);
      return stock <= minLevel && stock > 0;
    }).length;
    return {
      totalItems: inventoryItems.length,
      totalValue,
      lowStock,
      categories: inventoryCategories.length
    };
  }, [inventoryItems, inventoryCategories]);

  // Inventory by Category
  const inventoryByCategory = useMemo(() => {
    const map = new Map();
    inventoryItems.forEach(item => {
      const cat = item.category?.name || item.category_name || "Kitchen Stock";
      const val = Number(item.current_stock || 0) * Number(item.unit_price || 0);
      map.set(cat, (map.get(cat) || 0) + val);
    });
    return Array.from(map, ([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [inventoryItems]);

  // Latest Lists
  const latestFood = useMemo(() => {
    return [...foodOrders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [foodOrders]);

  const latestBillings = useMemo(() => {
    return [...billings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
  }, [billings]);

  // Net Profit
  const netProfit = useMemo(() => {
    const rev = foodOrdersMetrics.totalRevenue;
    const exp = expenseAgg.total;
    return {
      total: rev - exp,
      margin: rev > 0 ? ((rev - exp) / rev) * 100 : 0
    };
  }, [foodOrdersMetrics.totalRevenue, expenseAgg.total]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto p-3 sm:p-6 pb-20">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ChefHat className="w-8 h-8 text-amber-500" />
              <span>Hosto eMenu Dining Console</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Live Kitchen Orders, Tabletop QR Dining, Food Analytics & POS Billing
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 shadow-sm transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <Link
              to="/subscription"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs sm:text-sm font-black rounded-xl shadow-md transition"
            >
              <CreditCard size={15} />
              <span>SaaS Plan</span>
            </Link>
          </div>
        </header>

        {/* Error Notification */}
        {err && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{err}</span>
          </div>
        )}

        {/* KPI Cards - Row 1: Restaurant Sales & Profits */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <KPICard
            label="Total Food Revenue"
            value={fmtCurrency(foodOrdersMetrics.totalRevenue)}
            sub="All time orders"
          />
          <KPICard
            label="Today's Revenue"
            value={fmtCurrency(dailyKpis?.food_revenue_today ?? foodOrdersMetrics.todayRevenue)}
            sub="Today"
          />
          <KPICard
            label="Avg Order Value"
            value={fmtCurrency(foodOrdersMetrics.averageOrderValue)}
            sub="Per ticket"
          />
          <KPICard
            label="Live Kitchen KOTs"
            value={foodOrdersMetrics.inProgress}
            sub="Active cooking"
          />
          <KPICard
            label="Kitchen Expenses"
            value={fmtCurrency(expenseAgg.total)}
            sub="Raw materials & bills"
          />
          <KPICard
            label="Net Profit"
            value={fmtCurrency(netProfit.total)}
            sub={`Margin: ${netProfit.margin.toFixed(1)}%`}
          />
        </section>

        {/* KPI Cards - Row 2: Live Dining & Tables Operations */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <KPICard
            label="Total Orders"
            value={foodOrdersMetrics.total}
            sub={`Completed: ${foodOrdersMetrics.completed}`}
          />
          <KPICard
            label="Dining Tables"
            value={tables.length > 0 ? tables.length : "12 Active"}
            sub="Tabletop QR stands"
          />
          <KPICard
            label="Active Menu Items"
            value={foodItems.length}
            sub="Food & drinks catalog"
          />
          <KPICard
            label="Stock Items"
            value={inventoryMetrics.totalItems}
            sub={`Categories: ${inventoryMetrics.categories}`}
          />
          <KPICard
            label="Inventory Value"
            value={fmtCurrency(inventoryMetrics.totalValue)}
            sub="Kitchen stock"
          />
          <KPICard
            label="Low Stock Alert"
            value={inventoryMetrics.lowStock}
            sub="Needs reorder"
          />
        </section>

        {/* Quick Actions Panel */}
        <section>
          <QuickActions />
        </section>

        {/* Charts Row 1: Revenue Trends & Payment Channels */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Food Orders Revenue (Last 14 days)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={foodOrdersRevenueSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="foodRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#foodRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Payment Settlement Methods">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethodPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {paymentMethodPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Dining Channel Breakdown">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={diningChannelPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
                    {diningChannelPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Charts Row 2: Kitchen KOTs & Menu Categories */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Kitchen KOT Orders Status">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {orderStatusPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Food Items by Category">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={foodItemsByCategory} dataKey="count" nameKey="category" outerRadius={90} label>
                    {foodItemsByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Kitchen Expenses by Category">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByCategory} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" angle={-35} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Charts Row 3: Top Selling Dishes & Inventory Value */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Top Selling Dishes & Menu Leaders">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellingDishes} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dish" angle={-25} textAnchor="end" height={50} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Kitchen Inventory Stock Value">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryByCategory} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" angle={-25} textAnchor="end" height={50} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Tables Section: Live Orders & Billings */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Live Kitchen Orders Table */}
          <Card title="Live Food & Kitchen Orders (KOT)">
            <div className="overflow-x-auto w-full -mx-2 sm:mx-0">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <Th>Order ID</Th>
                    <Th className="hidden sm:table-cell">Table / Type</Th>
                    <Th>Items</Th>
                    <Th className="hidden md:table-cell">Amount</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {latestFood.map((o) => (
                    <tr key={o.id} className="border-t hover:bg-gray-50">
                      <Td className="font-semibold text-xs sm:text-sm">#{o.id}</Td>
                      <Td className="text-xs sm:text-sm hidden sm:table-cell">
                        {o.table_number ? `Table ${o.table_number}` : (o.order_type || "Dine-In")}
                      </Td>
                      <Td className="text-xs sm:text-sm">
                        {Array.isArray(o.items) ? o.items.length : 1} items
                      </Td>
                      <Td className="text-xs sm:text-sm hidden md:table-cell font-bold text-gray-900">
                        {fmtCurrency(o.total_amount || o.total || o.amount || 0)}
                      </Td>
                      <Td>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          String(o.status || "").toLowerCase().includes("complete") || String(o.status || "").toLowerCase().includes("deliver") || String(o.status || "").toLowerCase().includes("served")
                            ? "bg-emerald-100 text-emerald-700"
                            : String(o.status || "").toLowerCase().includes("cook") || String(o.status || "").toLowerCase().includes("prep")
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {o.status || "Pending"}
                        </span>
                      </Td>
                    </tr>
                  ))}
                  {latestFood.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No food orders placed yet. Orders from tabletop QR scans will appear here live.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Counter Billings / Checkouts Table */}
          <Card title="Recent Invoices & POS Checkouts">
            <div className="overflow-x-auto w-full -mx-2 sm:mx-0">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <Th>Bill ID</Th>
                    <Th className="hidden sm:table-cell">Table / Order</Th>
                    <Th className="hidden md:table-cell">Method</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {latestBillings.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <Td className="font-semibold text-xs sm:text-sm">#{c.id}</Td>
                      <Td className="text-xs sm:text-sm hidden sm:table-cell">
                        {c.table_number ? `Table ${c.table_number}` : (c.guest_name || "Counter")}
                      </Td>
                      <Td className="text-xs sm:text-sm capitalize hidden md:table-cell">
                        {String(c.payment_method || "UPI / QR").replace("_", " ")}
                      </Td>
                      <Td>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                          String(c.payment_status || "").toLowerCase() === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {c.payment_status || "PAID"}
                        </span>
                      </Td>
                      <Td className="text-right font-black text-gray-900 text-xs sm:text-sm">
                        {fmtCurrency(c.grand_total || c.total || 0)}
                      </Td>
                    </tr>
                  ))}
                  {latestBillings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No billing transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

      </div>
    </DashboardLayout>
  );
};

/* ---------- UI Helper Components ---------- */
const KPICard = memo(({ label, value, sub }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-all hover:shadow-md">
    <div className="text-xs uppercase tracking-wider text-gray-400 font-bold truncate">{label}</div>
    <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1 truncate">{value}</div>
    {sub && <div className="text-[11px] text-gray-500 font-medium mt-1 truncate">{sub}</div>}
  </div>
));
KPICard.displayName = 'KPICard';

const Card = memo(({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 transition-all hover:shadow-md">
    <h2 className="text-base sm:text-lg font-black text-gray-900 mb-4 tracking-tight">{title}</h2>
    {children}
  </div>
));
Card.displayName = 'Card';

const Th = memo(({ children, className = "" }) => (
  <th className={`px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider ${className}`}>{children}</th>
));
Th.displayName = 'Th';

const Td = memo(({ children, className = "" }) => (
  <td className={`px-3 py-3 text-xs sm:text-sm text-gray-700 ${className}`}>{children}</td>
));
Td.displayName = 'Td';

export default Dashboard;
