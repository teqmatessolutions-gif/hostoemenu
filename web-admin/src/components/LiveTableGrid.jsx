import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useBranch } from '../contexts/BranchContext';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { printTableBill, shareBillViaWhatsApp, connectBluetoothPrinter } from '../utils/printBill';
import { 
  UtensilsCrossed, Users, Receipt, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, X, CreditCard, DollarSign, 
  ChevronDown, ChevronUp, Search, QrCode, Sparkles, Printer, ExternalLink, Calendar,
  Plus, Bluetooth, Send, FileText } from 'lucide-react';

export default function LiveTableGrid({ onNavigateToOrder }) {
  const { activeBranchId, activeBranch, branches } = useBranch();
  const [data, setData] = useState({ tables: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'Vacant', 'Occupied', 'Waiting for Bill'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTableId, setExpandedTableId] = useState(null);
  
  // Settle Bill Modal state
  const [settleModalTable, setSettleModalTable] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSettling, setIsSettling] = useState(false);
  const [customerWhatsApp, setCustomerWhatsApp] = useState('');
  const [bluetoothPrinterName, setBluetoothPrinterName] = useState('');

  // QR Modal state
  const [qrModalTable, setQrModalTable] = useState(null);

  // Admin Reservation Modal state
  const [isAdminReserveOpen, setIsAdminReserveOpen] = useState(false);
  const [adminReserveTableId, setAdminReserveTableId] = useState('');
  const [adminReserveSubmitting, setAdminReserveSubmitting] = useState(false);
  const [adminReserveForm, setAdminReserveForm] = useState({
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    guest_count: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:30',
    special_notes: ''
  });

  const handleSeatReservedGuests = async (resId) => {
    try {
      const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
      const res = await api.post(`/table-reservations/${resId}/seat`, {}, { headers });
      toast.success(res.data?.message || 'Guests seated successfully!');
      fetchLiveStatus(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to seat guest');
    }
  };

  const handleCancelReservation = async (resId) => {
    if (!window.confirm("Are you sure you want to cancel this reservation?")) return;
    try {
      const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
      await api.post(`/table-reservations/${resId}/cancel`, {}, { headers });
      toast.success('Reservation cancelled and table made Available.');
      fetchLiveStatus(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel reservation');
    }
  };

  const handleAdminReserveSubmit = async (e) => {
    e.preventDefault();
    if (!adminReserveForm.guest_name.trim() || !adminReserveForm.guest_phone.trim()) {
      toast.error('Please enter guest name and phone number');
      return;
    }
    try {
      setAdminReserveSubmitting(true);
      const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
      const payload = {
        branch_id: branchId,
        table_id: adminReserveTableId ? parseInt(adminReserveTableId) : undefined,
        guest_name: adminReserveForm.guest_name.trim(),
        guest_phone: adminReserveForm.guest_phone.trim(),
        guest_email: adminReserveForm.guest_email.trim() || undefined,
        guest_count: parseInt(adminReserveForm.guest_count) || 2,
        reservation_date: adminReserveForm.reservation_date,
        reservation_time: adminReserveForm.reservation_time,
        special_notes: adminReserveForm.special_notes.trim() || undefined
      };
      await api.post('/table-reservations', payload, { headers });
      toast.success('Table reserved successfully!');
      setIsAdminReserveOpen(false);
      setAdminReserveForm({
        guest_name: '',
        guest_phone: '',
        guest_email: '',
        guest_count: 2,
        reservation_date: new Date().toISOString().split('T')[0],
        reservation_time: '19:30',
        special_notes: ''
      });
      fetchLiveStatus(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create reservation');
    } finally {
      setAdminReserveSubmitting(false);
    }
  };

  const resolvedBranchId = activeBranch?.id || (activeBranchId !== 'all' ? activeBranchId : null) || (branches.length > 0 ? branches[0].id : 2);
  const branchId = resolvedBranchId ? parseInt(resolvedBranchId) : null;

  const fetchLiveStatus = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
      const res = await api.get('/restaurant-tables/live-status', { headers });
      setData(res.data || { tables: [], summary: {} });
    } catch (err) {
      console.error('Failed to fetch live table status:', err);
      if (!isSilent) toast.error('Could not refresh live floor data');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchLiveStatus();
    // Auto-sync live floor every 10 seconds
    const interval = setInterval(() => {
      fetchLiveStatus(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus]);

  const handleUpdateStatus = async (tableId, newStatus, settleOrders = false) => {
    try {
      const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
      await api.post(`/restaurant-tables/${tableId}/status`, {
        status: newStatus,
        settle_orders: settleOrders
      }, { headers });
      toast.success(`Table status updated to ${newStatus}`);
      fetchLiveStatus(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleSettleBill = async () => {
    if (!settleModalTable) return;
    try {
      setIsSettling(true);
      const headers = branchId ? { 'X-Branch-ID': branchId.toString() } : {};
      const res = await api.post(`/restaurant-tables/${settleModalTable.id}/settle`, {
        payment_method: paymentMethod
      }, { headers });
      toast.success(res.data?.message || `Table ${settleModalTable.table_number} bill settled!`);
      setSettleModalTable(null);
      fetchLiveStatus(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to settle bill');
    } finally {
      setIsSettling(false);
    }
  };

  const getCustomerMenuBase = () => {
    const origin = window.location.origin;
    if (origin.includes(':3000')) {
      return origin.replace(':3000', ':3002');
    }
    return origin;
  };

  const getTableUrl = (table) => {
    return `${getCustomerMenuBase()}/#/branch/${table.branch_id || branchId}/table/${table.id}`;
  };

  const filteredTables = (data.tables || []).filter(table => {
    if (filter !== 'all') {
      if (filter === 'Vacant' && table.status !== 'Vacant') return false;
      if (filter === 'Occupied' && table.status !== 'Occupied') return false;
      if (filter === 'Waiting for Bill' && table.status !== 'Waiting for Bill') return false;
      if (filter === 'Reserved' && table.status !== 'Reserved') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = (table.table_number || '').toLowerCase().includes(q);
      const matchGuest = (table.guest_name || '').toLowerCase().includes(q);
      return matchNum || matchGuest;
    }
    return true;
  });

  const formatDuration = (isoString) => {
    if (!isoString) return '';
    try {
      const seated = new Date(isoString);
      const diffMins = Math.floor((new Date() - seated) / 60000);
      if (diffMins < 1) return 'Just seated';
      if (diffMins < 60) return `${diffMins}m ago`;
      const hrs = Math.floor(diffMins / 60);
      const rem = diffMins % 60;
      return `${hrs}h ${rem}m ago`;
    } catch (e) {
      return '';
    }
  };

  const summary = data.summary || {
    total_tables: 0,
    vacant: 0,
    occupied: 0,
    waiting_for_bill: 0,
    total_active_sales: 0
  };

  return (
    <div className="space-y-6">
      {/* ── Summary & Floor Status Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Tables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Tables</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">{summary.total_tables || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        {/* Vacant Tables */}
        <div 
          onClick={() => setFilter(filter === 'Vacant' ? 'all' : 'Vacant')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all shadow-sm flex items-center justify-between ${
            filter === 'Vacant' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300' : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">🟢 Vacant / Available</span>
            <span className="text-2xl font-black text-emerald-700 mt-0.5 block">{summary.vacant || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Occupied Tables */}
        <div 
          onClick={() => setFilter(filter === 'Occupied' ? 'all' : 'Occupied')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all shadow-sm flex items-center justify-between ${
            filter === 'Occupied' ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300' : 'bg-white border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block">🔴 Occupied (Dining)</span>
            <span className="text-2xl font-black text-rose-700 mt-0.5 block">{summary.occupied || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Waiting for Bill */}
        <div 
          onClick={() => setFilter(filter === 'Waiting for Bill' ? 'all' : 'Waiting for Bill')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all shadow-sm flex items-center justify-between ${
            filter === 'Waiting for Bill' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300' : 'bg-white border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">🟡 Waiting for Bill</span>
            <span className="text-2xl font-black text-amber-700 mt-0.5 block">{summary.waiting_for_bill || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Reserved Tables */}
        <div 
          onClick={() => setFilter(filter === 'Reserved' ? 'all' : 'Reserved')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all shadow-sm flex items-center justify-between ${
            filter === 'Reserved' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300' : 'bg-white border-slate-200/80 hover:border-purple-300'
          }`}
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">🟣 Reserved</span>
            <span className="text-2xl font-black text-purple-800 mt-0.5 block">{summary.reserved || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Active Dining Sales */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Active Floor Sales</span>
            <span className="text-2xl font-black text-white mt-0.5 block">₹{(summary.total_active_sales || 0).toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* ── Floor Controls Bar (Filters & Search) ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
              filter === 'all' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Tables ({summary.total_tables || 0})
          </button>
          <button
            onClick={() => setFilter('Vacant')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              filter === 'Vacant' ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Vacant ({summary.vacant || 0})
          </button>
          <button
            onClick={() => setFilter('Occupied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              filter === 'Occupied' ? 'bg-rose-600 text-white shadow' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Occupied ({summary.occupied || 0})
          </button>
          <button
            onClick={() => setFilter('Waiting for Bill')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              filter === 'Waiting for Bill' ? 'bg-amber-600 text-white shadow' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Waiting for Bill ({summary.waiting_for_bill || 0})
          </button>
          <button
            onClick={() => setFilter('Reserved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
              filter === 'Reserved' ? 'bg-purple-700 text-white shadow' : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            Reserved ({summary.reserved || 0})
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table or guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>
          
          <button
            onClick={() => {
              setAdminReserveTableId('');
              setIsAdminReserveOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl transition flex items-center gap-1.5 text-xs font-black shadow-sm active:scale-95"
            title="Create table reservation"
          >
            <Calendar className="w-4 h-4 text-purple-200" />
            <span className="hidden sm:inline">Take Reservation</span>
          </button>

          <button
            onClick={() => fetchLiveStatus(false)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold"
            title="Refresh floor preview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

      </div>

      {/* ── Table Grid ── */}
      {loading && filteredTables.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading live table floor status...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="font-extrabold text-slate-700 text-base">No tables found</h4>
          <p className="text-xs text-slate-400 mt-1">Try selecting a different filter or create tables under "Table & QR Codes".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTables.map((t) => {
            const isOccupied = t.status === 'Occupied';
            const isWaitingBill = t.status === 'Waiting for Bill';
            const isReserved = t.status === 'Reserved' || (Boolean(t.reservation?.is_active_now) && !isOccupied && !isWaitingBill);
            const hasUpcomingRes = Boolean(t.reservation) && !isReserved;
            const isVacant = t.status === 'Vacant' && !isReserved;
            const isExpanded = expandedTableId === t.id;

            return (
              <div
                key={t.id}
                className={`rounded-3xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md relative ${
                  isWaitingBill
                    ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-200/50'
                    : isOccupied
                    ? 'bg-rose-50/40 border-rose-300 ring-2 ring-rose-200/40'
                    : isReserved
                    ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-200/50'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900 tracking-tight">
                        Table {t.table_number}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        {t.seating_capacity}
                      </span>
                    </div>
                    {t.guest_name && (
                      <span className="text-[11px] font-bold text-slate-600 block truncate max-w-[140px] mt-0.5">
                        👤 {t.guest_name}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isVacant && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Vacant
                        </span>
                        {hasUpcomingRes && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-200 shadow-sm" title={`Reserved for ${t.reservation.guest_name} at ${t.reservation.time}`}>
                            <Clock className="w-3 h-3 text-purple-600" />
                            Res {t.reservation.time}
                          </span>
                        )}
                      </div>
                    )}
                    {isOccupied && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-rose-300 shadow-sm animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          Occupied
                        </span>
                        {Boolean(t.reservation) && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-200 shadow-sm" title={`Reserved for ${t.reservation.guest_name} at ${t.reservation.time}. Free table before then!`}>
                            <Clock className="w-3 h-3 text-purple-600" />
                            Res {t.reservation.time}
                          </span>
                        )}
                      </div>
                    )}
                    {isWaitingBill && (
                      <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-full border border-amber-500 shadow-sm">
                        <Receipt className="w-3 h-3 text-slate-950" />
                        Waiting Bill
                      </span>
                    )}
                    {isReserved && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[11px] font-black px-2.5 py-1 rounded-full border border-purple-300 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                        Reserved
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Bill & Details */}
                <div className="p-4 flex-1">
                  {isReserved ? (
                    <div>
                      <div className="bg-white rounded-2xl p-3.5 border border-purple-200/90 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t.reservation?.time || 'Booked Slot'}
                          </span>
                          <span className="text-[10px] font-extrabold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            👥 {t.reservation?.guest_count || t.seating_capacity} Guests
                          </span>
                        </div>
                        <div className="pt-1">
                          <p className="font-black text-slate-900 text-sm">
                            👤 {t.reservation?.guest_name || t.guest_name || 'Guest'}
                          </p>
                          {t.reservation?.guest_phone && (
                            <p className="text-[11px] text-slate-500 font-medium">
                              📞 {t.reservation.guest_phone}
                            </p>
                          )}
                          {t.reservation?.notes && (
                            <p className="text-[11px] text-purple-900 bg-purple-50 p-2 rounded-xl border border-purple-100 mt-1 italic font-medium">
                              "{t.reservation.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (isOccupied || isWaitingBill) ? (
                    <div>
                      {/* Live Bill Highlight */}
                      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-inner mb-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Current Guest Bill</span>
                          {t.seated_at && (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(t.seated_at)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-2xl font-black text-slate-900 tracking-tight">
                            ₹{t.current_bill_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {t.items?.length || 0} items
                          </span>
                        </div>
                      </div>

                      {/* Items Preview / Collapsible */}
                      {t.items && t.items.length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedTableId(isExpanded ? null : t.id)}
                            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 mb-1.5 transition"
                          >
                            <span>Ordered Dishes ({t.items.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          
                          {isExpanded && (
                            <div className="bg-white/80 rounded-xl p-2.5 border border-slate-200 text-xs space-y-1 mb-2 max-h-36 overflow-y-auto">
                              {t.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-center text-slate-700 text-[11px]">
                                  <span className="truncate pr-2">{it.name}</span>
                                  <span className="font-black text-slate-900">×{it.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2.5 text-center">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1 text-base font-bold">
                        🍽️
                      </div>
                      <p className="text-xs font-bold text-slate-700">Table is Vacant</p>
                      <p className="text-[10px] text-slate-400">Ready for walk-in guest</p>

                      {hasUpcomingRes && (
                        <div className="mt-2.5 text-left bg-gradient-to-br from-purple-50 via-white to-indigo-50/50 rounded-2xl p-3 border border-purple-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-black text-purple-800 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              Reserved at {t.reservation.time}
                            </span>
                            <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                              👥 {t.reservation.guest_count} Guests
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-slate-900 truncate">
                              👤 {t.reservation.guest_name}
                            </p>
                            {t.reservation.minutes_until && t.reservation.minutes_until > 0 && t.reservation.minutes_until < 300 && (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Free for ~{Math.floor(t.reservation.minutes_until / 60)}h {t.reservation.minutes_until % 60}m
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-purple-900 font-semibold bg-white/80 p-1.5 rounded-lg border border-purple-100">
                            ✨ You can seat walk-in guests now until {t.reservation.time}!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 bg-white/70 border-t border-slate-100 flex items-center gap-1.5">
                  {isReserved ? (
                    <>
                      <button
                        onClick={() => t.reservation ? handleSeatReservedGuests(t.reservation.id) : handleUpdateStatus(t.id, 'Occupied')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
                        title="Seat the arriving reserved guest"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Seat Guests</span>
                      </button>

                      {t.reservation && (
                        <button
                          onClick={() => handleCancelReservation(t.reservation.id)}
                          className="bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold text-xs py-2 px-2.5 rounded-xl transition"
                          title="Cancel Reservation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => setQrModalTable(t)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="View Table QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (isOccupied || isWaitingBill) ? (
                    <>
                      {isOccupied && (
                        <button
                          onClick={() => handleUpdateStatus(t.id, 'Waiting for Bill')}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
                          title="Mark guest ready to receive bill"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Request Bill</span>
                        </button>
                      )}

                      <button
                        onClick={() => { setSettleModalTable(t); setCustomerWhatsApp(t.reservation?.guest_phone || t.guest_phone || ''); }}
                        className={`flex-1 font-black text-xs py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95 ${
                          isWaitingBill 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        <span>Settle Bill</span>
                      </button>

                      <button
                        onClick={() => onNavigateToOrder && onNavigateToOrder(t.id)}
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition flex items-center gap-1 font-bold text-xs"
                        title="Add Food Dishes to Table Order"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Order</span>
                      </button>

                      <button
                        onClick={() => printTableBill({ table: t, branch: activeBranch, isPaid: false })}
                        className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition flex items-center gap-1 font-bold text-xs"
                        title="Print Live Bill Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Bill</span>
                      </button>

                      <button
                        onClick={() => setQrModalTable(t)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="View Table QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (hasUpcomingRes) {
                            toast(`⚠️ Seating walk-in guest on Table ${t.table_number}. Please ensure table is free before ${t.reservation.time} for ${t.reservation.guest_name}!`, { icon: '⏰', duration: 5000 });
                          }
                          handleUpdateStatus(t.id, 'Occupied');
                          if (onNavigateToOrder) onNavigateToOrder(t.id);
                        }}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
                        title={hasUpcomingRes ? `Seat walk-in guest now (Table reserved at ${t.reservation.time})` : "Seat dining guests and take order"}
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Seat Walk-in</span>
                      </button>

                      {hasUpcomingRes ? (
                        <>
                          <button
                            onClick={() => handleSeatReservedGuests(t.reservation.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-2.5 rounded-xl transition flex items-center gap-1 shadow-sm active:scale-95"
                            title={`Seat reserved guest (${t.reservation.guest_name}) if arrived early`}
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Seat {t.reservation.guest_name}</span>
                          </button>
                          <button
                            onClick={() => handleCancelReservation(t.reservation.id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition"
                            title="Cancel / Release Reservation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setAdminReserveTableId(t.id.toString());
                            setIsAdminReserveOpen(true);
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs py-2 px-2.5 rounded-xl border border-purple-200 transition flex items-center gap-1"
                          title="Reserve Table"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reserve</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => setQrModalTable(t)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-2.5 rounded-xl transition flex items-center gap-1"
                        title="View Table QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-500" />
                        <span>QR</span>
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Settle Bill Modal ── */}
      {settleModalTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Settle Table {settleModalTable.table_number} Bill</h3>
                  <p className="text-[11px] text-slate-500">{settleModalTable.guest_name ? `Guest: ${settleModalTable.guest_name}` : 'Dine-In Guest'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSettleModalTable(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary */}
            <div className="my-5 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Items Ordered:</span>
                <span className="font-bold">{settleModalTable.items?.length || 0} dishes</span>
              </div>
              {settleModalTable.items && settleModalTable.items.length > 0 && (
                <div className="py-2 border-t border-b border-slate-200 space-y-1 max-h-32 overflow-y-auto">
                  {settleModalTable.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                      <span>{it.name}</span>
                      <span className="font-bold">×{it.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-slate-800">Total Payable Amount:</span>
                <span className="text-2xl font-black text-emerald-600">
                  ₹{settleModalTable.current_bill_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-700 block mb-2">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: '💵 Cash' },
                  { id: 'upi', label: '📱 UPI / QR' },
                  { id: 'card', label: '💳 Card' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition ${
                      paymentMethod === m.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp Digital Bill Share */}
            <div className="mb-4 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-sm">💬</span> Share Bill on WhatsApp
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Paperless Receipt
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="Customer WhatsApp Number"
                    value={customerWhatsApp}
                    onChange={(e) => setCustomerWhatsApp(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    shareBillViaWhatsApp({
                      table: settleModalTable,
                      branch: activeBranch,
                      paymentMethod,
                      isPaid: false,
                      phone: customerWhatsApp
                    });
                    toast.success('Opening WhatsApp with bill receipt!');
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-sm transition active:scale-95"
                  title="Send instant WhatsApp Bill to customer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>

            {/* Thermal Printer & Bluetooth Device Helper */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={async () => {
                  const res = await connectBluetoothPrinter();
                  if (res && res.success) {
                    setBluetoothPrinterName(res.name);
                    toast.success(`Paired with ${res.name}`);
                  } else if (res && res.message) {
                    alert(res.message);
                  }
                }}
                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1.5 border border-indigo-200 shadow-sm"
                title="Connect Bluetooth or wireless POS thermal printer"
              >
                <Bluetooth className="w-3.5 h-3.5 text-indigo-600" />
                <span className="truncate">{bluetoothPrinterName ? `Paired: ${bluetoothPrinterName}` : 'Bluetooth / Thermal Printer'}</span>
              </button>

              <button
                type="button"
                onClick={() => printTableBill({ table: settleModalTable, branch: activeBranch, paymentMethod, isPaid: false })}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition flex items-center gap-1 border border-slate-300 shadow-sm"
                title="Save Bill as PDF file"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Save PDF</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printTableBill({ table: settleModalTable, branch: activeBranch, paymentMethod, isPaid: false })}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pre-Bill Slip</span>
                </button>
                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() => {
                    printTableBill({ table: settleModalTable, branch: activeBranch, paymentMethod, isPaid: true });
                    if (customerWhatsApp.trim()) {
                      shareBillViaWhatsApp({
                        table: settleModalTable,
                        branch: activeBranch,
                        paymentMethod,
                        isPaid: true,
                        phone: customerWhatsApp
                      });
                    }
                    handleSettleBill();
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print & Settle</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettleModalTable(null)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSettling}
                  onClick={handleSettleBill}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md active:scale-95 flex items-center justify-center gap-1.5"
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
            </div>
          </div>
        </div>
      )}

      {/* ── Table QR Stand Preview Modal ── */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-900 text-center">
            <div className="flex justify-between items-center pb-2 mb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Table {qrModalTable.table_number} QR Code</h3>
              <button onClick={() => setQrModalTable(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center mb-4">
              <QRCodeSVG
                value={getTableUrl(qrModalTable)}
                size={180}
                level="H"
                includeMargin={true}
              />
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider mt-3">
                Table {qrModalTable.table_number} Stand
              </span>
              <span className="text-xs font-extrabold text-slate-800 mt-0.5 flex items-center justify-center gap-1">
                📍 {activeBranch?.name || "Main Dining"}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">Scan to View Menu & Order</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getTableUrl(qrModalTable));
                  toast.success('Table ordering URL copied!');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                Copy Link
              </button>
              <button
                onClick={() => window.open(getTableUrl(qrModalTable), '_blank')}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open eMenu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Take Reservation Modal ── */}
      {isAdminReserveOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {adminReserveTableId ? `Reserve Table ${data.tables?.find(t => t.id.toString() === adminReserveTableId)?.table_number || adminReserveTableId}` : 'Take Table Reservation'}
                  </h3>
                  <p className="text-xs text-slate-500">Hold dining table for arriving guests</p>
                </div>
              </div>
              <button onClick={() => setIsAdminReserveOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminReserveSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={adminReserveForm.guest_name}
                    onChange={(e) => setAdminReserveForm({ ...adminReserveForm, guest_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={adminReserveForm.guest_phone}
                    onChange={(e) => setAdminReserveForm({ ...adminReserveForm, guest_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guests (Seats)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={adminReserveForm.guest_count}
                    onChange={(e) => setAdminReserveForm({ ...adminReserveForm, guest_count: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={adminReserveForm.reservation_date}
                    onChange={(e) => setAdminReserveForm({ ...adminReserveForm, reservation_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={adminReserveForm.reservation_time}
                    onChange={(e) => setAdminReserveForm({ ...adminReserveForm, reservation_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dining Table</label>
                  <select
                    value={adminReserveTableId}
                    onChange={(e) => setAdminReserveTableId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="">Auto-Assign Best Available Table</option>
                    {(data.tables || []).map(t => (
                      <option key={t.id} value={t.id.toString()}>
                        Table {t.table_number} ({t.status}) - {t.seating_capacity || 4} Seats
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Special Notes / Requests</label>
                  <input
                    type="text"
                    placeholder="e.g. Window side, birthday celebration"
                    value={adminReserveForm.special_notes}
                    onChange={(e) => setAdminReserveForm({ ...adminReserveForm, special_notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdminReserveOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminReserveSubmitting}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {adminReserveSubmitting ? 'Holding Table...' : 'Confirm Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

