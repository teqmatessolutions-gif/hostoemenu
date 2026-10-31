import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import api from '../services/api';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, Calendar as CalendarIcon, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react';

const EmployeeDashboard = () => {
    const [date, setDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [workLogs, setWorkLogs] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [timeOffRequests, setTimeOffRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch employees on mount
    useEffect(() => {
        api.get('/employees').then(res => {
            setEmployees(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedEmployeeId(res.data[0].id);
            }
        });
    }, []);

    // Fetch employee data when selected
    useEffect(() => {
        if (selectedEmployeeId) {
            setLoading(true);
            Promise.all([
                api.get(`/attendance/work-logs/${selectedEmployeeId}`).catch(() => ({ data: [] })),
                api.get(`/employees/leave/${selectedEmployeeId}`).catch(() => ({ data: [] }))
            ]).then(([workRes, leaveRes]) => {
                setWorkLogs(workRes.data || []);
                setLeaves(leaveRes.data || []);
                // Mock time off requests for now
                setTimeOffRequests([
                    { id: 1, type: 'Work From Home', dates: 'Oct 22', status: 'Accepted' },
                    { id: 2, type: 'PTO', dates: 'Oct 21-24', status: 'Accepted' },
                    { id: 3, type: 'Work From Home', dates: 'Oct 17', status: 'Accepted' }
                ]);
            }).finally(() => setLoading(false));
        }
    }, [selectedEmployeeId]);

    // Calculate leave balance
    const leaveBalance = useMemo(() => {
        const totalLeaves = 20; // Annual leave quota
        const usedLeaves = leaves.filter(l => l.status === 'approved').length;
        return totalLeaves - usedLeaves;
    }, [leaves]);

    // Calculate time off activities (mock data for chart)
    const timeOffActivities = useMemo(() => {
        return [
            { month: 'Jan', days: 2 },
            { month: 'Feb', days: 1 },
            { month: 'Mar', days: 3 },
            { month: 'Apr', days: 1 },
            { month: 'May', days: 2 },
            { month: 'Jun', days: 4 },
            { month: 'Jul', days: 3 },
            { month: 'Aug', days: 2 },
            { month: 'Sep', days: 5 },
            { month: 'Oct', days: 8 },
            { month: 'Nov', days: 3 },
            { month: 'Dec', days: 0 }
        ];
    }, []);

    // Check if employee is clocked in
    const isClockedIn = useMemo(() => {
        return workLogs.some(log => !log.check_out_time);
    }, [workLogs]);

    // Get today's total hours
    const todayHours = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = workLogs.filter(log => log.date === today);
        return todayLogs.reduce((sum, log) => sum + (log.duration_hours || 0), 0);
    }, [workLogs]);

    // Upcoming holidays (mock data)
    const upcomingHolidays = [
        { date: 'DEC 25', name: 'Christmas' },
        { date: 'JAN 01', name: 'New Year' },
        { date: 'JAN 26', name: 'Republic Day' }
    ];

    const selectedEmployee = employees.find(e => e.id === parseInt(selectedEmployeeId));

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Time</h1>
                        <div className="flex space-x-6 mt-4 border-b">
                            <button className="pb-2 font-medium text-orange-500 border-b-2 border-orange-500">Overview</button>
                            <button className="pb-2 font-medium text-gray-500 hover:text-gray-700">Timesheet</button>
                            <button className="pb-2 font-medium text-gray-500 hover:text-gray-700">Timeoff</button>
                        </div>
                    </div>

                    {/* Employee Selector */}
                    <div className="flex items-center space-x-3">
                        <Users size={20} className="text-gray-500" />
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading employee data...</p>
                    </div>
                ) : (
                    <>
                        {/* Top Row - 4 Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Time Record Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Time record</h3>
                                <div className="flex flex-col items-center justify-center py-4">
                                    <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center bg-gray-50 mb-4">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-400">
                                                {isClockedIn ? 'Clocked in' : 'Clocked out'}
                                            </p>
                                            <p className="text-lg font-bold text-gray-700">
                                                {isClockedIn ? `${todayHours.toFixed(1)}h` : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <span className="text-sm text-gray-600">Location</span>
                                            <span className="text-sm font-medium">Office</span>
                                        </div>
                                        <button
                                            className={`w-full py-2 rounded-lg font-medium ${isClockedIn
                                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            disabled={!isClockedIn}
                                        >
                                            {isClockedIn ? 'Clock Out' : 'Clock In'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Calendar */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">Attendance</h3>
                                    <span className="text-xs text-gray-500">
                                        {currentMonth.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' })}
                                    </span>
                                </div>
                                <Calendar
                                    value={date}
                                    onChange={setDate}
                                    className="border-none w-full text-xs"
                                    tileClassName={({ date, view }) => {
                                        if (view === 'month') {
                                            const dateStr = date.toISOString().split('T')[0];
                                            const hasWork = workLogs.some(log => log.date === dateStr && log.duration_hours >= 4);
                                            if (hasWork) return 'bg-green-100 text-green-800 font-bold rounded-full';
                                        }
                                        return null;
                                    }}
                                    formatShortWeekday={(locale, date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                                />
                            </div>

                            {/* Total Leave Balance */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Total leave balance</h3>
                                <div className="flex flex-col items-center justify-center h-48">
                                    <div className="relative w-32 h-32">
                                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                            <path
                                                className="text-gray-200"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                            <path
                                                className="text-red-500"
                                                strokeDasharray={`${(leaveBalance / 20) * 100}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-3xl font-bold">{leaveBalance}</span>
                                        </div>
                                    </div>
                                    <button className="mt-4 text-orange-500 text-sm hover:underline">See more</button>
                                </div>
                            </div>

                            {/* Timesheet */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">Timesheet</h3>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-sm font-medium">Tue, Nov 26</span>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                                <div className="space-y-2 text-xs text-gray-500">
                                    {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map((time, i) => (
                                        <div key={i} className="py-1 border-b border-gray-100">{time}</div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row - 3 Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* List of Holidays */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">List of holidays</h3>
                                <div className="space-y-4">
                                    {upcomingHolidays.map((holiday, i) => (
                                        <div key={i} className="flex items-center space-x-4">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500">{holiday.date.split(' ')[0]}</p>
                                                <p className="text-2xl font-bold text-orange-500">{holiday.date.split(' ')[1]}</p>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">Thu</p>
                                                <p className="text-sm font-medium">{holiday.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time Off Requests */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Time off requests</h3>
                                <div className="space-y-4">
                                    {timeOffRequests.map((request) => (
                                        <div key={request.id} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                <div>
                                                    <p className="text-xs text-gray-500">{request.dates}</p>
                                                    <p className="text-sm font-medium">{request.type}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                                {request.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time Off Activities Chart */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Time off activities</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={timeOffActivities}>
                                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                                            {timeOffActivities.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.days > 5 ? '#3b82f6' : entry.days > 2 ? '#10b981' : '#6b7280'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default EmployeeDashboard;
