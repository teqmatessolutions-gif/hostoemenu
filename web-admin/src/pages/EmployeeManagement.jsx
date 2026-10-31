import React, { useEffect, useState, useMemo, useRef } from "react";
import { formatCurrency } from '../utils/currency';
import DashboardLayout from "../layout/DashboardLayout";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, User, DollarSign, Utensils, ConciergeBell, BedDouble, Package, AlertCircle, Search, UserCheck, Briefcase, Clock, Users, ChevronLeft, ChevronRight, TrendingUp, Settings, ShieldCheck, Edit, Trash2, Activity, Eye, CheckSquare } from "lucide-react";


import * as XLSX from "xlsx";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Plus, Camera, MapPin } from "lucide-react";

import CountUp from "react-countup";
import BannerMessage from "../components/BannerMessage";
import EmployeeProfileModal from "../components/EmployeeProfileModal";
import { getMediaBaseUrl } from "../utils/env";
import { getImageUrl } from "../utils/imageUtils";
import { formatDateIST, formatDateTimeIST } from "../utils/dateUtils";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import PayrollManagement from "../components/PayrollManagement";
import SalaryAdvanceManagement from "../components/SalaryAdvanceManagement";
import LeavePolicyManagement from "../components/LeavePolicyManagement";
import RoleManagementTab from "../components/RoleManagementTab";
import DailyTaskReport from "../components/DailyTaskReport";
import { usePermissions } from "../hooks/usePermissions";
import { useBranch } from "../contexts/BranchContext";

const EmployeeOverview = () => {
  const { activeBranchId } = useBranch();
  const [date, setDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [workLogs, setWorkLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [utilizationData, setUtilizationData] = useState([]);
  const [institutionalHolidays, setInstitutionalHolidays] = useState([]);
  const [workforceStatus, setWorkforceStatus] = useState({ on_leave: 0, active_today: 0 });
  const [profileModalId, setProfileModalId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/employees?active_only=true').then(res => {
      setEmployees(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedEmployeeId(res.data[0].id);
      }
    });

    // Fetch livedata for the whole organization
    api.get('/attendance/utilization/aggregate').then(res => {
      setUtilizationData(res.data || []);
    });

    api.get('/attendance/holidays').then(res => {
      setInstitutionalHolidays(res.data || []);
    });

    api.get('/attendance/status/today').then(res => {
      setWorkforceStatus(res.data || { on_leave: 0, active_today: 0 });
    });
  }, [activeBranchId]);



  useEffect(() => {
    if (selectedEmployeeId) {
      setLoading(true);
      Promise.all([
        api.get(`/attendance/work-logs/${selectedEmployeeId}`).catch(() => ({ data: [] })),
        api.get(`/employees/leave/${selectedEmployeeId}`).catch(() => ({ data: [] })),
        api.get(`/services/assigned?employee_id=${selectedEmployeeId}&status=completed&limit=10`).catch(() => ({ data: [] }))
      ]).then(([workRes, leaveRes, servicesRes]) => {
        setWorkLogs(workRes.data || []);
        setLeaves(leaveRes.data || []);

        // Format completed services as tasks
        const tasks = (servicesRes.data || []).map(service => ({
          id: service.id,
          type: service.service_name || service.service?.name || 'Service',
          location: `Room ${service.room_number || service.room?.number || 'N/A'}`,
          completedAt: service.completed_at,
          status: 'Completed'
        }));
        setCompletedTasks(tasks);
      }).finally(() => setLoading(false));
    }
  }, [selectedEmployeeId]);

  const leaveBalance = useMemo(() => {
    const totalLeaves = 20;
    const usedLeaves = leaves.filter(l => l.status === 'approved').length;
    return totalLeaves - usedLeaves;
  }, [leaves]);

  const timeOffActivities = useMemo(() => {
    if (utilizationData.length > 0) return utilizationData;
    return [
      { month: 'Jan', hours: 0 }, { month: 'Feb', hours: 0 }, { month: 'Mar', hours: 0 },
      { month: 'Apr', hours: 0 }, { month: 'May', hours: 0 }, { month: 'Jun', hours: 0 },
      { month: 'Jul', hours: 40 }, { month: 'Aug', hours: 30 }, { month: 'Sep', hours: 50 },
      { month: 'Oct', hours: 80 }, { month: 'Nov', hours: 30 }, { month: 'Dec', hours: 0 }
    ];
  }, [utilizationData]);


  const isClockedIn = useMemo(() => {
    return workLogs.some(log => !log.check_out_time);
  }, [workLogs]);

  const todayHours = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = workLogs.filter(log => log.date === today);
    return todayLogs.reduce((sum, log) => sum + (log.duration_hours || 0), 0);
  }, [workLogs]);

  const upcomingHolidays = useMemo(() => {
    if (institutionalHolidays.length > 0) return institutionalHolidays;
    return [
      { date: 'DEC 25', name: 'Christmas' },
      { date: 'JAN 01', name: 'New Year' },
      { date: 'JAN 26', name: 'Republic Day' }
    ];
  }, [institutionalHolidays]);


  return (
    <div className="space-y-6">
      {/* Top Level KPIs - Manager focused */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Workforce</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{employees.length}</span>
              <span className="text-[10px] text-green-500 font-bold">+2 this month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity size={24} className="animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Currently Online</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">
                {workforceStatus.currently_online || 0}
              </span>
              <span className="text-[10px] text-gray-400">On duty now</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">
                {workforceStatus.active_today}
              </span>
              <span className="text-[10px] text-gray-400">Staff movement</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">On Leave</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">{workforceStatus.on_leave}</span>
              <span className="text-[10px] text-gray-400">Available: {employees.length - workforceStatus.on_leave}</span>
            </div>
          </div>
        </div>


        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payroll Est.</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">
                {Array.isArray(employees) ? formatCurrency(employees.reduce((acc, emp) => acc + (emp?.salary || 0), 0)) : formatCurrency(0)}
              </span>
              <span className="text-[10px] text-gray-400">Monthly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Control Panel */}
        <div className="lg:w-1/3 space-y-6">
          {/* Employee Focus Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800">Personal Insight</h3>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="text-sm border-none bg-gray-50 rounded-lg px-2 py-1 font-semibold text-orange-600 focus:ring-0 cursor-pointer"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Micro Profile Widget */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-orange-50 rounded-xl">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-200 border-2 border-white shadow-sm flex items-center justify-center">
                <User className="text-orange-600" size={24} />
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-tight">
                  {employees.find(e => e.id == selectedEmployeeId)?.name || 'Select Staff'}
                </p>
                <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">
                  {employees.find(e => e.id == selectedEmployeeId)?.designation || 'Operational Staff'}
                </p>
              </div>
            </div>

            {/* Mini Stat Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Leave Balance</p>
                <p className="text-xl font-black text-gray-800">{leaveBalance}d</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Today Hours</p>
                <p className="text-xl font-black text-gray-800">{todayHours.toFixed(1)}h</p>
              </div>
            </div>

            <button
              onClick={() => setProfileModalId(selectedEmployeeId)}
              className="w-full mt-6 py-3 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
            >
              View Full Dossier
            </button>
          </div>

          {/* Time Management View */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Availability Log</h3>
            <Calendar
              value={date}
              onChange={setDate}
              className="border-none w-full text-sm custom-calendar-mini"
              tileClassName={({ date, view }) => {
                if (view === 'month') {
                  const dateStr = date.toISOString().split('T')[0];
                  const hasWork = workLogs.some(log => log.date === dateStr && log.duration_hours >= 4);
                  if (hasWork) return 'present-day';
                }
                return null;
              }}
            />
            <style>{`
              .custom-calendar-mini { width: 100% !important; background: transparent !important; }
              .custom-calendar-mini button { padding: 10px !important; font-size: 11px !important; border-radius: 8px !important; }
              .present-day { background: #dcfce7 !important; color: #166534 !important; font-weight: 900 !important; }
              .react-calendar__tile--now { background: #fff7ed !important; color: #ea580c !important; border: 1px solid #ffedd5 !important; }
              .react-calendar__tile--active { background: #f97316 !important; color: white !important; }
            `}</style>
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="flex-1 space-y-6">
          {/* Analysis Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Productivity Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-800">Time Utilization</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Activity Level</span>
                </div>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOffActivities}>
                    <XAxis dataKey="month" hide />
                    <Tooltip
                      labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value} Hours`, 'Utilization']}
                    />
                    <Bar
                      dataKey={timeOffActivities[0]?.hours !== undefined ? "hours" : "days"}
                      radius={[6, 6, 6, 6]}
                      minPointSize={4}
                    >
                      {timeOffActivities.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#bfdbfe'} />
                      ))}
                    </Bar>
                  </BarChart>

                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Logistics */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-6 uppercase text-[10px] tracking-widest text-gray-400">Institutional Calendar</h3>
              <div className="space-y-4">
                {upcomingHolidays.map((holiday, i) => (
                  <div key={i} className="flex items-center gap-4 group p-3 hover:bg-gray-50 rounded-xl transition-all cursor-default">
                    <div className="flex flex-col items-center justify-center w-12 h-14 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors px-1">
                      <span className="text-[8px] font-black text-orange-400 uppercase leading-none text-center">
                        {holiday.date.split(' ')[0]}
                      </span>
                      <span className="text-lg font-black text-orange-600 leading-tight">
                        {holiday.date.split(' ')[1] || ''}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-800">{holiday.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">Resort Holiday</p>
                    </div>
                    <CalendarIcon size={16} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity/Task Integrity */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800">Staff Contribution Trace</h3>
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Full Log</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedTasks.length > 0 ? completedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-500 shadow-sm border border-gray-100">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{task.type}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{task.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded uppercase mb-1">Success</div>
                    <p className="text-[9px] text-gray-400 font-bold">{formatDateTimeIST(task.completedAt).split(',')[1]}</p>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No recent task activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {profileModalId && (
        <EmployeeProfileModal
          employeeId={profileModalId}
          onClose={() => setProfileModalId(null)}
        />
      )}
    </div>
  );

};

const UserHistory = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mediaBaseUrl = useMemo(() => getMediaBaseUrl(), []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Only fetch active employees (not guests or purchase manager system accounts)
        const employeesRes = await api.get("/employees?skip=0&limit=1000&active_only=true");
        const employees = employeesRes.data || [];

        // Only show users who are actual employees (have an employee record)
        const combinedUsers = employees.map(emp => ({
          id: emp.user_id || emp.id,
          employee_id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role || emp.designation || 'Staff',
          phone: emp.phone,
          is_active: emp.is_active,
          salary: emp.salary || null,
          join_date: emp.join_date || null,
          image_url: emp.image_url || null,
          has_employee_record: true
        })).filter(u => u.id); // ensure valid user_id

        setUsers(combinedUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleFetchHistory = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError("");
    setHistory(null);
    try {
      // Build params object, only including dates if they have values
      const params = {
        user_id: selectedUserId
      };
      if (fromDate && fromDate.trim() !== "") {
        params.from_date = fromDate;
      }
      if (toDate && toDate.trim() !== "") {
        params.to_date = toDate;
      }

      const response = await api.get("/reports/user-history", { params });
      setHistory(response.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : "An error occurred."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full p-2 border rounded-md">
            <option value="">-- Select a User --</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full p-2 border rounded-md" />
        </div>
      </div>
      <button onClick={handleFetchHistory} disabled={loading || !selectedUserId} className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400">
        {loading ? 'Fetching...' : 'Get Activity Report'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {history && (
        <div className="mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Activity for {history.user_name}</h3>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {history.activities.length > 0 ? history.activities.map((activity, index) => (
              <div key={index} className="p-3 border rounded-lg bg-white shadow-sm">
                <p className="text-xs text-gray-500">{new Date(activity.activity_date).toLocaleString()}</p>
                <h4 className="font-bold">{activity.type}</h4>
                <p className="text-sm">{activity.description}</p>
                {activity.amount != null && <span className="text-sm font-semibold text-green-600">Amount: {formatCurrency(activity.amount)}</span>}
              </div>
            )) : <p>No activities found.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    from_date: '',
    to_date: '',
    reason: '',
    leave_type: 'Paid' // Default to 'Paid'
  });

  useEffect(() => {
    api.get('/employees?active_only=true').then(res => setEmployees(res.data));
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      // When a user is selected to view leaves, also set it for the create form
      setLeaveForm(prev => ({ ...prev, employee_id: selectedEmployeeId }));
      api.get(`/employees/leave/${selectedEmployeeId}`)
        .then(res => setLeaves(res.data))
        .catch(err => console.error("Failed to fetch leaves", err));
    } else {
      setLeaves([]);
    }
  }, [selectedEmployeeId]);

  const handleStatusUpdate = (leaveId, status) => {
    api.put(`/employees/leave/${leaveId}/status/${status}`).then(res => {
      setLeaves(leaves.map(l => l.id === leaveId ? res.data : l));
    });
  };

  const handleLeaveFormChange = (e) => {
    setLeaveForm({ ...leaveForm, [e.target.name]: e.target.value });
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/employees/leave', leaveForm);
      // If the new leave belongs to the currently viewed employee, add it to the list
      if (response.data.employee_id === parseInt(selectedEmployeeId)) {
        setLeaves([response.data, ...leaves]);
      }
      // Reset form and hide it
      setLeaveForm({ employee_id: '', from_date: '', to_date: '', reason: '', leave_type: 'Paid' });
      setShowCreateForm(false);
    } catch (err) {
      console.error("Failed to create leave", err);
      alert("Failed to create leave request.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Leave Form Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="font-semibold text-indigo-600">
          {showCreateForm ? '▼ Hide Form' : '▶ Create Leave Entry'}
        </button>
        {showCreateForm && (
          <motion.form onSubmit={handleCreateLeave} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-3">
            <select name="employee_id" value={leaveForm.employee_id} onChange={handleLeaveFormChange} className="w-full p-2 border rounded-md" required>
              <option value="">-- Select Employee --</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <select name="leave_type" value={leaveForm.leave_type} onChange={handleLeaveFormChange} className="w-full p-2 border rounded-md" required>
              <option value="Paid">Paid Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Unpaid">Unpaid Leave</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" name="from_date" value={leaveForm.from_date} onChange={handleLeaveFormChange} className="w-full p-2 border rounded-md" required />
              <input type="date" name="to_date" value={leaveForm.to_date} onChange={handleLeaveFormChange} className="w-full p-2 border rounded-md" required />
            </div>
            <input type="text" name="reason" placeholder="Reason for leave" value={leaveForm.reason} onChange={handleLeaveFormChange} className="w-full p-2 border rounded-md" required />
            <button type="submit" className="w-full bg-green-600 text-white px-4 py-2 rounded-md">Submit Leave</button>
          </motion.form>
        )}
      </div>

      {/* View Leaves Section */}
      <h3 className="text-lg font-semibold pt-4 border-t">View Existing Leaves</h3>
      <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full p-2 border rounded-md">
        <option value="">Select Employee to view leaves</option>
        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
      </select>
      <div className="overflow-x-auto max-h-96">
        {selectedEmployeeId && leaves.length === 0 && (
          <p className="text-center text-gray-500 py-4">No leave records found for this employee.</p>
        )}
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4">From</th>
              <th className="py-2 px-4">To</th>
              <th className="py-2 px-4">Reason</th>
              <th className="py-2 px-4">Type</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length > 0 && leaves.map(leave => (
              <tr key={leave.id} className="border-b">
                <td className="py-2 px-4">{leave.from_date}</td>
                <td className="py-2 px-4">{leave.to_date}</td>
                <td className="py-2 px-4">{leave.reason}</td>
                <td className="py-2 px-4">{leave.leave_type}</td>
                <td className="py-2 px-4">{leave.status}</td>
                <td className="py-2 px-4 space-x-2">
                  {leave.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusUpdate(leave.id, 'approved')} className="text-green-600">Approve</button>
                      <button onClick={() => handleStatusUpdate(leave.id, 'rejected')} className="text-red-600">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const formatTime12h = (timeStr) => {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  return `${hour}:${minute} ${ampm}`;
};

const AttendanceTracking = () => {
  const { role: userRole, isSuperadmin } = usePermissions();
  const isAdminOrManager = isSuperadmin || ['super_admin', 'superadmin', 'admin', 'manager'].includes(userRole);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [bannerMessage, setBannerMessage] = useState({ type: null, text: "" });

  // Function to show banner message
  const showBannerMessage = (type, text) => {
    setBannerMessage({ type, text });
  };

  const closeBannerMessage = () => {
    setBannerMessage({ type: null, text: "" });
  };

  const [location, setLocation] = useState('Office'); // For live clock-in/out
  // State to manage which day's detailed logs are shown
  const [selectedDay, setSelectedDay] = useState(null); // Stores the date string of the expanded day
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    api.get('/employees?active_only=true').then(res => setEmployees(res.data));
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      setLoading(true);
      api.get(`/attendance/work-logs/${selectedEmployeeId}`).then(res => { // This endpoint provides duration_hours
        setWorkLogs(res.data || []);
        if (!res.data || res.data.length === 0) {
          console.log("No work logs found for this employee");
        }
      }).catch(err => {
        console.error("Failed to fetch data", err);
        const errorMsg = err.response?.data?.detail;
        const message = typeof errorMsg === 'string' ? errorMsg : 'Failed to fetch employee records';
        showBannerMessage("error", message);
        setWorkLogs([]);
      }).finally(() => setLoading(false));
    } else {
      setWorkLogs([]);
    }
  }, [selectedEmployeeId]);

  const showMessage = (text, type) => {
    showBannerMessage(type, text);
  };

  const handleClockIn = async () => {
    if (!selectedEmployeeId) return showMessage('Please select an employee.', 'error');
    if (!selectedFile) return showMessage('Please capture or upload a photo to clock in.', 'error');

    const submitClockIn = async (lat = null, lng = null) => {
      try {
        const formData = new FormData();
        formData.append('employee_id', selectedEmployeeId);
        formData.append('location', location);
        if (selectedFile) {
          formData.append('image', selectedFile);
        }
        if (lat !== null) formData.append('latitude', lat);
        if (lng !== null) formData.append('longitude', lng);

        const response = await api.post('/attendance/clock-in', formData);
        setWorkLogs([response.data, ...workLogs]);
        setSelectedFile(null);
        setPreviewUrl(null);
        showMessage('Clocked in successfully.', 'success');
      } catch (err) {
        const errorMsg = err.response?.data?.detail;
        const message = typeof errorMsg === 'string' ? errorMsg : 'Failed to clock in.';
        showMessage(message, 'error');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          submitClockIn(position.coords.latitude, position.coords.longitude);
        },
        () => {
          submitClockIn();
        },
        { timeout: 5000 }
      );
    } else {
      submitClockIn();
    }
  };

  const handleClockOut = async () => {
    if (!selectedEmployeeId) return showMessage('Please select an employee.', 'error');

    // Check if there's an open clock-in before attempting clock-out
    const openLog = workLogs.find(log => log.check_out_time === null || log.check_out_time === undefined);

    if (!openLog) {
      return showMessage('Please clock in first before clocking out.', 'error');
    }

    const emp = employees.find(e => String(e.id) === String(selectedEmployeeId));
    let dailyTasks = [];
    try { 
      dailyTasks = emp?.daily_tasks ? JSON.parse(emp.daily_tasks) : []; 
      if (!Array.isArray(dailyTasks)) dailyTasks = emp?.daily_tasks ? [emp.daily_tasks] : [];
    } catch {
      dailyTasks = emp?.daily_tasks ? [emp.daily_tasks] : [];
    }

    if (dailyTasks.length > 0) {
      let completedTasks = [];
      try { completedTasks = JSON.parse(openLog.completed_tasks || "[]"); } catch {}
      
      const allTasksCompleted = dailyTasks.every(task => completedTasks.includes(task));
      if (!allTasksCompleted) {
        return showMessage('Please complete all assigned active shift tasks before clocking out.', 'error');
      }
    }

    try {
      const formData = new FormData();
      formData.append('employee_id', selectedEmployeeId);

      const response = await api.post('/attendance/clock-out', formData);
      // Update the log in the state with the returned data which includes the check_out_time
      setWorkLogs(workLogs.map(log => log.id === response.data.id ? response.data : log).sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id));
      showMessage('Clocked out successfully.', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.detail;
      const message = typeof errorMsg === 'string' ? errorMsg : 'Failed to clock out.';
      showMessage(message, 'error');
    }
  };

  const handleTaskToggle = async (logId, currentTasksJSON, taskName) => {
    let tasks = [];
    try {
      tasks = JSON.parse(currentTasksJSON || "[]");
    } catch {
      tasks = [];
    }

    if (tasks.includes(taskName)) {
      tasks = tasks.filter(t => t !== taskName);
    } else {
      tasks.push(taskName);
    }

    try {
      // Must await without directly causing rerender issues
      const res = await api.put(`/attendance/work-logs/${logId}/tasks`, {
        completed_tasks: JSON.stringify(tasks)
      });
      setWorkLogs(prevLogs => prevLogs.map(log => log.id === logId ? { ...log, completed_tasks: res.data.completed_tasks } : log));
    } catch (err) {
      console.error("Failed to update task", err);
      showMessage("Failed to update task status.", "error");
    }
  };

  const handleApproveTasks = async (logId) => {
    try {
      const res = await api.post(`/attendance/work-logs/${logId}/approve`);
      setWorkLogs(prevLogs => prevLogs.map(log => log.id === logId ? res.data : log));
      showMessage("Tasks approved successfully.", "success");
    } catch (err) {
      console.error("Failed to approve tasks", err);
      showMessage(err.response?.data?.detail || "Failed to approve tasks.", "error");
    }
  };

  const handleManualEntry = async (formData) => {
    try {
      const response = await api.post('/attendance/log-work', formData);
      setWorkLogs([response.data, ...workLogs].sort((a, b) => new Date(b.date) - new Date(a.date)));
      showMessage("Manual attendance recorded successfully.", "success");
      setShowManualEntryModal(false);
    } catch (err) {
      console.error("Failed to record manual attendance", err);
      showMessage(err.response?.data?.detail || "Failed to record manual attendance.", "error");
    }
  };

  const handleUpdateLog = async (logId, updatedData) => {
    try {
      const response = await api.put(`/attendance/work-logs/${logId}`, updatedData);
      setWorkLogs(workLogs.map(log => log.id === logId ? response.data : log).sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id));
      showMessage("Attendance log updated successfully.", "success");
      setEditingLog(null);
    } catch (err) {
      console.error("Failed to update attendance log", err);
      let errorMsg = "Failed to update attendance log.";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      }
      showMessage(errorMsg, "error");
    }
  };

  const dailyAttendance = useMemo(() => {
    const dailySummary = workLogs.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = { totalHours: 0, logs: [], completedLogs: [], openLogs: [] };
      }
      const hours = log.duration_hours || 0;
      acc[date].totalHours += hours;
      acc[date].logs.push(log);

      // Separate completed and open logs for better display
      if (log.check_out_time && hours > 0) {
        acc[date].completedLogs.push(log);
      } else if (!log.check_out_time) {
        acc[date].openLogs.push(log);
      }

      return acc;
    }, {});

    return Object.entries(dailySummary).map(([date, data]) => {
      const totalHours = data.totalHours;
      let status = 'Absent';
      let statusDescription = '';

      // Determine status based on total working hours or open sessions
      if (data.openLogs.length > 0) {
        status = 'Active';
        statusDescription = 'Clocked In (Session in progress)';
      } else if (totalHours >= 8) {
        status = 'Present';
        statusDescription = 'Full Day (8+ hours)';
      } else if (totalHours >= 4 && totalHours < 8) {
        status = 'Half Day';
        statusDescription = `Half Day (${totalHours.toFixed(2)} hrs – 4 to 8 hours)`;
      } else if (totalHours > 0 && totalHours < 4) {
        status = 'Partial';
        statusDescription = `Partial (${totalHours.toFixed(2)} hrs – less than 4 hours, only hours counted)`;
      } else {
        status = 'Absent';
        statusDescription = 'No attendance recorded';
      }

      // Calculate summary stats
      const completedHours = data.completedLogs.reduce((sum, log) => sum + (log.duration_hours || 0), 0);
      const openLogsCount = data.openLogs.length;
      const completedLogsCount = data.completedLogs.length;

      return {
        date,
        totalHours,
        status,
        statusDescription,
        logs: data.logs,
        completedLogs: data.completedLogs,
        openLogs: data.openLogs,
        completedHours,
        completedLogsCount,
        openLogsCount
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [workLogs]);

  const getStatusColor = (status) => {
    if (status === 'Present') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'Active') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (status === 'Half Day') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (status === 'Partial') return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };


  return (
    <div className="space-y-6">
      <BannerMessage
        message={bannerMessage}
        onClose={closeBannerMessage}
        autoDismiss={true}
        duration={5000}
      />
      <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full p-2 border rounded-md">
        <option value="">-- Select an Employee --</option>
        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
      </select>

      {selectedEmployeeId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Clock-in/Out Section */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Live Attendance</h3>

            {/* Status Indicator */}
            {(() => {
              const openLog = workLogs.find(log => log.check_out_time === null || log.check_out_time === undefined);
              const hasOpenClockIn = !!openLog;
              return (
                <div className={`p-2 rounded-md text-center text-sm font-semibold ${hasOpenClockIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  Status: {hasOpenClockIn ? `🟢 Clocked In (at ${formatTime12h(openLog.check_in_time)})` : '⚪ Not Clocked In'}
                </div>
              );
            })()}

            <div className="space-y-2">
              <label htmlFor="location-select" className="block text-sm font-medium text-gray-700">Location</label>
              <select id="location-select" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 border rounded-md">
                <option>Office</option>
                <option>Remote</option>
                <option>On-Site</option>
              </select>
            </div>

            {/* Photo Selection Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider px-0.5">Selfie / Photo (Required)</label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 bg-white hover:border-indigo-400 transition-all cursor-pointer relative overflow-hidden shadow-sm">
                {previewUrl ? (
                  <div className="relative w-full h-32">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors"
                    >
                      <Plus size={14} className="rotate-45" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full h-24">
                    <Camera size={28} className="text-gray-400 mb-1" />
                    <span className="text-xs font-extrabold text-indigo-600">Take Photo / Upload</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG up to 5MB</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user" 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setSelectedFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden" 
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <button onClick={handleClockIn} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Clock In</button>
              <button onClick={handleClockOut} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">Clock Out</button>
            </div>
            
            {isAdminOrManager && (
              <button 
                onClick={() => setShowManualEntryModal(true)} 
                className="w-full mt-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md hover:bg-indigo-100 flex items-center justify-center gap-2 font-semibold transition-colors"
              >
                <Plus size={16} /> Manual Attendance Entry
              </button>
            )}

            {/* Daily Tasks Checklist for Active Session */}
            {(() => {
              const openLog = workLogs.find(log => log.check_out_time === null || log.check_out_time === undefined);
              if (!openLog) return null;

              const emp = employees.find(e => String(e.id) === String(selectedEmployeeId));
              let dailyTasks = [];
              try {
                dailyTasks = emp?.daily_tasks ? JSON.parse(emp.daily_tasks) : [];
                if (!Array.isArray(dailyTasks)) dailyTasks = emp?.daily_tasks ? [emp.daily_tasks] : [];
              } catch {
                dailyTasks = emp?.daily_tasks ? [emp.daily_tasks] : [];
              }

              if (dailyTasks.length === 0) return null;

              let completedTasks = [];
              try { completedTasks = JSON.parse(openLog.completed_tasks || "[]"); } catch { }

              return (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-sm font-semibold border-l-4 border-indigo-500 pl-2 text-indigo-900 mb-3 bg-indigo-50 p-1 rounded-r">Active Shift Tasks</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {dailyTasks.map((task, idx) => {
                      const isCompleted = completedTasks.includes(task);
                      return (
                        <label key={idx} className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg border transition-all ${isCompleted ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100 shadow-sm hover:border-indigo-300 hover:shadow'}`}>
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleTaskToggle(openLog.id, openLog.completed_tasks, task)}
                            className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className={`text-sm flex-1 ${isCompleted ? 'line-through text-gray-400 font-medium' : 'text-gray-700 font-medium'}`}>{task}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Calculated Attendance Report */}
          <div className="bg-white p-4 rounded-lg space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Daily Attendance Summary</h3>
              {!loading && workLogs.length > 0 && (
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">Total Records:</span> {workLogs.length}
                </div>
              )}
            </div>
            {loading && <p className="text-center text-gray-500">Loading attendance records...</p>}
            {!loading && workLogs.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-600 font-medium">No attendance records found for this employee.</p>
                <p className="text-sm text-gray-500 mt-2">Use the Clock In button above to create attendance records.</p>
              </div>
            )}
            {!loading && workLogs.length > 0 && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {(() => {
                    const totalDays = dailyAttendance.length;
                    const presentDays = dailyAttendance.filter(d => d.status === 'Present').length;
                    const halfDays = dailyAttendance.filter(d => d.status === 'Half Day').length;
                    const totalHours = dailyAttendance.reduce((sum, d) => sum + d.totalHours, 0);

                    return (
                      <>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">Total Days</p>
                          <p className="text-lg font-bold text-blue-800">{totalDays}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="text-xs text-green-600 font-medium">Present Days</p>
                          <p className="text-lg font-bold text-green-800">{presentDays}</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                          <p className="text-xs text-yellow-600 font-medium">Half Days</p>
                          <p className="text-lg font-bold text-yellow-800">{halfDays}</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <p className="text-xs text-purple-600 font-medium">Total Hours</p>
                          <p className="text-lg font-bold text-purple-800">{totalHours.toFixed(2)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Attendance Table */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full bg-white text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">Date</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">Total Hours</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">Status</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">Sessions</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyAttendance.map(day => (
                        <React.Fragment key={day.date}>
                          <tr
                            className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
                          >
                            <td className="py-3 px-4 font-medium text-gray-800">
                              {formatDateIST(day.date, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{day.totalHours.toFixed(2)} hrs</span>
                                {day.completedHours > 0 && day.openLogsCount > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {day.completedHours.toFixed(2)} completed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${getStatusColor(day.status)}`}>
                                  {day.status}
                                </span>
                                <span className="text-xs text-gray-500">{day.statusDescription}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs">
                                  <span className="font-semibold text-green-600">{day.completedLogsCount}</span> completed
                                </span>
                                {day.openLogsCount > 0 && (
                                  <span className="text-xs">
                                    <span className="font-semibold text-orange-600">{day.openLogsCount}</span> open
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                                {selectedDay === day.date ? '▲ Hide Details' : '▼ Show Details'}
                              </button>
                            </td>
                          </tr>
                          {selectedDay === day.date && (
                            <tr>
                              <td colSpan="5" className="p-0 bg-gray-50">
                                <div className="p-4 border-t-2 border-gray-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-800">Detailed Logs for {day.date}</h4>
                                    <span className="text-xs text-gray-500">
                                      Total: {day.totalHours.toFixed(2)} hours |
                                      Completed: {day.completedHours.toFixed(2)} hours
                                      {day.openLogsCount > 0 && ` | Open: ${day.openLogsCount} session(s)`}
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white text-xs border border-gray-200 rounded-lg">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Check-in Time</th>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Check-out Time</th>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Location</th>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Photo</th>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Duration</th>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Tasks Done</th>
                                          <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Status</th>
                                          {isSuperadmin && <th className="py-2 px-3 text-left font-semibold text-gray-700 border-b">Actions</th>}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {day.logs.length > 0 ? day.logs.map((log, logIndex) => {
                                          const isOpen = !log.check_out_time;
                                          const hours = log.duration_hours || 0;
                                          return (
                                            <tr key={logIndex} className={`border-b last:border-b-0 ${isOpen ? 'bg-orange-50' : ''}`}>
                                              <td className="py-2 px-3 font-medium">{formatTime12h(log.check_in_time)}</td>
                                              <td className="py-2 px-3">
                                                {log.check_out_time ? formatTime12h(log.check_out_time) : (
                                                  <span className="text-orange-600 font-medium">In Progress...</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                  {log.location || 'N/A'}
                                                  {log.latitude && log.longitude && ` (${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)})`}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col gap-1">
                                                  {log.clock_in_image ? (
                                                    <button 
                                                      onClick={() => window.open(getImageUrl(log.clock_in_image), '_blank')}
                                                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline whitespace-nowrap"
                                                    >
                                                      <Camera size={12} /> Check-in Photo
                                                    </button>
                                                  ) : null}
                                                  {log.clock_out_image ? (
                                                    <button 
                                                      onClick={() => window.open(getImageUrl(log.clock_out_image), '_blank')}
                                                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-semibold hover:underline whitespace-nowrap"
                                                    >
                                                      <Camera size={12} /> Check-out Photo
                                                    </button>
                                                  ) : null}
                                                  {!log.clock_in_image && !log.clock_out_image && (
                                                    <span className="text-gray-400">-</span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="py-2 px-3">
                                                {hours > 0 ? (
                                                  <span className="font-semibold">{hours.toFixed(2)} hrs</span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3">
                                                {(() => {
                                                  let tasksList = [];
                                                  try { tasksList = JSON.parse(log.completed_tasks || "[]"); } catch { }
                                                  if (tasksList.length === 0) return <span className="text-gray-400">-</span>;
                                                  return (
                                                    <div className="flex flex-col gap-1">
                                                      <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 w-fit">
                                                          {tasksList.length} task(s)
                                                        </span>
                                                        {log.is_tasks_approved === 1 ? (
                                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                                            <ShieldCheck size={10} className="mr-1" /> Approved
                                                          </span>
                                                        ) : (
                                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700">
                                                            Pending Approval
                                                          </span>
                                                        )}
                                                      </div>
                                                      <ul className="list-disc pl-4 mt-1 text-[11px] text-gray-600 space-y-0.5">
                                                        {tasksList.map((t, tidx) => (
                                                          <li key={tidx}>{t}</li>
                                                        ))}
                                                      </ul>
                                                      {log.is_tasks_approved !== 1 && isAdminOrManager && (
                                                        <button 
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApproveTasks(log.id);
                                                          }}
                                                          className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
                                                        >
                                                          <CheckSquare size={12} /> Approve Tasks
                                                        </button>
                                                      )}
                                                    </div>
                                                  );
                                                })()}
                                              </td>
                                              <td className="py-2 px-3">
                                                {isOpen ? (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                    Open
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Completed
                                                  </span>
                                                )}
                                              </td>
                                              {isSuperadmin && (
                                                <td className="py-2 px-3">
                                                  <button 
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingLog(log);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900 font-bold hover:underline"
                                                  >
                                                    Edit
                                                  </button>
                                                </td>
                                              )}
                                            </tr>
                                          );
                                        }) : (
                                          <tr>
                                            <td colSpan="6" className="py-4 text-center text-gray-500">
                                              No logs available for this date
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showManualEntryModal && (
        <ManualAttendanceModal 
          employees={employees}
          onClose={() => setShowManualEntryModal(false)}
          onSubmit={handleManualEntry}
        />
      )}
      {editingLog && (
        <EditAttendanceModal 
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSubmit={handleUpdateLog}
        />
      )}
    </div>
  );
};

const ManualAttendanceModal = ({ employees, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in_time: '09:00:00',
    check_out_time: '18:00:00',
    location: 'Office'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100"
      >
        <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black leading-tight">Manual Entry</h3>
            <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">Admin Override</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Employee</label>
            <select 
              name="employee_id" 
              value={formData.employee_id} 
              onChange={handleChange} 
              className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
              required
            >
              <option value="">-- Select --</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Check-in</label>
              <input 
                type="time" 
                step="1"
                name="check_in_time" 
                value={formData.check_in_time} 
                onChange={handleChange} 
                className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Check-out</label>
              <input 
                type="time" 
                step="1"
                name="check_out_time" 
                value={formData.check_out_time} 
                onChange={handleChange} 
                className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Location</label>
            <select 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option>Office</option>
              <option>Remote</option>
              <option>On-Site</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              Save Record
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const EditAttendanceModal = ({ log, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    date: log.date || '',
    check_in_time: log.check_in_time || '09:00:00',
    check_out_time: log.check_out_time || '',
    location: log.location || 'Office'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSend = {
      date: formData.date,
      check_in_time: formData.check_in_time,
      check_out_time: formData.check_out_time || null,
      location: formData.location
    };
    onSubmit(log.id, dataToSend);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100"
      >
        <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black leading-tight">Edit Attendance</h3>
            <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">Super Admin Override</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Date</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Check-in</label>
              <input 
                type="time" 
                step="1"
                name="check_in_time" 
                value={formData.check_in_time} 
                onChange={handleChange} 
                className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Check-out</label>
              <input 
                type="time" 
                step="1"
                name="check_out_time" 
                value={formData.check_out_time} 
                onChange={handleChange} 
                className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Location</label>
            <select 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option>Office</option>
              <option>Remote</option>
              <option>On-Site</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
              Update
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const MonthlyReport = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [report, setReport] = useState(null);
  const [salaryPayment, setSalaryPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format

  useEffect(() => {
    api.get('/employees?active_only=true').then(res => setEmployees(res.data));
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchReport();
    }
  }, [selectedEmployeeId, date]);

  const fetchReport = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    const [yearStr, monthStr] = date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    try {
      const response = await api.get(`/attendance/monthly-report/${selectedEmployeeId}`, {
        params: { year, month }
      });
      setReport(response.data);
      
      try {
        const paymentRes = await api.get(`/employees/${selectedEmployeeId}/salary-payments`);
        const payments = paymentRes.data;
        const matchingPayment = payments.find(p => p.year === year && p.month_number === month);
        setSalaryPayment(matchingPayment || null);
      } catch(e) {
        console.error('Failed to fetch salary payments', e);
        setSalaryPayment(null);
      }
    } catch (error) {
      console.error("Failed to fetch monthly report", error);
      const errorMsg = error.response?.data?.detail;
      const message = typeof errorMsg === 'string' ? errorMsg : 'Failed to load monthly report';
      console.error(message);
      setReport(null);
      setSalaryPayment(null);
    } finally {
      setLoading(false);
    }
  };

  const ReportCard = ({ title, value, colorClass }) => (
    <div className={`p-4 rounded-lg shadow ${colorClass}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
        <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="w-full p-2 border rounded-md">
          <option value="">-- Select Employee --</option>
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
        <input type="month" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md" />
      </div>

      {loading && <p>Loading report...</p>}

      {report && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h3 className="text-xl font-bold">Monthly Report for {report.year && report.month ? new Date(report.year, report.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : date}</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ReportCard title="Total Days" value={report.total_days || 0} colorClass="bg-blue-100 text-blue-800" />
            <ReportCard title="Full Days" value={report.present_days || 0} colorClass="bg-green-100 text-green-800" />
            <ReportCard title="Half Days" value={report.half_days || 0} colorClass="bg-yellow-100 text-yellow-800" />
            <ReportCard title="Partial Days" value={report.partial_days || 0} colorClass="bg-orange-100 text-orange-800" />
            <ReportCard title="Paid Leaves" value={report.paid_leaves_taken || 0} colorClass="bg-indigo-100 text-indigo-800" />
            <ReportCard title="Unpaid/Absent" value={report.unpaid_leaves || 0} colorClass="bg-red-100 text-red-800" />
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold mb-2">Annual Leave Balance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Paid Leave</p>
                <p>Balance: <span className="font-bold">{report.paid_leave_balance || 0}</span> / {report.total_paid_leaves_year || 0}</p>
              </div>
              <div>
                <p className="font-medium">Sick Leave</p>
                <p>Balance: <span className="font-bold">{report.sick_leave_balance || 0}</span> / {report.total_sick_leaves_year || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold mb-2">Salary Calculation for the Month</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="font-medium text-gray-600">Base Salary</p><p className="font-bold text-lg">{formatCurrency(report.base_salary || 0)}</p>
              </div>
              <div>
                <p className="font-medium text-red-600">Deductions (Unpaid)</p><p className="font-bold text-lg text-red-500">- {formatCurrency(report.deductions || 0)}</p>
              </div>
              <div>
                <p className="font-medium text-amber-600">Deductions (Advance)</p>
                <p className="font-bold text-lg text-amber-500">- {formatCurrency(report.advance_deductions || 0)}</p>
                <p className="text-xs text-gray-500">({report.advance_count || 0} advances)</p>
              </div>
              <div>
                <p className="font-medium text-blue-600">Unused Leave Bonus</p>
                <p className="font-bold text-lg text-blue-500">+ {formatCurrency(report.leave_encashment_amount || 0)}</p>
                <p className="text-xs text-gray-500">({report.unused_paid_leaves || 0} unused paid leaves)</p>
              </div>
              <div>
                <p className="font-medium text-green-600">Net Salary</p><p className="font-bold text-xl text-green-700">{formatCurrency(report.net_salary || 0)}</p>
              </div>
            </div>
          </div>

          {salaryPayment && (
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <h4 className="font-semibold mb-2 text-green-700">Salary Paid Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-gray-500">Status</p><p className="font-bold text-green-600">PAID</p></div>
                <div><p className="text-gray-500">Paid Amount</p><p className="font-bold">{formatCurrency(salaryPayment.net_salary)}</p></div>
                <div><p className="text-gray-500">Payment Method</p><p className="font-bold capitalize">{salaryPayment.payment_method || '-'}</p></div>
                <div><p className="text-gray-500">Payment Date</p><p className="font-bold">{salaryPayment.payment_date ? new Date(salaryPayment.payment_date).toLocaleDateString() : '-'}</p></div>
              </div>
              {salaryPayment.notes && <p className="mt-2 text-xs text-gray-500">Notes: {salaryPayment.notes}</p>}
            </div>
          )}

        </motion.div>
      )}
    </div>
  );
};

const LiveLocationTracking = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchActiveEmployees = () => {
    api.get('/employees/status-overview')
      .then(res => {
        setEmployees(res.data?.active_employees || []);
      })
      .catch(err => console.error("Failed to fetch active employees", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActiveEmployees();
    const interval = setInterval(fetchActiveEmployees, 45000); // Auto-refresh active employee coordinates
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async (empId, date) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/employees/${empId}/location-history?date=${date}`);
      setLocationData(res.data);
    } catch (e) {
      console.error("Failed to fetch location history", e);
      setLocationData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmp) {
      fetchHistory(selectedEmp.id, selectedDate);
    } else {
      setLocationData(null);
    }
  }, [selectedEmp, selectedDate]);

  // Handle Map Rendering
  useEffect(() => {
    if (!mapRef.current) return;

    const loadMap = () => {
      if (typeof window.L !== 'undefined') {
        initMap();
        return;
      }

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        setTimeout(initMap, 300);
      }
    };

    const initMap = () => {
      const L = window.L;
      if (!L || !mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      let center = [11.6585668, 76.2334917]; // Resort coordinates fallback
      let zoom = 14;

      // Calculate center based on selected employee current coords or trail
      if (selectedEmp && selectedEmp.latitude && selectedEmp.longitude) {
        center = [selectedEmp.latitude, selectedEmp.longitude];
        zoom = 16;
      } else if (locationData?.trail?.length > 0) {
        const lastPoint = locationData.trail[locationData.trail.length - 1];
        center = [lastPoint.lat, lastPoint.lng];
        zoom = 16;
      } else {
        // Find center of all active employees
        const tracked = employees.filter(e => e.latitude && e.longitude);
        if (tracked.length > 0) {
          center = [tracked[0].latitude, tracked[0].longitude];
        }
      }

      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Mode A: Selected Employee History & Route Polyline
      if (selectedEmp) {
        const trail = locationData?.trail || [];
        const currentLat = selectedEmp.latitude;
        const currentLng = selectedEmp.longitude;

        if (trail.length > 1) {
          const latlngs = trail.map(p => [p.lat, p.lng]);
          L.polyline(latlngs, { color: '#f97316', weight: 4, opacity: 0.85, dashArray: '8, 6' }).addTo(map);

          // Green start marker
          const startIcon = L.divIcon({
            html: `<div style="width:14px;height:14px;background:#22c55e;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.4)"></div>`,
            className: '', iconAnchor: [7, 7]
          });
          L.marker([trail[0].lat, trail[0].lng], { icon: startIcon })
            .addTo(map)
            .bindPopup(`<b>🟢 Start Point</b><br>${new Date(trail[0].timestamp + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`);

          // Middle tracking dots
          trail.slice(1, -1).forEach((p, idx) => {
            const dot = L.divIcon({
              html: `<div style="width:8px;height:8px;background:#fb923c;border:1.5px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
              className: '', iconAnchor: [4, 4]
            });
            L.marker([p.lat, p.lng], { icon: dot })
              .addTo(map)
              .bindPopup(`<b>Ping ${idx + 2}</b><br>${new Date(p.timestamp + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`);
          });
        }

        // Live location marker (orange pulse)
        if (currentLat && currentLng) {
          const liveIcon = L.divIcon({
            html: `
              <div style="position:relative;width:24px;height:24px">
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.6);z-index:10"></div>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;background:rgba(239,68,68,0.25);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></div>
              </div>`,
            className: '', iconAnchor: [12, 12]
          });
          L.marker([currentLat, currentLng], { icon: liveIcon })
            .addTo(map)
            .bindPopup(`<b>📍 Live Position</b><br>${selectedEmp.name}<br>Last Active: ${locationData?.last_location_update ? new Date(locationData.last_location_update + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Just now'}`)
            .openPopup();
        }

        // Zoom map bounds to fit the whole route
        const bounds = [
          ...(currentLat && currentLng ? [[currentLat, currentLng]] : []),
          ...trail.map(p => [p.lat, p.lng])
        ];
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }

      } else {
        // Mode B: Show all active tracked employees on the map
        const markers = [];
        employees.forEach(emp => {
          if (emp.latitude && emp.longitude) {
            const pinIcon = L.divIcon({
              html: `
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <div style="background:#f97316;color:white;font-weight:bold;font-size:10px;padding:2px 6px;border-radius:10px;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;margin-bottom:2px;">
                    ${emp.name}
                  </div>
                  <div style="width:16px;height:16px;background:#ea580c;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.4)"></div>
                </div>`,
              className: '', iconAnchor: [30, 26]
            });
            const m = L.marker([emp.latitude, emp.longitude], { icon: pinIcon })
              .addTo(map)
              .bindPopup(`<b>📍 ${emp.name}</b><br>${emp.role}<br>Last Active: ${emp.last_location_update ? new Date(emp.last_location_update + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Unknown'}`);
            markers.push(m);
          }
        });

        // Fit map bounds to show all markers
        if (markers.length > 1) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds(), { padding: [50, 50] });
        } else if (markers.length === 1) {
          map.setView(markers[0].getLatLng(), 15);
        }
      }
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [employees, selectedEmp, locationData]);

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[75vh]">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin size={22} />
            Live Location Tracking Board
          </h2>
          <p className="text-orange-100 text-sm">Real-time GPS movement of on-duty staff</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedEmp && (
            <button
              onClick={() => setSelectedEmp(null)}
              className="bg-white/20 hover:bg-white/30 text-white px-3.5 py-1.5 rounded-lg text-sm transition-colors font-medium border border-white/20"
            >
              ← Show All Staff Map
            </button>
          )}
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-sm bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left list sidebar */}
        <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
          <div className="p-4 bg-white border-b border-gray-100">
            <input
              type="text"
              placeholder="Search active staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3.5 py-2 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">Loading active staff...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm italic">No on-duty employees found.</div>
            ) : (
              filteredEmployees.map(emp => {
                const isSelected = selectedEmp?.id === emp.id;
                const hasGPS = emp.latitude && emp.longitude;
                return (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmp(emp)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-orange-50 border-orange-200 shadow-sm'
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-gray-800 text-sm">{emp.name}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${hasGPS ? 'bg-green-500' : 'bg-red-400'}`}></span>
                        <span className="text-[10px] text-gray-400 font-medium">{hasGPS ? 'Active' : 'No Signal'}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 capitalize">{emp.role}</div>
                    
                    {emp.check_in_time && (
                      <div className="text-[11px] text-green-700 mt-2 font-medium bg-green-50/50 px-2 py-0.5 rounded inline-block">
                        ✓ On Duty since {emp.check_in_time.slice(0, 5)}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Map/Trail area */}
        <div className="flex-1 relative flex flex-col">
          {/* Map display */}
          <div className="flex-1 relative min-h-[300px]">
            {historyLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-20">
                <div className="animate-spin w-9 h-9 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-gray-500 text-sm font-medium">Fetching movement history...</p>
              </div>
            ) : null}
            
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Details / History bar if selected */}
          {selectedEmp && locationData && (
            <div className="border-t border-gray-100 bg-white p-4 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-800">
                  Route Trail for {selectedEmp.name} ({locationData.total_points} pings recorded)
                </h4>
                {locationData.last_location_update && (
                  <span className="text-xs text-gray-400">
                    Last update received: {new Date(locationData.last_location_update + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                )}
              </div>
              
              {locationData.trail?.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto py-2">
                  {locationData.trail.map((p, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 min-w-[140px] border border-gray-100 flex-shrink-0 text-center">
                      <div className="font-semibold text-xs text-orange-600">
                        {idx === 0 ? '🟢 Start' : idx === locationData.trail.length - 1 ? '🔴 Current' : `Point ${idx + 1}`}
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        {new Date(p.timestamp + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic text-center py-4">No location pings recorded for this date.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationModal, setLocationModal] = useState(null); // { employee }
  const [locationData, setLocationData] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchOverview = () => {
    setLoading(true);
    api.get('/employees/status-overview')
      .then(res => setOverview(res.data))
      .catch(err => console.error("Failed to fetch status overview", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const openLocationModal = async (emp) => {
    setLocationModal(emp);
    setLocationData(null);
    setLocationLoading(true);
    try {
      const res = await api.get(`/employees/${emp.id}/location-history?date=${selectedDate}`);
      setLocationData(res.data);
    } catch (e) {
      console.error("Failed to fetch location history", e);
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchLocationForDate = async (empId, date) => {
    setLocationData(null);
    setLocationLoading(true);
    try {
      const res = await api.get(`/employees/${empId}/location-history?date=${date}`);
      setLocationData(res.data);
    } catch (e) {
      console.error("Failed to fetch location history", e);
    } finally {
      setLocationLoading(false);
    }
  };

  // Initialize map when locationData changes
  useEffect(() => {
    if (!locationData || !mapRef.current) return;

    // Load Leaflet dynamically
    const loadMap = () => {
      if (typeof window.L !== 'undefined') {
        initMap();
        return;
      }

      // Load CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        // Script tag exists, wait a bit
        setTimeout(initMap, 300);
      }
    };

    const initMap = () => {
      const L = window.L;
      if (!L || !mapRef.current) return;

      // Destroy previous map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const trail = locationData.trail || [];
      const currentLat = locationData.current_latitude;
      const currentLng = locationData.current_longitude;

      // Determine center
      let center = [10.8505, 76.2711]; // Kerala default
      if (currentLat && currentLng) {
        center = [currentLat, currentLng];
      } else if (trail.length > 0) {
        center = [trail[trail.length - 1].lat, trail[trail.length - 1].lng];
      }

      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 16);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Draw trail polyline
      if (trail.length > 1) {
        const latlngs = trail.map(p => [p.lat, p.lng]);
        L.polyline(latlngs, { color: '#f97316', weight: 3, opacity: 0.8, dashArray: '6,4' }).addTo(map);

        // Start marker (green)
        const startIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
          className: '', iconAnchor: [7, 7]
        });
        L.marker([trail[0].lat, trail[0].lng], { icon: startIcon })
          .addTo(map)
          .bindPopup(`<b>Start</b><br>${new Date(trail[0].timestamp + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`);

        // Intermediate dots
        trail.slice(1, -1).forEach((p, i) => {
          const dot = L.divIcon({
            html: `<div style="width:8px;height:8px;background:#fb923c;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
            className: '', iconAnchor: [4, 4]
          });
          L.marker([p.lat, p.lng], { icon: dot })
            .addTo(map)
            .bindPopup(`<b>Point ${i + 2}</b><br>${new Date(p.timestamp + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`);
        });
      } else if (trail.length === 1) {
        const singleIcon = L.divIcon({
          html: `<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
          className: '', iconAnchor: [6, 6]
        });
        L.marker([trail[0].lat, trail[0].lng], { icon: singleIcon })
          .addTo(map)
          .bindPopup(`<b>${new Date(trail[0].timestamp + 'Z').toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</b>`);
      }

      // Current location marker (orange pulse)
      if (currentLat && currentLng) {
        const currentIcon = L.divIcon({
          html: `
            <div style="position:relative;width:20px;height:20px">
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(249,115,22,0.3);z-index:10"></div>
            </div>`,
          className: '', iconAnchor: [10, 10]
        });
        L.marker([currentLat, currentLng], { icon: currentIcon })
          .addTo(map)
          .bindPopup(`<b>📍 Current Location</b><br>${locationData.employee_name}`)
          .openPopup();
      }

      // Fit bounds to all points
      const allPoints = [
        ...(currentLat && currentLng ? [[currentLat, currentLng]] : []),
        ...trail.map(p => [p.lat, p.lng])
      ];
      if (allPoints.length > 1) {
        map.fitBounds(allPoints, { padding: [30, 30] });
      }
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locationData]);

  const formatIST = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr.endsWith('Z') ? isoStr : isoStr + 'Z');
    return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const EmployeeList = ({ title, employees, colorClass, bgDot, showLocation = false }) => (
    <div className={`p-4 rounded-xl shadow-sm border ${colorClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-lg flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${bgDot}`}></span>
          {title}
          <span className="text-base font-extrabold ml-1">({employees.length})</span>
        </h4>
      </div>
      {employees.length > 0 ? (
        <ul className="space-y-1.5 text-sm max-h-72 overflow-y-auto">
          {employees.map(emp => (
            <li key={emp.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/60 transition-colors">
              <div>
                <span className="font-medium">{emp.name}</span>
                {emp.check_in_time && (
                  <span className="ml-2 text-xs text-green-700 font-medium">
                    ✓ IN {typeof emp.check_in_time === 'string' ? emp.check_in_time.slice(0,5) : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 capitalize">{emp.role}</span>
                {showLocation && (
                  <button
                    onClick={() => openLocationModal(emp)}
                    title="View Location & Movement"
                    className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-md transition-colors font-medium"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    Track
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">No employees in this category.</p>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      <span className="ml-3 text-gray-500">Loading org status...</span>
    </div>
  );
  if (!overview) return <p className="text-center text-gray-500 py-10">Could not load org status.</p>;

  const totalActive = overview.active_employees?.length || 0;
  const totalOnLeave = (overview.on_paid_leave?.length || 0) + (overview.on_sick_leave?.length || 0) + (overview.on_unpaid_leave?.length || 0);
  const totalInactive = overview.inactive_employees?.length || 0;
  const grandTotal = totalActive + totalOnLeave + totalInactive;

  return (
    <div className="space-y-6">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: grandTotal, color: 'text-gray-800', bg: 'bg-gray-50 border-gray-200' },
          { label: 'On Duty', value: totalActive, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          { label: 'On Leave', value: totalOnLeave, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Off Duty', value: totalInactive, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 text-center ${k.bg}`}>
            <div className={`text-3xl font-extrabold ${k.color}`}>{k.value}</div>
            <div className="text-sm text-gray-500 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Grid of category lists */}
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <EmployeeList title="On Duty" employees={overview.active_employees || []} colorClass="bg-green-50 text-green-900 border-green-200" bgDot="bg-green-500" showLocation={true} />
          <EmployeeList title="On Paid Leave" employees={overview.on_paid_leave || []} colorClass="bg-blue-50 text-blue-900 border-blue-200" bgDot="bg-blue-500" />
          <EmployeeList title="On Sick Leave" employees={overview.on_sick_leave || []} colorClass="bg-yellow-50 text-yellow-900 border-yellow-200" bgDot="bg-yellow-500" />
          <EmployeeList title="On Unpaid Leave" employees={overview.on_unpaid_leave || []} colorClass="bg-purple-50 text-purple-900 border-purple-200" bgDot="bg-purple-500" />
          <EmployeeList title="Off Duty" employees={overview.inactive_employees || []} colorClass="bg-red-50 text-red-900 border-red-200" bgDot="bg-red-400" />
        </motion.div>
      </AnimatePresence>

      {/* Location Modal */}
      {locationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold">📍 {locationModal.name}</h3>
                <p className="text-orange-100 text-sm capitalize">{locationModal.role} · Location Tracking</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    fetchLocationForDate(locationModal.id, e.target.value);
                  }}
                  className="text-sm bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button onClick={() => { setLocationModal(null); setLocationData(null); }} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Map Area */}
              <div className="flex-1 relative bg-gray-100 min-h-[300px]">
                {locationLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                    <p className="mt-3 text-gray-500 text-sm">Loading location data...</p>
                  </div>
                ) : locationData && (locationData.trail?.length > 0 || locationData.current_latitude) ? (
                  <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3 opacity-40">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <p className="text-sm font-medium">No location data for {selectedDate}</p>
                    <p className="text-xs mt-1">Employee may not have been tracked on this date</p>
                  </div>
                )}
              </div>

              {/* Trail Sidebar */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Movement Trail</div>
                  {locationData && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{locationData.total_points} points</span>
                      {locationData.last_location_update && (
                        <span className="text-xs text-gray-400">Last: {formatIST(locationData.last_location_update)}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                  {locationLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : locationData?.trail?.length > 0 ? (
                    <div className="relative px-4">
                      {/* Vertical timeline line */}
                      <div className="absolute left-7 top-3 bottom-3 w-0.5 bg-orange-200"></div>
                      {locationData.trail.map((point, idx) => (
                        <div key={idx} className="relative flex items-start gap-3 mb-3">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 border-white shadow z-10 mt-0.5 ${idx === 0 ? 'bg-green-500' : idx === locationData.trail.length - 1 ? 'bg-orange-500' : 'bg-orange-300'}`}></div>
                          <div className="bg-white rounded-lg px-2.5 py-1.5 text-xs shadow-sm border border-gray-100 flex-1">
                            <div className="font-semibold text-gray-700">
                              {idx === 0 ? '🟢 Start' : idx === locationData.trail.length - 1 ? '🔴 Last' : `Point ${idx + 1}`}
                            </div>
                            <div className="text-gray-500 mt-0.5">{formatIST(point.timestamp)}</div>
                            <div className="text-gray-400 text-[10px]">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !locationLoading && locationData ? (
                    <div className="text-center py-8 text-gray-400 text-sm px-4">
                      <p>No movement recorded</p>
                      <p className="text-xs mt-1">for {selectedDate}</p>
                    </div>
                  ) : null}
                </div>

                {/* Current Location Footer */}
                {locationData?.current_latitude && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-orange-50">
                    <div className="text-xs text-orange-700 font-semibold mb-1">📍 Current Position</div>
                    <div className="text-xs text-gray-600">{locationData.current_latitude?.toFixed(5)}, {locationData.current_longitude?.toFixed(5)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Updated: {formatIST(locationData.last_location_update)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



const EmployeeListAndForm = ({ showInactiveOnly = false }) => {
  const { activeBranchId } = useBranch();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: "", role: "", salary: "", join_date: "", email: "", phone: "", password: "", daily_tasks: [], image: null });
  const [previewImage, setPreviewImage] = useState(null);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [editId, setEditId] = useState(null);
  const [salaryFilter, setSalaryFilter] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hoveredKPI, setHoveredKPI] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const mediaBaseUrl = useMemo(() => getMediaBaseUrl(), []);

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [showInactiveOnly, activeBranchId]);

  const authHeader = () => ({ 
    headers: { 
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "X-Branch-ID": localStorage.getItem("activeBranchId") || "all"
    } 
  });

  const fetchEmployees = async () => {
    try {
      // For Directory tab: active_only=true; For Former Staff tab: active_only=false
      const activeParam = showInactiveOnly ? 'false' : 'true';
      const [usersRes, employeesRes] = await Promise.all([
        api.get("/users/?skip=0&limit=1000", authHeader()),
        api.get(`/employees?skip=0&limit=1000&active_only=${activeParam}`, authHeader())
      ]);

      const users = usersRes.data || [];
      const employees = employeesRes.data || [];

      // Create a map of employees by user_id for quick lookup
      const employeeMap = new Map();
      employees.forEach(emp => {
        if (emp.user_id) {
          employeeMap.set(emp.user_id, emp);
        }
      });

      // Combine users with their employee data
      const combinedUsers = users
        .filter(user => {
          const roleName = (user.role?.name || "").toLowerCase().trim();
          const isGuest = roleName === 'guest' || roleName === 'guest user';
          const hasEmpRecord = employeeMap.has(user.id);
          const isAdmin = user.email === 'admin@orchid.com';
          // For Former Staff tab (showInactiveOnly): show only inactive
          // For Directory tab (!showInactiveOnly): skip admin-only users, show active
          if (showInactiveOnly) {
            return !isGuest && hasEmpRecord;
          }
          return !isGuest && (hasEmpRecord || isAdmin);
        }) // Hide guest users and users without employee records (except admin)
        .map(user => {
          const empData = employeeMap.get(user.id);
          return {
            id: user.id,
            employee_id: empData?.id || null, // Use this for API routes referencing employee_id
            name: user.name,
            email: user.email,
            role: user.role?.name || 'Unknown',
            phone: user.phone,
            is_active: empData ? empData.is_active : user.is_active,
            // Add employee-specific data if available
            salary: empData?.salary || null,
            join_date: empData?.join_date || null,
            image_url: empData?.image_url || null,
            daily_tasks: empData?.daily_tasks || null,
            has_employee_record: !!empData,
            status: empData?.status || 'off_duty',
            current_status: empData?.current_status || 'Off Duty',
            is_clocked_in: empData?.is_clocked_in || false,
            trend: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000))
          };
        });

      setEmployees(combinedUsers);
      setHasMore(combinedUsers.length >= 1000);
      setPage(1);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get("/roles?limit=1000", authHeader());
      setRoles(res.data);
    } catch (err) {
      console.error("Error fetching roles:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setForm({ ...form, image: file });
      setPreviewImage(URL.createObjectURL(file));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      // For edit, password is optional
      const requiredFields = ["name", "role", "salary", "join_date", "email"];
      for (const field of requiredFields) {
        if (!form[field]) {
          alert(`Please fill in the required field: ${field}`);
          return;
        }
      }
    } else {
      // For create, password is required
      const requiredFields = ["name", "role", "salary", "join_date", "email", "password"];
      for (const field of requiredFields) {
        if (!form[field]) {
          alert(`Please fill in the required field: ${field}`);
          return;
        }
      }
    }
    const data = new FormData();
    data.append("name", form.name);
    data.append("role", form.role);
    data.append("salary", form.salary);
    data.append("join_date", form.join_date);
    data.append("email", form.email);
    if (editId) {
      // Only append password if it's provided (for edit)
      if (form.password && form.password.trim()) {
        data.append("password", form.password);
      }
      // Append is_active status if it exists
      if (form.is_active !== undefined) {
        data.append("is_active", String(form.is_active)); // Convert to string for FormData
      }
    } else {
      // For create, password is required
      data.append("password", form.password);
    }
    if (form.phone) data.append("phone", form.phone);
    if (form.join_date) data.append("join_date", form.join_date);
    if (form.daily_tasks) data.append("daily_tasks", JSON.stringify(form.daily_tasks));
    if (form.image) data.append("image", form.image);

    try {
      if (editId) {
        await api.put(`/employees/${editId}`, data, authHeader());
      } else {
        await api.post("/employees", data, authHeader());
      }
      fetchEmployees();
      resetForm();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || "An error occurred while saving the employee.";
      console.error("Error saving employee:", err.response || err);
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setForm({ name: "", role: "", salary: "", join_date: "", email: "", phone: "", password: "", daily_tasks: [], is_active: true, image: null });
    setPreviewImage(null);
    setEditId(null);
    setNewTaskInput("");
  };

  const handleEdit = (emp) => {
    if (!emp.has_employee_record) {
      alert("This system user does not have an employee record to edit.");
      return;
    }
    setEditId(emp.employee_id);

    let parsedTasks = [];
    try {
      parsedTasks = emp.daily_tasks ? JSON.parse(emp.daily_tasks) : [];
      if (!Array.isArray(parsedTasks)) parsedTasks = emp.daily_tasks ? [emp.daily_tasks] : [];
    } catch {
      parsedTasks = emp.daily_tasks ? [emp.daily_tasks] : [];
    }

    setForm({
      name: emp.name,
      role: emp.role,
      salary: emp.salary,
      join_date: emp.join_date ? emp.join_date.split("T")[0] : "",
      email: emp.email,
      phone: emp.phone,
      password: "", // Leave empty for edit - only update if provided
      daily_tasks: parsedTasks,
      is_active: emp.is_active !== undefined ? emp.is_active : true,
      image: null,
    });
    // Build full URL for the preview image
    if (emp.image_url) {
      const imagePath = emp.image_url.startsWith('/') ? emp.image_url.substring(1) : emp.image_url;
      setPreviewImage(`${mediaBaseUrl}/${imagePath}`);
    } else {
      setPreviewImage(null);
    }
  };

  const handleToggleActive = async (emp) => {
    if (!window.confirm(`Are you sure you want to ${emp.is_active ? 'deactivate' : 'activate'} this employee?`)) {
      return;
    }
    if (!emp.has_employee_record) {
      alert("Cannot manage status of system users without an employee record here.");
      return;
    }
    try {
      const data = new FormData();
      data.append("is_active", String(!emp.is_active)); // Convert to string for FormData
      await api.put(`/employees/${emp.employee_id}`, data, authHeader());
      fetchEmployees();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || "An error occurred while updating employee status.";
      console.error("Error updating employee:", err.response || err);
      alert(errorMessage);
    }
  };

  const handleDelete = async (emp) => {
    if (!emp.has_employee_record) {
      alert("Cannot delete system users without an employee record here.");
      return;
    }
    if (window.confirm("Delete this employee?")) {
      await api.delete(`/employees/${emp.employee_id}`, authHeader());
      fetchEmployees();
    }
  };

  const loadMoreEmployees = async () => {
    if (isFetchingMore || !hasMore) return;
    const nextPage = page + 1;
    setIsFetchingMore(true);
    try {
      const res = await api.get(`/employees?skip=${(nextPage - 1) * 20}&limit=20`, authHeader());
      const newEmployees = res.data || [];
      const dataWithTrend = newEmployees.map((emp) => ({ ...emp, trend: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000)) }));
      setEmployees(prev => [...prev, ...dataWithTrend]);
      setPage(nextPage);
      setHasMore(newEmployees.length >= 20);
    } catch (err) {
      console.error("Failed to load more employees:", err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const filteredEmployees = employees
    .filter(emp => showInactiveOnly ? !emp.is_active : emp.is_active)
    .filter((emp) => salaryFilter ? emp.salary >= parseFloat(salaryFilter) : true);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredEmployees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees.xlsx");
  };

  const totalEmployees = employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).length;
  const avgSalary = totalEmployees > 0 ? Math.round(employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).reduce((acc, e) => acc + (e?.salary || 0), 0) / totalEmployees) : 0;
  const rolesCount = roles.map((r) => ({ name: r.name, count: employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).filter((e) => e.role === r.name).length, trend: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000)) }));
  const kpiData = [{ label: "Total Employees", value: totalEmployees, color: "#4f46e5", trend: employees.map(e => e?.salary || 0) }, { label: "Avg Salary", value: avgSalary, color: "#16a34a", trend: employees.map(e => e?.salary || 0) }, ...rolesCount.map(r => ({ label: r.name, value: r.count, color: "#f59e0b", trend: r.trend }))];

  return (
    <div className="space-y-6">
      {/* Directory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
          <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Onboarded Talent</p>
          <div className="flex items-center justify-between">
            <h4 className="text-4xl font-black">{showInactiveOnly ? employees.filter(e => !e.is_active).length : employees.filter(e => e.is_active).length}</h4>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <Users size={24} />
            </div>
          </div>
          <p className="text-[10px] mt-4 font-bold border-t border-white/10 pt-3">
            {employees.filter(e => e.is_active).length} Active | {employees.filter(e => !e.is_active).length} Inactive
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Financial Commitment</p>
          <h4 className="text-3xl font-black text-gray-800">
            {formatCurrency(employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).reduce((acc, e) => acc + (e?.salary || 0), 0))}
          </h4>
          <p className="text-[10px] mt-4 font-bold text-gray-400">Total Monthly Salary Burden</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Operational Capacity</p>
            <div className="flex -space-x-2 mt-2">
              {employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).slice(0, 5).map((e, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-black overflow-hidden shadow-sm">
                  {e.image_url ? <img src={`${mediaBaseUrl}/${e.image_url}`} className="w-full h-full object-cover" /> : e.name.charAt(0)}
                </div>
              ))}
              {employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).length > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-900 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                  +{employees.filter(e => showInactiveOnly ? !e.is_active : e.is_active).length - 5}
                </div>
              )}
            </div>
          </div>
          {!showInactiveOnly && (
            <button
              onClick={() => { setEditId(null); resetForm(); }}
              className="w-full mt-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100"
            >
              Onboard New Staff
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Form Panel */}
        {!showInactiveOnly ? (
          <div className="xl:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
              <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
              {editId ? "Update Staff Dossier" : "New Staff Onboarding"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-400 cursor-pointer">
                    {previewImage ? (
                      <img src={previewImage} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2 text-gray-400">
                        <User size={24} className="mx-auto mb-1" />
                        <p className="text-[8px] font-black uppercase">Upload Photo</p>
                      </div>
                    )}
                    <input type="file" name="image" accept="image/*" onChange={handleFormChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity & Title</p>
                  <input name="name" value={form.name} onChange={handleFormChange} placeholder="Full Legal Name" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" required />
                  <select name="role" value={form.role} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all mt-2" required>
                    <option value="">Assigned Role / Department</option>
                    {roles.map((role) => (<option key={role.id} value={role.name}>{role.name}</option>))}
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logistics & Start</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="salary" type="number" value={form.salary} onChange={handleFormChange} placeholder="Salary (₹)" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" required />
                    <input type="date" name="join_date" value={form.join_date} onChange={handleFormChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" required />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact & Credentials</p>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="Corporate Email" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all" required />
                  <input name="phone" type="tel" value={form.phone} onChange={handleFormChange} placeholder="Phone Number" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all mt-2" />
                  <input name="password" type="password" value={form.password} onChange={handleFormChange} placeholder={editId ? "Overwrite Password (Optional)" : "System Password"} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all mt-2" required={!editId} />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Daily Operations (To-Do List)</p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTaskInput.trim()) {
                            setForm({ ...form, daily_tasks: [...form.daily_tasks, newTaskInput.trim()] });
                            setNewTaskInput("");
                          }
                        }
                      }}
                      placeholder="Add a new task & press Enter..."
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTaskInput.trim()) {
                          setForm({ ...form, daily_tasks: [...form.daily_tasks, newTaskInput.trim()] });
                          setNewTaskInput("");
                        }
                      }}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                    >
                      Add
                    </button>
                  </div>

                  {form.daily_tasks && form.daily_tasks.length > 0 && (
                    <ul className="space-y-2 mt-4">
                      {form.daily_tasks.map((task, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm group">
                          <span className="text-gray-800 text-sm font-semibold flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                            {task}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, daily_tasks: form.daily_tasks.filter((_, i) => i !== idx) })}
                            className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 py-3 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl active:scale-95">
                  {editId ? "Confirm Updates" : "Register Employee"}
                </button>
                {editId && (
                  <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                    Discard
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
        ) : null}

        {/* Directory List Panel */}
        <div className={showInactiveOnly ? "xl:col-span-3 space-y-4" : "xl:col-span-2 space-y-4"}>
          <div className="bg-white p-4 items-center rounded-2xl shadow-sm border border-gray-100 flex justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                placeholder="Filter by Minimum Salary Presence..."
                value={salaryFilter}
                onChange={(e) => setSalaryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-100 hover:bg-green-100 transition-all">
              <Package size={14} /> Export Workforce Data
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Dossier</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Role & Compensation</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Logistics</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                          {emp.image_url ? (
                            <img src={`${mediaBaseUrl}/${emp.image_url}`} className="w-full h-full object-cover" />
                          ) : (
                            <User className="text-gray-300" size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight flex items-center gap-2">
                            {emp.name}
                            {!emp.has_employee_record && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black uppercase">System</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Briefcase size={12} className="text-orange-500" />
                          <span className="text-xs font-bold text-gray-700">{emp.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign size={12} className="text-green-500" />
                          <span className="text-xs font-black text-gray-900">{emp.salary ? formatCurrency(emp.salary) : formatCurrency(0)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-bold flex items-center gap-2">
                          <Clock size={12} /> Joined: {emp.join_date || 'N/A'}
                        </p>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${emp.is_clocked_in ? 'bg-green-100 text-green-700' : (emp.status === 'on_leave' ? 'bg-orange-100 text-orange-700' : (emp.is_active ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'))}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${emp.is_clocked_in ? 'bg-green-500 animate-pulse' : (emp.status === 'on_leave' ? 'bg-orange-500' : (emp.is_active ? 'bg-blue-500' : 'bg-red-500'))}`}></div>
                          {emp.is_clocked_in ? 'Online / On Duty' : (emp.status === 'on_leave' ? 'On Leave' : (emp.is_active ? 'In Good Standing' : 'Inactive / Blocked'))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          if (!emp.has_employee_record) {
                            alert("This user does not have an employee record.");
                            return;
                          }
                          setSelectedEmployeeId(emp.employee_id);
                        }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="View Full Profile & Tasks">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleEdit(emp)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Dossier">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleToggleActive(emp)} className={`p-2 rounded-lg transition-all ${emp.is_active ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={emp.is_active ? "Suspend Access" : "Restore Access"}>
                          <AlertCircle size={16} />
                        </button>
                        <button onClick={() => handleDelete(emp)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Purge Record">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center py-4">
            {hasMore && (
              <button
                onClick={loadMoreEmployees}
                disabled={isFetchingMore}
                className="px-8 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-all shadow-sm disabled:opacity-50"
              >
                {isFetchingMore ? "Synchronizing..." : "Load More Records"}
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedEmployeeId && (
        <EmployeeProfileModal
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}
    </div>
  );
};

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/holidays');
      setHolidays(res.data || []);
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newHoliday.date || !newHoliday.name) return;
    const updated = [...holidays, newHoliday];
    try {
      await api.post('/attendance/holidays', updated);
      setHolidays(updated);
      setNewHoliday({ date: '', name: '' });
    } catch (err) {
      alert("Failed to save holiday");
    }
  };

  const handleDateChange = (date) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const mmm = months[date.getMonth()];
    const dd = String(date.getDate()).padStart(2, '0');
    setNewHoliday({ ...newHoliday, date: `${mmm} ${dd}` });
    setShowCalendar(false);
  };

  const handleDelete = async (index) => {
    const updated = holidays.filter((_, i) => i !== index);
    try {
      await api.post('/attendance/holidays', updated);
      setHolidays(updated);
    } catch (err) {
      alert("Failed to delete holiday");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Institutional Calendar</h2>
        <p className="text-sm text-gray-400 font-medium mb-8">Manage official resort holidays and institutional events.</p>

        <div className="flex gap-4 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Date (e.g. DEC 25)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="MMM DD"
                value={newHoliday.date}
                readOnly
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-gray-800 cursor-pointer"
              />
              {showCalendar && (
                <div className="absolute top-full left-0 z-50 mt-2 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 min-w-[300px]">
                  <Calendar
                    onChange={handleDateChange}
                    className="border-none font-sans"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex-[2]">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Holiday Name</label>
            <input
              type="text"
              placeholder="e.g. Independence Day"
              value={newHoliday.name}
              onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-bold text-gray-800"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={!newHoliday.date || !newHoliday.name}
              className="h-[50px] px-8 bg-gray-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg active:scale-95"
            >
              <Plus size={18} />
              <span>Add Holiday</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {holidays.map((h, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 transition-all group shadow-sm hover:shadow-md">
              <div className="flex flex-col items-center justify-center w-14 h-16 bg-orange-50 rounded-xl border border-orange-100">
                <span className="text-[10px] font-black text-orange-400 uppercase leading-none">{h.date.split(' ')[0]}</span>
                <span className="text-xl font-black text-orange-600 leading-none">{h.date.split(' ')[1] || ''}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{h.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                  <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Official Policy</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(i)}
                className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {holidays.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">No holidays configured yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const EmployeeManagement = () => {
  const { hasPermission, isAdmin } = usePermissions();

  const generalTabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp size={18} />, permission: 'employee_management:view' },
    { id: 'manage-employees', label: 'Directory', icon: <Users size={18} />, permission: 'employee_management:view' },
    { id: 'inactive-employees', label: 'Former Staff', icon: <Users size={18} />, permission: 'employee_management:view' },
    { id: 'report', label: 'Activity Tracking', icon: <Search size={18} />, permission: 'reports_global:view' },
  ].filter(tab => hasPermission(tab.permission) || isAdmin);

  const operationsTabs = [
    { id: 'attendance', label: 'Attendance', icon: <Clock size={18} />, permission: 'employee_attendance:view' },
    { id: 'daily-tasks', label: 'Daily Task Report', icon: <CheckSquare size={18} />, permission: 'employee_management:view' },
    { id: 'live-tracking', label: 'Live Location', icon: <MapPin size={18} />, permission: 'employee_management:view' },
    { id: 'leave', label: 'Leave Mgt', icon: <UserCheck size={18} />, permission: 'employee_leave:view' },
    { id: 'salary-advance', label: 'Salary Advance', icon: <DollarSign size={18} />, permission: 'employee_management:view' },
    { id: 'payroll', label: 'Payroll', icon: <DollarSign size={18} />, permission: 'employee_management:view' }, // Payroll usually under employee_management or special perm
  ].filter(tab => hasPermission(tab.permission) || isAdmin);

  const configTabs = [
    { id: 'roles', label: 'Permissions', icon: <ShieldCheck size={18} />, permission: 'roles:view' },
    { id: 'leave-policy', label: 'Policy', icon: <Settings size={18} />, permission: 'employee_management:view' },
    { id: 'holidays', label: 'Holidays', icon: <CalendarIcon size={18} />, permission: 'employee_attendance:view' },
    { id: 'monthly-report', label: 'Reports', icon: <CalendarIcon size={18} />, permission: 'reports_global:view' },
    { id: 'status-overview', label: 'Org Status', icon: <Briefcase size={18} />, permission: 'employee_management:view' },
  ].filter(tab => hasPermission(tab.permission) || isAdmin);

  const allVisibleTabs = [...generalTabs, ...operationsTabs, ...configTabs];
  const [activeTab, setActiveTab] = useState(() => allVisibleTabs[0]?.id || 'overview');

  useEffect(() => {
    if (allVisibleTabs.length > 0 && !allVisibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(allVisibleTabs[0].id);
    }
  }, [allVisibleTabs, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <EmployeeOverview />;
      case 'manage-employees': return <EmployeeListAndForm />;
      case 'inactive-employees': return <EmployeeListAndForm showInactiveOnly={true} />;
      case 'payroll': return <PayrollManagement />;
      case 'salary-advance': return <SalaryAdvanceManagement />;
      case 'report': return <UserHistory />;
      case 'leave': return <LeaveManagement />;
      case 'attendance': return <AttendanceTracking />;
      case 'live-tracking': return <LiveLocationTracking />;
      case 'monthly-report': return <MonthlyReport />;
      case 'status-overview': return <StatusOverview />;
      case 'leave-policy': return <LeavePolicyManagement />;
      case 'roles': return <RoleManagementTab />;
      case 'holidays': return <HolidayManagement />;
      case 'daily-tasks': return <DailyTaskReport />;
      default: return null;
    }
  };

  const TabButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === id
        ? 'bg-orange-500 text-white shadow-md'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
        </div>

        <div className="flex flex-wrap gap-6 items-start">
          {generalTabs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex flex-wrap gap-1">
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full mb-1">General</div>
              {generalTabs.map(tab => (
                <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} />
              ))}
            </div>
          )}

          {operationsTabs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex flex-wrap gap-1">
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full mb-1">Operations</div>
              {operationsTabs.map(tab => (
                <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} />
              ))}
            </div>
          )}

          {configTabs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex flex-wrap gap-1">
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full mb-1">Configuration</div>
              {configTabs.map(tab => (
                <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} />
              ))}
            </div>
          )}
        </div>

        <div>
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployeeManagement;
