import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  User, 
  Clock, 
  Info,
  Globe,
  RefreshCw,
  Plus
} from 'lucide-react';

import API from '../services/api';
import toast from 'react-hot-toast';

const BookingCalendar = ({ rooms, bookings, roomTypeObjects, onBookRoom }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDays, setViewDays] = useState(14); // Number of days to show
  const [selectedCell, setSelectedCell] = useState(null); // { groupName, date, bookings }
  const [isAiosellActive, setIsAiosellActive] = useState(false);
  const [isUpdatingAiosell, setIsUpdatingAiosell] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch Aiosell status
  React.useEffect(() => {
    const fetchAiosellStatus = async () => {
      try {
        const response = await API.get('/settings/aiosell_active');
        if (response.data && response.data.value) {
          setIsAiosellActive(response.data.value.toLowerCase() === 'true');
        }
      } catch (error) {
        console.error("Error fetching Aiosell status:", error);
      }
    };
    fetchAiosellStatus();
  }, []);

  const handleToggleAiosell = async () => {
    const newValue = !isAiosellActive;
    setIsUpdatingAiosell(true);
    try {
      await API.post('/settings', {
        key: 'aiosell_active',
        value: String(newValue),
        description: 'Global toggle for Aiosell Channel Manager synchronization'
      });
      setIsAiosellActive(newValue);
      toast.success(`Channel Manager ${newValue ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      console.error("Error updating Aiosell status:", error);
      toast.error("Failed to update Channel Manager status");
    } finally {
      setIsUpdatingAiosell(false);
    }
  };

  const handleResync = async () => {
    setIsSyncing(true);
    try {
      // Assuming branch_id 1 for now as per dashboard defaults
      await API.post('/channel-manager/sync?branch_id=1');
      toast.success("Full synchronization queued");
    } catch (error) {
      console.error("Error triggering manual sync:", error);
      toast.error("Failed to trigger synchronization");
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate date range
  const dateRange = useMemo(() => {
    const dates = [];
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < viewDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentDate, viewDays]);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isToday = (date) => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };

  // Group rooms by type
  const roomTypeGroups = useMemo(() => {
    const groups = {};
    rooms.forEach(room => {
      const typeName = room.type || 'Uncategorized';
      if (!groups[typeName]) {
        groups[typeName] = {
          name: typeName,
          rooms: [],
          totalRooms: 0,
          bookings: []
        };
      }
      groups[typeName].rooms.push(room);
      groups[typeName].totalRooms++;
    });

    // Add bookings to their respective groups
    (bookings || []).forEach(booking => {
      const normalizedStatus = (booking.status || "").toLowerCase().trim().replace(/[-_]/g, "");
      if (normalizedStatus === 'cancelled') return;
      
      const processedRooms = new Set();
      (booking.rooms || []).forEach(r => {
        const roomId = r.room?.id || r.id;
        const room = rooms.find(rm => rm.id === roomId);
        if (room) {
          const typeName = room.type || 'Uncategorized';
          if (groups[typeName] && !processedRooms.has(typeName)) {
             // For simplicity, we show the booking once per room type it occupies
             // Usually a booking is for one room type anyway
             groups[typeName].bookings.push(booking);
             processedRooms.add(typeName);
          }
        }
      });
      
      // If booking has room_type_id but no physical rooms yet (soft allocation)
      if (booking.room_type_id && (!booking.rooms || booking.rooms.length === 0)) {
        const roomType = roomTypeObjects.find(rt => rt.id === Number(booking.room_type_id));
        if (roomType) {
          const matchedGroupKey = Object.keys(groups).find(key => key.trim().toLowerCase() === roomType.name.trim().toLowerCase());
          if (matchedGroupKey) {
            groups[matchedGroupKey].bookings.push(booking);
          }
        }
      }
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, bookings, roomTypeObjects]);

  // Helper to calculate occupancy for a type on a specific date
  const getOccupancyOnDate = (group, date) => {
    const dStr = formatDate(date);
    const activeBookings = group.bookings.filter(b => {
      return b.check_in <= dStr && b.check_out > dStr;
    });

    let totalOccupied = 0;
    activeBookings.forEach(b => {
      if (b.rooms && b.rooms.length > 0) {
        // Hard-allocated booking: count rooms matching group.name (case-insensitive)
        let matchCount = 0;
        b.rooms.forEach(r => {
          const roomId = r.room?.id || r.id || r.room_id;
          const rm = rooms.find(room => room.id === roomId);
          if (rm && rm.type && rm.type.trim().toLowerCase() === group.name.trim().toLowerCase()) {
            matchCount++;
          }
        });
        // Fallback: if none of the physical rooms are resolved but it's assigned to this type
        if (matchCount === 0) {
          const rt = roomTypeObjects.find(rt => rt.id === Number(b.room_type_id));
          if (rt && rt.name.trim().toLowerCase() === group.name.trim().toLowerCase()) {
            matchCount = Number(b.num_rooms) || 1;
          }
        }
        totalOccupied += matchCount;
      } else {
        // Soft-allocated booking: check room_types_breakdown first, fallback to b.room_type_id
        if (b.room_types_breakdown && Array.isArray(b.room_types_breakdown) && b.room_types_breakdown.length > 0) {
          const match = b.room_types_breakdown.find(bd => 
            (bd.room_type_id && Number(bd.room_type_id) === Number(group.id)) ||
            (bd.name && bd.name.trim().toLowerCase() === group.name.trim().toLowerCase())
          );
          if (match) {
            totalOccupied += (Number(match.count) || 1);
          }
        } else {
          const rt = roomTypeObjects.find(rt => rt.id === Number(b.room_type_id));
          if (rt && rt.name.trim().toLowerCase() === group.name.trim().toLowerCase()) {
            totalOccupied += (Number(b.num_rooms) || 1);
          }
        }
      }
    });
    return totalOccupied;
  };

  // Helper to calculate total active bookings across all groups on a specific date
  const getBookingsCountOnDate = (date) => {
    const dStr = formatDate(date);
    const uniqueBookingIds = new Set();
    roomTypeGroups.forEach(group => {
      group.bookings.forEach(b => {
        if (b.check_in <= dStr && b.check_out > dStr) {
          uniqueBookingIds.add(`${b.is_package ? 'pkg' : 'reg'}_${b.id}`);
        }
      });
    });
    return uniqueBookingIds.size;
  };

  const nextRange = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + viewDays);
    setCurrentDate(next);
  };

  const prevRange = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - viewDays);
    setCurrentDate(prev);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[800px]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-100">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Inventory Timeline</h2>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
              {dateRange[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          {/* Channel Manager Toggle */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 ml-4">
            <div className={`p-1.5 rounded-lg ${isAiosellActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Channel Manager</span>
              <span className={`text-[11px] font-bold ${isAiosellActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isAiosellActive ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <button
              onClick={handleToggleAiosell}
              disabled={isUpdatingAiosell}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAiosellActive ? 'bg-emerald-500' : 'bg-gray-300'} ${isUpdatingAiosell ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAiosellActive ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
            
            {/* Resync Button */}
            {isAiosellActive && (
              <button
                onClick={handleResync}
                disabled={isSyncing}
                title="Force Full Sync with OTAs"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                  isSyncing 
                    ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-not-allowed' 
                    : 'bg-white text-indigo-600 border-gray-100 hover:border-indigo-200 hover:shadow-sm'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sync Now</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1">
            <button 
              onClick={() => setViewDays(7)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewDays === 7 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              Week
            </button>
            <button 
              onClick={() => setViewDays(14)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewDays === 14 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              2 Weeks
            </button>
            <button 
              onClick={() => setViewDays(30)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewDays === 30 ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              Month
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            <button onClick={prevRange} className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={goToToday} className="px-4 py-1.5 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-600 border-x border-gray-100">
              Today
            </button>
            <button onClick={nextRange} className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto relative">
        <div className="min-w-max">
          {/* Timeline Header */}
          <div className="flex sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="w-72 flex-shrink-0 p-4 border-r border-gray-200 bg-gray-50/50">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Category Availability</span>
            </div>
            {dateRange.map((date, idx) => {
              const bookingsCount = getBookingsCountOnDate(date);
              return (
                <button 
                  key={idx} 
                  onClick={() => {
                    const dStr = formatDate(date);
                    const allBookingsOnDate = [];
                    roomTypeGroups.forEach(g => {
                      g.bookings.forEach(b => {
                        if (b.check_in <= dStr && b.check_out > dStr) {
                          if (!allBookingsOnDate.some(item => item.id === b.id && item.is_package === b.is_package)) {
                            allBookingsOnDate.push(b);
                          }
                        }
                      });
                    });
                    if (allBookingsOnDate.length > 0) {
                      setSelectedCell({ groupName: "All Categories", date, bookings: allBookingsOnDate });
                    }
                  }}
                  disabled={bookingsCount === 0}
                  className={`w-32 flex-shrink-0 p-3 text-center border-r border-gray-100 flex flex-col items-center justify-center gap-1 transition-all ${
                    isToday(date) ? 'bg-indigo-50/30' : ''
                  } ${bookingsCount > 0 ? 'hover:bg-indigo-50/50 cursor-pointer' : 'cursor-default'}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${isToday(date) ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {getDayName(date)}
                  </span>
                  <span className={`text-lg font-black leading-none ${isToday(date) ? 'text-indigo-600' : 'text-gray-800'}`}>
                    {date.getDate()}
                  </span>
                  {bookingsCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[8px] font-black uppercase tracking-wider">
                      {bookingsCount} {bookingsCount === 1 ? 'Booking' : 'Bookings'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Room Type Rows */}
          <div className="divide-y divide-gray-100">
            {roomTypeGroups.map((group) => (
              <div key={group.name} className="flex group hover:bg-gray-50/50 transition-colors">
                {/* Category Info Cell */}
                <div className="w-72 flex-shrink-0 p-6 border-r border-gray-200 flex flex-col gap-2 sticky left-0 z-20 bg-white group-hover:bg-gray-50/50">
                  <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{group.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Rooms:</span>
                    <span className="text-xs font-black text-gray-700">{group.totalRooms}</span>
                  </div>
                  {roomTypeObjects.find(rt => rt.name === group.name) && (
                    <div className="flex flex-col gap-1">
                      {/* New OTA Quota field */}
                      {(roomTypeObjects.find(rt => rt.name === group.name).online_inventory !== null && roomTypeObjects.find(rt => rt.name === group.name).online_inventory !== undefined) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">OTA Quota:</span>
                          <span className="text-xs font-black text-rose-600">{roomTypeObjects.find(rt => rt.name === group.name).online_inventory}</span>
                        </div>
                      ) : (
                        /* Fallback to legacy total_inventory field if it was being used as quota */
                        roomTypeObjects.find(rt => rt.name === group.name).total_inventory > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Online:</span>
                            <span className="text-xs font-black text-emerald-600">{roomTypeObjects.find(rt => rt.name === group.name).total_inventory}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Availability Cells */}
                <div className="flex">
                  {dateRange.map((date, idx) => {
                    const rtObj = roomTypeObjects.find(rt => rt.name === group.name);
                    const quota = (rtObj?.online_inventory !== null && rtObj?.online_inventory !== undefined) 
                                   ? Number(rtObj.online_inventory) 
                                   : (rtObj?.total_inventory > 0 ? Number(rtObj.total_inventory) : null);
                    
                    const occupancy = getOccupancyOnDate(group, date);
                    const physicalAvailable = group.totalRooms - occupancy;
                    
                    // Availability is capped by the quota if set
                    const availability = (quota !== null) 
                                         ? Math.max(0, Math.min(quota - occupancy, physicalAvailable))
                                         : physicalAvailable;

                    const isSoldOut = availability <= 0;
                    
                    const activeBookings = group.bookings.filter(b => {
                      const dStr = formatDate(date);
                      return b.check_in <= dStr && b.check_out > dStr;
                    });
                    const activeBookingsCount = activeBookings.length;

                    return (
                      <button 
                        key={idx} 
                        onClick={() => setSelectedCell({ groupName: group.name, date, bookings: activeBookings })}
                        className={`w-32 h-24 flex-shrink-0 border-r border-gray-100 p-2 flex flex-col items-center justify-center gap-1 transition-all ${
                          isToday(date) ? 'bg-indigo-50/10' : ''
                        } ${isSoldOut ? 'bg-rose-50/30' : 'bg-white'} hover:bg-indigo-50/5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        <div className={`text-xl font-black ${isSoldOut ? 'text-rose-600' : 'text-indigo-600'}`}>
                           {availability}
                        </div>
                        <div className={`text-[9px] font-black uppercase tracking-widest ${isSoldOut ? 'text-rose-400' : 'text-gray-400'}`}>
                           Available
                        </div>
                        {activeBookingsCount > 0 && (
                          <div className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isSoldOut ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {activeBookingsCount} {activeBookingsCount === 1 ? 'Booking' : 'Bookings'}
                          </div>
                        )}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(occupancy / group.totalRooms) * 100}%` }}
                            className={`h-full ${isSoldOut ? 'bg-rose-500' : 'bg-indigo-500'}`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center gap-12">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-md bg-indigo-600 shadow-sm shadow-indigo-100" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">High Availability</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-md bg-rose-500 shadow-sm shadow-rose-100" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Sold Out / Fully Booked</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-2 py-0.5 bg-emerald-100 rounded text-emerald-700 text-[9px] font-black uppercase">Online Inv</div>
           <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Cloud Sync Active</span>
        </div>
      </div>

      {/* Booking Summary Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedCell(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Booking Summary</h3>
                <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-1">
                  {selectedCell.groupName} • {new Date(selectedCell.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {onBookRoom && selectedCell.groupName !== "All Categories" && (
                  <button
                    onClick={() => {
                      onBookRoom(selectedCell.groupName, formatDate(selectedCell.date));
                      setSelectedCell(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Book Room
                  </button>
                )}
                <button 
                  onClick={() => setSelectedCell(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {selectedCell.bookings.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center justify-center gap-4">
                  <span className="text-gray-400 font-medium">No active bookings for this date.</span>
                  {onBookRoom && selectedCell.groupName !== "All Categories" && (
                    <button
                      onClick={() => {
                        onBookRoom(selectedCell.groupName, formatDate(selectedCell.date));
                        setSelectedCell(null);
                      }}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Booking
                    </button>
                  )}
                </div>
              ) : (
                selectedCell.bookings.map((b, bIdx) => (
                  <div key={bIdx} className="bg-gray-50/50 hover:bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col gap-2.5 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm tracking-tight">{b.guest_name || 'Anonymous Guest'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">ID: {b.display_id || b.id}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        b.status?.toLowerCase() === 'booked' ? 'bg-indigo-100 text-indigo-700' :
                        b.status?.toLowerCase() === 'checked_in' || b.status?.toLowerCase() === 'checked-in' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-400 text-[10px] uppercase">Rooms:</span>
                        <span className="font-black text-gray-800">
                          {b.rooms && b.rooms.length > 0 
                            ? b.rooms.map(r => r.room?.number || r.number || '-').join(', ') 
                            : `${b.num_rooms || 1} (Soft Allocated)`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-400 text-[10px] uppercase">Dates:</span>
                        <span className="font-bold text-gray-800 font-mono">
                          {b.check_in} to {b.check_out}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-400 text-[10px] uppercase">Source:</span>
                        <span className="font-black text-gray-700">{b.source || 'Admin'}</span>
                      </div>
                      {b.guest_mobile && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-400 text-[10px] uppercase">Mobile:</span>
                          <span className="font-bold text-gray-700">{b.guest_mobile}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
