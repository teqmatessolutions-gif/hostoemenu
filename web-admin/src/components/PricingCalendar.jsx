import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Globe,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Plus,
  X,
  Sparkles,
  Check,
  TrendingUp,
  Tag,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../services/api';
import { useBranch } from '../contexts/BranchContext';

const PricingCalendar = ({ rooms = [], roomTypeObjects = [], onRefreshRoomTypes }) => {
  const { activeBranchId, activeBranch } = useBranch();

  // --- State ---
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewDays, setViewDays] = useState(21); // Default to 21 Days matching reference
  const [showOtaRates, setShowOtaRates] = useState(true);
  const [calendarRules, setCalendarRules] = useState([]);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isSyncingAiosell, setIsSyncingAiosell] = useState(false);

  // Modals state
  const [showLongWeekendModal, setShowLongWeekendModal] = useState(false);
  const [selectedRoomTypeForEdit, setSelectedRoomTypeForEdit] = useState(null);
  const [selectedDateCell, setSelectedDateCell] = useState(null);

  // Rule Form state
  const [ruleForm, setRuleForm] = useState({
    start_date: '',
    end_date: '',
    day_type: 'LONG_WEEKEND',
    description: ''
  });
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  // Room Type Rates Edit Form state
  const [rateEditForm, setRateEditForm] = useState({
    base_price: '',
    weekend_price: '',
    long_weekend_price: '',
    holiday_price: ''
  });
  const [isSavingRates, setIsSavingRates] = useState(false);

  // --- Fetch Calendar Rules ---
  const fetchCalendarRules = useCallback(async () => {
    setIsLoadingRules(true);
    try {
      const res = await API.get('/calendar');
      setCalendarRules(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pricing calendar rules:', err);
    } finally {
      setIsLoadingRules(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    fetchCalendarRules();
  }, [fetchCalendarRules, activeBranchId]);

  // --- Manual Aiosell Sync ---
  const handleSyncAiosell = async () => {
    setIsSyncingAiosell(true);
    try {
      const branchQuery = activeBranchId && activeBranchId !== 'all' ? `?branch_id=${activeBranchId}` : '';
      await API.post(`/channel-manager/sync${branchQuery}`);
      toast.success(`Live Aiosell rate push synchronized for ${activeBranch?.name || 'branch'}!`);
    } catch (err) {
      console.error('Aiosell sync error:', err);
      toast.error('Triggered channel sync (check backend logs for details)');
    } finally {
      setIsSyncingAiosell(false);
    }
  };

  // --- Generate Date Range ---
  const dateRange = useMemo(() => {
    const list = [];
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);

    for (let i = 0; i < viewDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      list.push(d);
    }
    return list;
  }, [currentDate, viewDays]);

  const formatDateYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || val === '') return '0';
    return Number(val).toLocaleString('en-IN');
  };

  // Check if a given date matches any calendar rule
  const getRuleForDate = useCallback((dateObj) => {
    const ymd = formatDateYMD(dateObj);
    // Find active rule (Priority: HOLIDAY > LONG_WEEKEND > WEEKEND > WEEKDAY)
    const matches = calendarRules.filter(
      (r) => r.start_date <= ymd && r.end_date >= ymd
    );
    if (!matches.length) return null;

    const priority = { HOLIDAY: 0, LONG_WEEKEND: 1, WEEKEND: 2, WEEKDAY: 3 };
    matches.sort((a, b) => (priority[a.day_type] ?? 99) - (priority[b.day_type] ?? 99));
    return matches[0];
  }, [calendarRules]);

  // Determine rate info for a room type on a given date
  const calculateRateForDate = useCallback((roomType, dateObj) => {
    if (!roomType) return { price: 0, type: 'BASE', label: 'Base' };

    const rule = getRuleForDate(dateObj);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const isWeekendNight = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday

    if (rule?.day_type === 'HOLIDAY' && roomType.holiday_price) {
      return {
        price: roomType.holiday_price,
        type: 'HOLIDAY',
        label: 'Holiday',
        badge: rule.description || 'Holiday',
        color: 'rose'
      };
    }

    if (rule?.day_type === 'LONG_WEEKEND' && roomType.long_weekend_price) {
      return {
        price: roomType.long_weekend_price,
        type: 'LONG_WEEKEND',
        label: 'Long Wknd',
        badge: rule.description || 'Long Weekend',
        color: 'amber'
      };
    }

    if (rule?.day_type === 'WEEKEND') {
      const price = roomType.weekend_price || roomType.base_price || 0;
      return {
        price,
        type: 'WEEKEND',
        label: 'Weekend',
        badge: 'Weekend',
        color: 'purple'
      };
    }

    if (rule?.day_type === 'WEEKDAY') {
      return {
        price: roomType.base_price || 0,
        type: 'BASE',
        label: 'Base',
        badge: null,
        color: 'blue'
      };
    }

    // Default Fallback
    if (isWeekendNight && roomType.weekend_price) {
      return {
        price: roomType.weekend_price,
        type: 'WEEKEND',
        label: 'Weekend',
        badge: 'Weekend',
        color: 'purple'
      };
    }

    return {
      price: roomType.base_price || 0,
      type: 'BASE',
      label: 'Base',
      badge: null,
      color: 'blue'
    };
  }, [getRuleForDate]);

  // Display room category cards mapping (Category-wise pricing instead of individual room-wise)
  const displayItems = useMemo(() => {
    let categories = roomTypeObjects;

    if (!categories || categories.length === 0) {
      // Fallback: extract unique room types from rooms
      const map = new Map();
      rooms.forEach((r) => {
        const rt = r.room_type || {};
        const id = rt.id || r.room_type_id || r.type || r.number;
        if (!map.has(id)) {
          map.set(id, {
            id,
            name: rt.name || r.type || `Category ${id}`,
            base_price: rt.base_price || r.price || 0,
            weekend_price: rt.weekend_price,
            long_weekend_price: rt.long_weekend_price,
            holiday_price: rt.holiday_price,
            rate_plans: rt.rate_plans || [],
            room_count: 1
          });
        } else {
          map.get(id).room_count += 1;
        }
      });
      categories = Array.from(map.values());
    }

    return categories.map((rt) => {
      // Count physical rooms in this category
      const matchingRooms = rooms.filter(
        (r) => r.room_type_id === rt.id || r.room_type?.id === rt.id
      );
      const roomCount = matchingRooms.length || rt.room_count || rt.total_inventory || 0;
      const roomNumbers = matchingRooms.map((r) => r.number).slice(0, 3).join(', ');

      return {
        roomTypeId: rt.id,
        roomType: rt,
        displayName: rt.name || 'Standard Room',
        roomCount,
        roomNumbersPreview: roomNumbers ? `${roomNumbers}${matchingRooms.length > 3 ? '...' : ''}` : '',
        basePrice: rt.base_price || 0,
        weekendPrice: rt.weekend_price || rt.base_price || 0,
        longWeekendPrice: rt.long_weekend_price || rt.base_price || 0,
        holidayPrice: rt.holiday_price || rt.base_price || 0,
        ratePlans: rt.rate_plans || []
      };
    });
  }, [rooms, roomTypeObjects]);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  // Open Room Type Edit Modal
  const openEditRoomType = (item) => {
    const rt = item.roomType;
    setSelectedRoomTypeForEdit({
      ...item,
      roomType: rt
    });
    setRateEditForm({
      base_price: rt.base_price || '',
      weekend_price: rt.weekend_price || '',
      long_weekend_price: rt.long_weekend_price || '',
      holiday_price: rt.holiday_price || ''
    });
  };

  // Submit Room Type Rates
  const handleSaveRoomTypeRates = async (e) => {
    e.preventDefault();
    if (!selectedRoomTypeForEdit) return;

    setIsSavingRates(true);
    try {
      const formData = new FormData();
      formData.append('base_price', rateEditForm.base_price || '0');
      if (rateEditForm.weekend_price) formData.append('weekend_price', rateEditForm.weekend_price);
      if (rateEditForm.long_weekend_price) formData.append('long_weekend_price', rateEditForm.long_weekend_price);
      if (rateEditForm.holiday_price) formData.append('holiday_price', rateEditForm.holiday_price);

      await API.put(`/rooms/types/${selectedRoomTypeForEdit.roomTypeId}`, formData);
      toast.success('Room rates updated and synced to channel manager!');

      if (onRefreshRoomTypes) {
        onRefreshRoomTypes();
      }
      setSelectedRoomTypeForEdit(null);
    } catch (err) {
      console.error('Failed to update room rates:', err);
      toast.error(err.response?.data?.detail || 'Failed to update rates');
    } finally {
      setIsSavingRates(false);
    }
  };

  // Add Calendar Rule
  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!ruleForm.start_date || !ruleForm.end_date) {
      toast.error('Please enter start and end dates');
      return;
    }
    if (ruleForm.start_date > ruleForm.end_date) {
      toast.error('End date cannot be before start date');
      return;
    }

    setIsSubmittingRule(true);
    try {
      await API.post('/calendar/', {
        start_date: ruleForm.start_date,
        end_date: ruleForm.end_date,
        day_type: ruleForm.day_type,
        description: ruleForm.description
      });
      toast.success('Pricing rule added & Aiosell rate push scheduled!');
      setRuleForm({
        start_date: '',
        end_date: '',
        day_type: 'LONG_WEEKEND',
        description: ''
      });
      fetchCalendarRules();
    } catch (err) {
      console.error('Failed to add calendar rule:', err);
      toast.error(err.response?.data?.detail || 'Failed to add rule');
    } finally {
      setIsSubmittingRule(false);
    }
  };

  // Delete Calendar Rule
  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this pricing rule? Standard rates will be restored.')) return;
    try {
      await API.delete(`/calendar/${id}`);
      toast.success('Pricing rule removed');
      fetchCalendarRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
      toast.error('Failed to delete rule');
    }
  };

  // Click on date cell
  const handleCellClick = (item, dateObj) => {
    setSelectedDateCell({
      item,
      date: dateObj,
      formattedDate: formatDateYMD(dateObj),
      rateInfo: calculateRateForDate(item.roomType, dateObj)
    });
    openEditRoomType(item);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header Toolbar Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 transition-all">
        {/* Left: Title & Subtitle */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0 mt-0.5">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Room Pricing & Rates Calendar
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Live Channel Sync
              </span>
              {activeBranch?.name && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  {activeBranch.name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Manage Base rates, Weekend pricing (Fri & Sat), and Long Weekend rates. Prices auto-sync to Aiosell.
            </p>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              onClick={handlePrev}
              title="Previous Week"
              className="p-2 hover:bg-white text-slate-600 rounded-xl transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-white rounded-xl transition-all shadow-sm"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              title="Next Week"
              className="p-2 hover:bg-white text-slate-600 rounded-xl transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="date"
              value={formatDateYMD(currentDate)}
              onChange={(e) => {
                if (e.target.value) {
                  const parts = e.target.value.split('-');
                  setCurrentDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                }
              }}
              className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
            />
          </div>

          {/* Days Range Dropdown */}
          <div className="relative">
            <select
              value={viewDays}
              onChange={(e) => setViewDays(Number(e.target.value))}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-2xl px-4 py-2 pr-8 shadow-sm outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={21}>21 Days</option>
              <option value={30}>30 Days</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>

          {/* OTA Rates Toggle */}
          <button
            onClick={() => setShowOtaRates(!showOtaRates)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border shadow-sm ${
              showOtaRates
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-indigo-100'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>OTA Rates: {showOtaRates ? 'ON' : 'OFF'}</span>
          </button>

          {/* Set Long Weekend / Rates Button */}
          <button
            onClick={() => setShowLongWeekendModal(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-lg shadow-amber-200 transition-all flex items-center gap-2 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Set Long Weekend / Rates</span>
          </button>

          {/* Sync Aiosell Button */}
          <button
            onClick={handleSyncAiosell}
            disabled={isSyncingAiosell}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAiosell ? 'animate-spin' : ''}`} />
            <span>{isSyncingAiosell ? 'Syncing...' : 'Sync Aiosell'}</span>
          </button>
        </div>
      </div>

      {/* 2. Room Summary Cards (Horizontal Scroll) */}
      <div className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin">
        {displayItems.map((item, idx) => (
          <div
            key={`card-${item.roomTypeId}-${idx}`}
            className="min-w-[280px] max-w-[320px] bg-white rounded-3xl p-5 border border-slate-100 shadow-md hover:shadow-xl transition-all relative flex-shrink-0 flex flex-col justify-between group"
          >
            <div>
              {/* Card Header: Category Badge + Edit Pencil */}
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100/80 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-indigo-500" />
                  {item.roomCount ? `${item.roomCount} ROOMS` : 'ROOM CATEGORY'}
                </span>
                <button
                  onClick={() => openEditRoomType(item)}
                  title="Edit Category Pricing"
                  className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Category Name */}
              <h3 className="font-black text-slate-800 text-sm tracking-tight truncate mb-1" title={item.displayName}>
                {item.displayName}
              </h3>
              {item.roomNumbersPreview ? (
                <p className="text-[10px] text-slate-400 font-bold mb-3 truncate">
                  Rooms: {item.roomNumbersPreview}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-bold mb-3">
                  Room Category
                </p>
              )}

              {/* 3 Pricing Pills */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-50/70 border border-blue-100/60 rounded-2xl p-2 text-center">
                  <div className="text-[9px] font-black uppercase text-blue-500 tracking-wider">Base</div>
                  <div className="text-xs font-extrabold text-blue-800 mt-0.5">
                    ₹{formatCurrency(item.basePrice)}
                  </div>
                </div>
                <div className="bg-purple-50/70 border border-purple-100/60 rounded-2xl p-2 text-center">
                  <div className="text-[9px] font-black uppercase text-purple-500 tracking-wider">Weekend</div>
                  <div className="text-xs font-extrabold text-purple-800 mt-0.5">
                    ₹{formatCurrency(item.weekendPrice)}
                  </div>
                </div>
                <div className="bg-amber-50/70 border border-amber-100/60 rounded-2xl p-2 text-center">
                  <div className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Long Wknd</div>
                  <div className="text-xs font-extrabold text-amber-800 mt-0.5">
                    ₹{formatCurrency(item.longWeekendPrice)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: OTA Plans */}
            <div className="pt-2 border-t border-slate-50 flex items-center gap-1.5 text-[11px] text-slate-400 font-bold">
              <Globe className="w-3 h-3 text-slate-300" />
              <span className="text-slate-500">OTA Plans:</span>
              <div className="flex items-center gap-1 overflow-hidden truncate">
                {item.ratePlans && item.ratePlans.length > 0 ? (
                  item.ratePlans.map((p, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-bold"
                    >
                      {p.name?.charAt(0) || 'P'} ({p.channel_manager_id || p.id})
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-[10px] italic">Auto Synced</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Legend Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 px-6 py-3 shadow-sm flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4">
        <div className="flex items-center flex-wrap gap-4">
          <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="font-bold text-slate-600">Base Price (Sun - Thu)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="font-bold text-slate-600">Weekend Price (Fri & Sat nights)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="font-bold text-slate-600">Long Weekend / Special Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-slate-600">Custom Rate Override</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-800"></span>
            <span className="font-bold text-slate-600">OTA (Aiosell Sending Rate)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
          <span>💡</span>
          <span>Click any cell to update date price</span>
        </div>
      </div>

      {/* 4. The Rates & Pricing Grid Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto max-h-[720px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-max">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50/80 sticky top-0 z-30 backdrop-blur-md">
                {/* Sticky Left Corner Header */}
                <th className="py-4 px-5 text-xs font-black text-slate-500 uppercase tracking-wider sticky left-0 z-40 bg-slate-50 border-b border-r border-slate-200 min-w-[240px] w-[240px] shadow-[2px_0_6px_rgba(0,0,0,0.03)]">
                  ROOM CATEGORY
                </th>

                {/* Date Columns */}
                {dateRange.map((d, dIdx) => {
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                  const isWeekendDay = d.getDay() === 5 || d.getDay() === 6;
                  const rule = getRuleForDate(d);
                  const isTodayDate =
                    d.toDateString() === new Date().toDateString();

                  return (
                    <th
                      key={dIdx}
                      className={`py-3 px-3 text-center border-b border-r border-slate-100 min-w-[115px] ${
                        isTodayDate ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {dayName}
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {dateStr}
                      </div>

                      {/* Header Badges */}
                      {rule?.day_type === 'HOLIDAY' ? (
                        <span className="mt-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded-full uppercase tracking-wider inline-block">
                          Holiday
                        </span>
                      ) : rule?.day_type === 'LONG_WEEKEND' ? (
                        <span className="mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-full uppercase tracking-wider inline-block">
                          Long Wknd
                        </span>
                      ) : isWeekendDay ? (
                        <span className="mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black rounded-full uppercase tracking-wider inline-block">
                          Weekend
                        </span>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {displayItems.map((item, rIdx) => (
                <tr
                  key={`row-${item.roomTypeId}-${rIdx}`}
                  className="hover:bg-slate-50/40 transition-colors group"
                >
                  {/* Sticky Left Column: Room Category Details */}
                  <td className="py-4 px-5 sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 border-r border-slate-100 min-w-[240px] w-[240px] shadow-[2px_0_6px_rgba(0,0,0,0.03)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/60">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div
                          className="font-black text-slate-800 text-xs truncate max-w-[150px]"
                          title={item.displayName}
                        >
                          {item.displayName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold">
                            Base: ₹{formatCurrency(item.basePrice)}
                          </span>
                          {item.roomCount > 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                              {item.roomCount} {item.roomCount === 1 ? 'room' : 'rooms'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Date Grid Cells */}
                  {dateRange.map((d, cIdx) => {
                    const rate = calculateRateForDate(item.roomType, d);
                    const isTodayDate =
                      d.toDateString() === new Date().toDateString();

                    // Cell colors according to rate type
                    let cellBg = 'bg-blue-50/60 border-blue-200/70 text-blue-900';
                    let tagBg = 'bg-blue-200/60 text-blue-700';

                    if (rate.type === 'WEEKEND') {
                      cellBg = 'bg-purple-50/60 border-purple-200/70 text-purple-900';
                      tagBg = 'bg-purple-200/60 text-purple-700';
                    } else if (rate.type === 'LONG_WEEKEND') {
                      cellBg = 'bg-amber-50/70 border-amber-200/80 text-amber-900';
                      tagBg = 'bg-amber-200/70 text-amber-800';
                    } else if (rate.type === 'HOLIDAY') {
                      cellBg = 'bg-rose-50/70 border-rose-200/80 text-rose-900';
                      tagBg = 'bg-rose-200/70 text-rose-800';
                    }

                    return (
                      <td
                        key={cIdx}
                        onClick={() => handleCellClick(item, d)}
                        className={`py-3 px-2 border-r border-slate-100 text-center cursor-pointer transition-all hover:bg-indigo-50/40 relative ${
                          isTodayDate ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        {/* Primary Rate Box */}
                        <div
                          className={`rounded-2xl border p-2 shadow-sm transition-all hover:scale-105 hover:shadow-md ${cellBg}`}
                        >
                          <div className="font-black text-xs sm:text-sm tracking-tight">
                            ₹{formatCurrency(rate.price)}
                          </div>
                          <div
                            className={`text-[9px] font-black uppercase tracking-wider mt-0.5 rounded px-1.5 py-0.2 inline-block ${tagBg}`}
                          >
                            {rate.label}
                          </div>
                        </div>

                        {/* OTA Sending Rates Sub-cards */}
                        {showOtaRates && (
                          <div className="mt-1.5 space-y-1">
                            {item.ratePlans && item.ratePlans.length > 0 ? (
                              item.ratePlans.map((plan, pIndex) => {
                                const otaRate =
                                  plan.base_price && Number(plan.base_price) > 0
                                    ? plan.base_price
                                    : Number(rate.price) + Number(plan.price_offset || 0);

                                return (
                                  <div
                                    key={pIndex}
                                    className="bg-slate-100/90 border border-slate-200/80 rounded-xl px-1.5 py-1 text-[10px] font-bold text-slate-700 shadow-xs flex items-center justify-between"
                                  >
                                    <span className="text-[9px] font-black text-indigo-600">
                                      OTA ({plan.channel_manager_id || plan.id})
                                    </span>
                                    <span className="font-extrabold text-slate-800">
                                      ₹{formatCurrency(otaRate)}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="bg-slate-100/80 border border-slate-200/60 rounded-xl px-1.5 py-1 text-[10px] font-bold text-slate-600 shadow-xs flex items-center justify-between">
                                <span className="text-[9px] font-black text-indigo-600">OTA</span>
                                <span className="font-extrabold text-slate-800">
                                  ₹{formatCurrency(rate.price)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: Set Long Weekend & Holiday Rates */}
      <AnimatePresence>
        {showLongWeekendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Set Long Weekend & Special Rates
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Configure custom dates to automatically apply Long Weekend or Holiday rates.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLongWeekendModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form to Add Rule */}
              <form onSubmit={handleAddRule} className="mt-5 space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={ruleForm.start_date}
                      onChange={(e) => setRuleForm({ ...ruleForm, start_date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={ruleForm.start_date}
                      value={ruleForm.end_date}
                      onChange={(e) => setRuleForm({ ...ruleForm, end_date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Rule Type *
                    </label>
                    <select
                      value={ruleForm.day_type}
                      onChange={(e) => setRuleForm({ ...ruleForm, day_type: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="LONG_WEEKEND">Long Weekend</option>
                      <option value="HOLIDAY">Special Holiday / Festival</option>
                      <option value="WEEKEND">Weekend Override</option>
                      <option value="WEEKDAY">Weekday (Base Override)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Diwali Weekend, Christmas"
                      value={ruleForm.description}
                      onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingRule}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmittingRule ? 'Adding...' : 'Add Pricing Rule'}</span>
                  </button>
                </div>
              </form>

              {/* Active Rules List */}
              <div className="mt-6">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3">
                  Active Scheduled Rules ({calendarRules.length})
                </h4>

                {calendarRules.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-bold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No active pricing rules yet. Use the form above to add one.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {calendarRules.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              r.day_type === 'HOLIDAY'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : r.day_type === 'LONG_WEEKEND'
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}
                          >
                            {r.day_type.replace('_', ' ')}
                          </span>
                          <div>
                            <div className="text-xs font-black text-slate-800">
                              {r.start_date} <span className="text-slate-400">to</span> {r.end_date}
                            </div>
                            {r.description && (
                              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {r.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          title="Delete Rule"
                          className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Modal: Edit Room Type Rates */}
      <AnimatePresence>
        {selectedRoomTypeForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      Update Category Pricing
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedRoomTypeForEdit.displayName} {selectedRoomTypeForEdit.roomCount ? `• ${selectedRoomTypeForEdit.roomCount} Rooms` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoomTypeForEdit(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveRoomTypeRates} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Base Rate (Sun - Thu) (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={rateEditForm.base_price}
                    onChange={(e) => setRateEditForm({ ...rateEditForm, base_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Weekend Rate (Fri & Sat Nights) (₹)
                  </label>
                  <input
                    type="number"
                    value={rateEditForm.weekend_price}
                    onChange={(e) => setRateEditForm({ ...rateEditForm, weekend_price: e.target.value })}
                    placeholder="Leave empty to use Base Rate"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Long Weekend Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={rateEditForm.long_weekend_price}
                    onChange={(e) => setRateEditForm({ ...rateEditForm, long_weekend_price: e.target.value })}
                    placeholder="Rate applied during Long Weekends"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                    Holiday / Festival Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={rateEditForm.holiday_price}
                    onChange={(e) => setRateEditForm({ ...rateEditForm, holiday_price: e.target.value })}
                    placeholder="Rate applied on Holidays"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRoomTypeForEdit(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRates}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingRates ? 'Saving & Syncing...' : 'Save & Sync Aiosell'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PricingCalendar;
