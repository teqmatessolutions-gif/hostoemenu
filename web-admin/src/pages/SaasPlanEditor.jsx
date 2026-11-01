import React, { useState, useEffect } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import { 
  CreditCard, Plus, Edit2, Trash2, Check, X, Shield, 
  Sparkles, Layers, Building2, Users, CheckCircle2, 
  AlertCircle, ArrowRight, RefreshCw, Eye, EyeOff
} from "lucide-react";
import toast from "react-hot-toast";

export default function SaasPlanEditor() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit / Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // null = create new, object = edit
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    price_monthly: 999,
    price_yearly: 9990,
    max_branches: 1,
    max_rooms: 15, // used as max tables in digital menu
    max_staff_users: 5,
    description: "",
    badge: "",
    is_active: true,
    features: [
      "Digital QR Code Menu",
      "Tabletop QR Stand Generator",
      "Live Kitchen Order Tickets (KOT)",
      "Standard Food Billing",
      "1-Click WhatsApp Ordering"
    ],
    update_existing_tenants: false
  });

  const [newFeatureText, setNewFeatureText] = useState("");

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/saas/admin/plans");
      setPlans(res.data || []);
    } catch (err) {
      console.error("Failed to load plans", err);
      toast.error("Failed to load SaaS plans from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      code: "",
      price_monthly: 999,
      price_yearly: 9990,
      max_branches: 1,
      max_rooms: 15,
      max_staff_users: 5,
      description: "Ideal for fast-casual dining and boutique cafes.",
      badge: "",
      is_active: true,
      features: [
        "Digital QR Code Menu",
        "Tabletop QR Stand Generator",
        "Live Kitchen Order Tickets (KOT)",
        "Standard Food Billing",
        "1-Click WhatsApp Ordering"
      ],
      update_existing_tenants: false
    });
    setNewFeatureText("");
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || "",
      code: plan.code || "",
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
      max_branches: plan.max_branches || 1,
      max_rooms: plan.max_rooms || 15,
      max_staff_users: plan.max_staff_users || 5,
      description: plan.description || "",
      badge: plan.badge || "",
      is_active: plan.is_active !== false,
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      update_existing_tenants: false
    });
    setNewFeatureText("");
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, newFeatureText.trim()]
    }));
    setNewFeatureText("");
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Plan name is required!");
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        // Update existing plan
        await api.put(`/saas/admin/plans/${editingPlan.id}`, {
          name: formData.name,
          price_monthly: parseFloat(formData.price_monthly),
          price_yearly: parseFloat(formData.price_yearly),
          max_branches: parseInt(formData.max_branches),
          max_rooms: parseInt(formData.max_rooms),
          max_staff_users: parseInt(formData.max_staff_users),
          description: formData.description,
          badge: formData.badge,
          is_active: formData.is_active,
          features: formData.features,
          update_existing_tenants: formData.update_existing_tenants
        });
        toast.success(`Plan '${formData.name}' updated successfully!`);
      } else {
        // Create new plan
        await api.post("/saas/admin/plans", {
          name: formData.name,
          code: formData.code,
          price_monthly: parseFloat(formData.price_monthly),
          price_yearly: parseFloat(formData.price_yearly),
          max_branches: parseInt(formData.max_branches),
          max_rooms: parseInt(formData.max_rooms),
          max_staff_users: parseInt(formData.max_staff_users),
          description: formData.description,
          badge: formData.badge,
          is_active: formData.is_active,
          features: formData.features
        });
        toast.success(`New plan '${formData.name}' created!`);
      }

      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      console.error("Save plan failed", err);
      toast.error(err.response?.data?.detail || "Failed to save plan changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete the plan '${plan.name}'?`)) {
      return;
    }

    try {
      await api.delete(`/saas/admin/plans/${plan.id}`);
      toast.success(`Plan '${plan.name}' deleted.`);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete plan.");
    }
  };

  const togglePlanActive = async (plan) => {
    try {
      await api.put(`/saas/admin/plans/${plan.id}`, {
        is_active: !plan.is_active
      });
      toast.success(`Plan '${plan.name}' is now ${!plan.is_active ? 'Active' : 'Hidden'}.`);
      fetchPlans();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <CreditCard className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                SaaS Plan & Subscription Editor
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Configure subscription tiers, pricing, branch limits, and features. Changes instantly reflect on the public digital menu portal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlans}
              className="p-2.5 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
              title="Refresh plans"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Plan</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-amber-600 rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-500">Loading SaaS plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No SaaS Plans Configured</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Click the button above to create your first restaurant subscription tier.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              + Create Starter Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isHighlight = plan.badge && plan.badge.toLowerCase().includes("popular");

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg relative overflow-hidden ${
                    isHighlight 
                      ? "border-amber-400 shadow-md ring-1 ring-amber-400/30" 
                      : "border-gray-200 shadow-sm"
                  } ${!plan.is_active ? "opacity-60 bg-gray-50" : ""}`}
                >
                  {/* Top Badge */}
                  {plan.badge && (
                    <div className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 text-center">
                      ★ {plan.badge}
                    </div>
                  )}

                  <div className="p-6">
                    {/* Header: Name, Code & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-black text-gray-900">{plan.name}</h3>
                        <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                          Code: {plan.code}
                        </span>
                      </div>

                      <button
                        onClick={() => togglePlanActive(plan)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                          plan.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                        }`}
                        title="Click to toggle plan visibility"
                      >
                        {plan.is_active ? "🟢 Active" : "⚪ Inactive"}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 min-h-[32px] line-clamp-2">
                      {plan.description || "Comprehensive multi-branch digital menu and KOT solution."}
                    </p>

                    {/* Pricing */}
                    <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-gray-900">
                          ₹{plan.price_monthly?.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500"> / month</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-500 block">
                          ₹{plan.price_yearly?.toLocaleString()} / year
                        </span>
                      </div>
                    </div>

                    {/* Operational Limits */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-100 text-center mb-4">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Branches</span>
                        <span className="text-sm font-black text-gray-800">{plan.max_branches}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Tables/Rooms</span>
                        <span className="text-sm font-black text-gray-800">{plan.max_rooms}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Staff Users</span>
                        <span className="text-sm font-black text-gray-800">{plan.max_staff_users}</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-1.5 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Included Features ({plan.features?.length || 0})
                      </span>
                      {Array.isArray(plan.features) && plan.features.slice(0, 5).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="line-clamp-1">{feat}</span>
                        </div>
                      ))}
                      {plan.features?.length > 5 && (
                        <p className="text-[11px] text-amber-600 font-semibold pl-5">
                          + {plan.features.length - 5} more features...
                        </p>
                      )}
                    </div>

                    {/* Subscriber count */}
                    {plan.subscriber_count !== undefined && (
                      <div className="mt-3 text-[11px] text-gray-500 font-medium">
                        Active Subscribers: <strong className="text-gray-800">{plan.subscriber_count}</strong>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs py-2 px-3 rounded-xl border border-gray-200 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Edit Plan</span>
                    </button>

                    <button
                      onClick={() => handleDelete(plan)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Modal: Edit / Create SaaS Plan ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 relative my-8">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">
                      {editingPlan ? `Edit '${editingPlan.name}'` : "Create New SaaS Plan"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Configure plan pricing, limits, and customer-facing features.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
                
                {/* Plan Name & Code */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Plan Display Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Growth Plan"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Plan Code *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingPlan} // code is locked on edit
                      placeholder="e.g. growth"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500 font-mono disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Pricing: Monthly & Yearly */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Monthly Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.price_monthly}
                      onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Yearly Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.price_yearly}
                      onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>

                {/* Operational Limits */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Max Branches</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.max_branches}
                      onChange={(e) => setFormData({ ...formData, max_branches: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Max Tables / Rooms</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.max_rooms}
                      onChange={(e) => setFormData({ ...formData, max_rooms: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Max Staff Users</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.max_staff_users}
                      onChange={(e) => setFormData({ ...formData, max_staff_users: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Badge & Description */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Ribbon Badge (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Most Popular, Best Value"
                      value={formData.badge}
                      onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Status</label>
                    <select
                      value={formData.is_active ? "active" : "inactive"}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none font-semibold"
                    >
                      <option value="active">🟢 Active (Visible to public)</option>
                      <option value="inactive">⚪ Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Short Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of who this plan is tailored for..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Interactive Feature List */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Features Included ({formData.features.length})
                  </label>
                  
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add a new feature bullet (e.g. Automated GST Invoicing)..."
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                      className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 focus:bg-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-gray-200">
                    {formData.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(idx)}
                          className="text-gray-400 hover:text-rose-500 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Update existing tenants checkbox (if editing) */}
                {editingPlan && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="update_tenants"
                      checked={formData.update_existing_tenants}
                      onChange={(e) => setFormData({ ...formData, update_existing_tenants: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="update_tenants" className="text-xs text-amber-900 font-semibold cursor-pointer">
                      Also update the monthly billing rate for all existing restaurants currently subscribed to this plan.
                    </label>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition active:scale-95 disabled:opacity-50"
                  >
                    {saving ? "Saving Changes..." : (editingPlan ? "Save Plan Changes" : "Create Plan")}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
