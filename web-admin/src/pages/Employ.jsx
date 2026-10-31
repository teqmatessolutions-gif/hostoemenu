// Employ.jsx

import React, { useEffect, useState } from "react";
import DashboardLayout from "../layout/DashboardLayout";
import API from "../services/api";
import * as XLSX from "xlsx";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import CountUp from "react-countup";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Users, Clock, Briefcase, CreditCard, 
  Plus, Search, Filter, Download, 
  Calendar as CalendarIcon, CheckCircle, XCircle, Clock as ClockIcon
} from 'lucide-react';

// --- Sub-Components ---

const TimeManagement = () => {
  const [activeTab, setActiveTab] = useState("overview"); // overview, timesheet, timeoff
  const [date, setDate] = useState(new Date());

  // Mock Data for UI
  const leaveBalance = 8;
  const timeOffRequests = [
    { id: "51237200", type: "PTO", dates: "21 Oct - 24 Oct 2025", status: "Accepted" },
    { id: "75803456", type: "Work From Home", dates: "22 Oct - 22 Oct 2025", status: "Accepted" },
    { id: "16856800", type: "Work From Home", dates: "17 Oct - 17 Oct 2025", status: "Accepted" },
    { id: "29995825", type: "Sick Leave", dates: "30 Sep - 30 Sep 2025", status: "Accepted" },
  ];

  return (
    <div className="space-y-6">
      {/* Time Navigation */}
      <div className="flex space-x-6 border-b pb-2">
        {["Overview", "Timesheet", "Timeoff"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`pb-2 font-medium ${
              activeTab === tab.toLowerCase()
                ? "text-orange-500 border-b-2 border-orange-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Time Record */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-4">Time record</h3>
            <div className="flex flex-col items-center justify-center py-4">
               <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center bg-gray-50">
                  <span className="text-gray-400 text-sm">Clocked out<br/>N/A</span>
               </div>
               <div className="mt-6 w-full">
                 <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-4">
                   <span className="text-gray-600">Location</span>
                   <span className="font-medium">Office</span>
                 </div>
                 <button className="w-full bg-gray-100 text-gray-400 py-2 rounded-lg cursor-not-allowed">Clock In</button>
               </div>
            </div>
           </div>

           {/* Attendance Calendar */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-semibold text-gray-700 mb-4 flex justify-between">
               Attendance <span className="text-sm text-gray-500">11-2025</span>
             </h3>
             <Calendar 
               onChange={setDate} 
               value={date} 
               className="border-none w-full text-sm"
               tileClassName={({ date, view }) => {
                 // Mock attendance
                 if (view === 'month' && date.getDay() !== 0 && date.getDay() !== 6) {
                    return 'text-green-600 font-bold';
                 }
                 return null;
               }}
             />
           </div>

           {/* Total Leave Balance */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-semibold text-gray-700 mb-4">Total leave balance</h3>
             <div className="flex flex-col items-center justify-center h-48">
               <div className="relative w-32 h-32">
                 {/* Simple Gauge Placeholder using Recharts or SVG */}
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
                      strokeDasharray="75, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-3xl font-bold">8</span>
                 </div>
               </div>
               <button className="mt-4 text-orange-500 text-sm hover:underline">See more</button>
             </div>
           </div>
           
           {/* Timesheet List (Mock) */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-700 mb-4">Timesheet</h3>
              <div className="space-y-4">
                 <div className="h-48 border rounded-lg flex items-center justify-center text-gray-400">
                   No entries today
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === "timeoff" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Apply Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-2">Apply for timeoff</h3>
            <p className="text-gray-500 text-sm mb-6">Request for leaves with or without pay, work from home or work at client office.</p>
            <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition">Apply</button>
          </div>

          {/* History Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-2">View history</h3>
            <p className="text-gray-500 text-sm mb-6">Easily track past leaves, upcoming plans and approval details anytime.</p>
            <button className="border border-orange-500 text-orange-500 px-6 py-2 rounded-lg hover:bg-orange-50 transition">View</button>
          </div>

          {/* Upcoming Timeoff */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 row-span-2">
            <h3 className="font-semibold text-gray-700 mb-4">Upcoming timeoff</h3>
            <div className="flex space-x-4 mb-4 text-sm">
               <span className="text-orange-500 font-medium border-b-2 border-orange-500">Time Off</span>
               <span className="text-gray-500">Holidays</span>
            </div>
            <div className="space-y-6 relative pl-4 border-l border-gray-200 ml-2">
               {/* Timeline Items */}
               {[
                 { date: "Oct 22", status: "Approved", type: "Work From Home" },
                 { date: "Oct 21", status: "Approved", type: "PTO" },
                 { date: "Oct 17", status: "Approved", type: "Work From Home" },
               ].map((item, i) => (
                 <div key={i} className="relative pl-6">
                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-white"></div>
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-medium text-gray-700">{item.date}<br/><span className="text-gray-400">{item.date}</span></div>
                      <div className="text-right">
                         <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded mb-1">{item.type}</div>
                         <div className="text-xs text-green-600">{item.status}</div>
                      </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Requests Table */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-gray-700">Timeoff requests</h3>
              <div className="flex space-x-2 text-sm">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">All tickets 43</span>
                <span className="px-3 py-1 text-gray-500">In Progress 0</span>
                <span className="px-3 py-1 text-gray-500">Approved 41</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="py-3 px-4 text-left font-medium">TICKET ID</th>
                  <th className="py-3 px-4 text-left font-medium">TYPE</th>
                  <th className="py-3 px-4 text-left font-medium">LEAVE DATES</th>
                  <th className="py-3 px-4 text-left font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {timeOffRequests.map(req => (
                  <tr key={req.id}>
                    <td className="py-3 px-4 text-orange-500">{req.id}</td>
                    <td className="py-3 px-4">{req.type}</td>
                    <td className="py-3 px-4">{req.dates}</td>
                    <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{req.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "timesheet" && (
         <div className="bg-white p-8 rounded-xl text-center text-gray-500">
            <h3 className="text-lg font-medium mb-2">Timesheet</h3>
            <p>Timesheet view implementation pending backend integration.</p>
         </div>
      )}
    </div>
  );
};

const AssetManagement = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-gray-800">My Assets</h2>
           <button className="flex items-center space-x-2 text-gray-600 border px-4 py-2 rounded-lg hover:bg-gray-50">
             <Filter size={18} />
             <span>Filter</span>
           </button>
        </div>
        
        {/* Search */}
        <div className="mb-6 relative">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
           <input 
             type="text" 
             placeholder="Search by Asset Name, Asset ID" 
             className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
           />
        </div>

        {/* Empty State Table */}
        <div className="border rounded-lg overflow-hidden">
           <table className="w-full text-sm">
             <thead className="bg-gray-50 text-gray-500">
               <tr>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Asset ID</th>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Asset Name</th>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Asset Model</th>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Serial Number</th>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Date of Issue</th>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Date of Return</th>
                 <th className="py-3 px-4 text-left font-medium uppercase text-xs">Status</th>
               </tr>
             </thead>
             <tbody>
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                       <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mb-4 text-red-400">
                          <Briefcase size={32} />
                       </div>
                       <h3 className="text-lg font-medium text-gray-900">No Data Found</h3>
                       <p>Looks like there's nothing here yet.</p>
                    </div>
                  </td>
                </tr>
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

const ExpenseManagement = () => {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Report CTA */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
             <h2 className="text-2xl font-bold text-gray-800 mb-2">Efficient And Accurate Expense Management</h2>
             <p className="text-gray-500 mb-6">Provide quick and convenient operations for users to report expenses and help manage business expenses more effectively.</p>
             <div>
               <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition flex items-center inline-flex">
                 <Plus size={18} className="mr-2" />
                 Create Expense Report
               </button>
             </div>
          </div>

          {/* Distribution Chart Placeholder */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
             <h3 className="text-gray-700 font-medium mb-auto w-full">Expense Distribution by Category</h3>
             <div className="flex flex-col items-center justify-center text-gray-400">
                 <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mb-4 text-red-400">
                    <PieChart size={32} />
                 </div>
                 <p>No Approved Expenses Available</p>
             </div>
             <div className="mt-auto"></div>
          </div>
       </div>

       {/* Reports Table */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
             <div className="flex space-x-4">
                <button className="text-orange-500 font-medium border-b-2 border-orange-500 pb-2">All Expenses <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full ml-1">0</span></button>
                <button className="text-gray-500 hover:text-gray-700 pb-2">Pending Approval <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-1">0</span></button>
                <button className="text-gray-500 hover:text-gray-700 pb-2">Draft <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-1">0</span></button>
                <button className="text-gray-500 hover:text-gray-700 pb-2">Closed <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full ml-1">0</span></button>
             </div>
             <div className="flex space-x-2">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                   <input type="text" placeholder="Search by report name" className="pl-9 pr-4 py-1.5 border rounded-lg text-sm" />
                </div>
                <button className="flex items-center space-x-1 text-gray-600 border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
                   <Filter size={16} />
                   <span>Filter</span>
                </button>
             </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
             <table className="w-full text-xs">
               <thead className="bg-gray-50 text-gray-500">
                 <tr>
                   <th className="py-3 px-4 text-left font-medium uppercase">Report Name</th>
                   <th className="py-3 px-4 text-left font-medium uppercase">Project Name</th>
                   <th className="py-3 px-4 text-left font-medium uppercase">Request Date</th>
                   <th className="py-3 px-4 text-left font-medium uppercase">Total Amount</th>
                   <th className="py-3 px-4 text-left font-medium uppercase">Reimbursable</th>
                   <th className="py-3 px-4 text-left font-medium uppercase">Status</th>
                 </tr>
               </thead>
               <tbody>
                  <tr>
                    <td colSpan="6" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                         <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-3 text-red-400">
                            <CreditCard size={24} />
                         </div>
                         <h3 className="font-medium text-gray-900">No Reports Found</h3>
                         <p>Looks like there's nothing here yet.</p>
                      </div>
                    </td>
                  </tr>
               </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    name: "",
    role: "",
    salary: "",
    join_date: "",
    email: "", 
    phone: "", 
    password: "", 
    image: null,
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [salaryFilter, setSalaryFilter] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hoveredKPI, setHoveredKPI] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/employees?skip=0&limit=20", authHeader());
      const dataWithTrend = res.data.map((emp) => ({
        ...emp,
        trend: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000)),
      }));
      setEmployees(dataWithTrend);
      setHasMore(res.data.length >= 20);
      setPage(1);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await API.get("/roles?limit=1000", authHeader());
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
    const requiredFields = ["name", "role", "salary", "join_date", "email", "password"];
    for (const field of requiredFields) {
      if (!form[field]) {
        alert(`Please fill in the required field: ${field}`);
        return; 
      }
    }
    
    const data = new FormData();
    data.append("name", form.name);
    data.append("role", form.role);
    data.append("salary", form.salary);
    data.append("join_date", form.join_date);
    data.append("email", form.email);
    data.append("password", form.password);

    if (form.phone) data.append("phone", form.phone);
    if (form.image) data.append("image", form.image);

    try {
      if (editId) {
        await API.put(`/employees/${editId}`, data, authHeader());
      } else {
        await API.post("/employees", data, authHeader());
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
    setForm({ 
      name: "", role: "", salary: "", join_date: "", email: "", phone: "", password: "", image: null 
    });
    setPreviewImage(null);
    setEditId(null);
  };

  const handleEdit = (emp) => {
    setEditId(emp.id);
    setForm({
      name: emp.name,
      role: emp.role,
      salary: emp.salary,
      join_date: emp.join_date.split("T")[0],
      email: emp.email,
      phone: emp.phone,
      password: "",
      image: null,
    });
    setPreviewImage(emp.image_url || null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this employee?")) {
      await API.delete(`/employees/${id}`, authHeader());
      fetchEmployees();
    }
  };

  const loadMoreEmployees = async () => {
    if (isFetchingMore || !hasMore) return;
    const nextPage = page + 1;
    setIsFetchingMore(true);
    try {
      const res = await API.get(`/employees?skip=${(nextPage - 1) * 20}&limit=20`, authHeader());
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

  const filteredEmployees = employees.filter((emp) =>
    salaryFilter ? emp.salary >= parseFloat(salaryFilter) : true
  );

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredEmployees);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    XLSX.writeFile(workbook, "employees.xlsx");
  };

  const totalEmployees = employees.length;
  const avgSalary = employees.length > 0 ? Math.round(employees.reduce((acc, e) => acc + e.salary, 0) / employees.length) : 0;
  const rolesCount = roles.map((r) => ({
    name: r.name,
    count: employees.filter((e) => e.role === r.name).length,
    trend: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000)),
  }));

  const kpiData = [
    { label: "Total Employees", value: totalEmployees, color: "#4f46e5", trend: employees.map(e => e.salary) },
    { label: "Avg Salary", value: avgSalary, color: "#16a34a", trend: employees.map(e => e.salary) },
    ...rolesCount.map(r => ({ label: r.name, value: r.count, color: "#f59e0b", trend: r.trend }))
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiData.map((kpi, idx) => (
          <div
            key={idx}
            className="relative bg-white p-5 rounded-xl shadow cursor-pointer hover:shadow-xl transition"
            onMouseEnter={() => setHoveredKPI(idx)}
            onMouseLeave={() => setHoveredKPI(null)}
          >
            <div className="flex flex-col items-center">
              <span className="text-gray-500">{kpi.label}</span>
              <span className="text-2xl font-bold" style={{ color: kpi.color }}>
                <CountUp end={kpi.value} duration={1.5} />
              </span>
            </div>
            {hoveredKPI === idx && (
              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-xl p-2 shadow-lg">
                <ResponsiveContainer width="100%" height={50}>
                  <LineChart data={kpi.trend.map((v, i) => ({ day: i + 1, value: v }))}>
                    <Line type="monotone" dataKey="value" stroke={kpi.color} strokeWidth={2} dot={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(val) => [`₹${val}`, "Salary"]} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow max-w-4xl mx-auto flex flex-col md:flex-row gap-6" encType="multipart/form-data">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">{editId ? "Edit" : "Create"} Employee</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Name <span className="text-red-500">*</span></label>
              <input name="name" value={form.name} onChange={handleFormChange} placeholder="Name" className="border px-3 py-2 rounded w-full" required />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Role <span className="text-red-500">*</span></label>
              <select name="role" value={form.role} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required>
                <option value="">Select Role</option>
                {roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Salary <span className="text-red-500">*</span></label>
              <input name="salary" type="number" value={form.salary} onChange={handleFormChange} placeholder="Salary" className="border px-3 py-2 rounded w-full" required />
            </div>
            <div>
               <label className="text-sm text-gray-600 mb-1 block">Joining Date <span className="text-red-500">*</span></label>
               <input type="date" name="join_date" value={form.join_date} onChange={handleFormChange} className="border px-3 py-2 rounded w-full" required />
            </div>
            <div>
               <label className="text-sm text-gray-600 mb-1 block">Email <span className="text-red-500">*</span></label>
               <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="Email" className="border px-3 py-2 rounded w-full" required />
            </div>
            <div>
               <label className="text-sm text-gray-600 mb-1 block">Phone</label>
               <input name="phone" type="tel" value={form.phone} onChange={handleFormChange} placeholder="Phone" className="border px-3 py-2 rounded w-full" />
            </div>
            <div className="md:col-span-2">
               <label className="text-sm text-gray-600 mb-1 block">Password <span className="text-red-500">*</span></label>
               <input name="password" type="password" value={form.password} onChange={handleFormChange} placeholder="Password" className="border px-3 py-2 rounded w-full" required />
            </div>
            <div className="md:col-span-2">
               <label className="text-sm text-gray-600 mb-1 block">Image</label>
               <input type="file" name="image" accept="image/*" onChange={handleFormChange} className="w-full" />
            </div>
          </div>
          <button type="submit" className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 w-full md:w-auto">
             {editId ? "Update" : "Create"}
          </button>
        </div>
        <div className="flex items-center justify-center w-full md:w-48 h-48 border rounded bg-gray-50">
          {previewImage ? (
            <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded" />
          ) : (
            <span className="text-gray-400">Image Preview</span>
          )}
        </div>
      </form>

      {/* Filters and Export */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <input type="number" placeholder="Min Salary" value={salaryFilter} onChange={(e) => setSalaryFilter(e.target.value)} className="border px-3 py-2 rounded" />
        <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center">
           <Download size={16} className="mr-2"/> Export to Excel
        </button>
      </div>

      {/* Employee Table */}
      <div className="bg-white p-6 rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border">#</th>
              <th className="p-3 border">Image</th>
              <th className="p-3 border">Name</th>
              <th className="p-3 border">Role</th>
              <th className="p-3 border">Salary</th>
              <th className="p-3 border">Join Date</th>
              <th className="p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, i) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="p-2 border text-center">{i + 1}</td>
                <td className="p-2 border">
                  {emp.image_url ? (
                    <img src={`http://localhost:8000/${emp.image_url}`} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">NA</div>
                  )}
                </td>
                <td className="p-2 border">{emp.name}</td>
                <td className="p-2 border">{emp.role}</td>
                <td className="p-2 border text-right">₹{emp.salary}</td>
                <td className="p-2 border">{emp.join_date}</td>
                <td className="p-2 border">
                  <div className="flex gap-2">
                    <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleEdit(emp)}>Edit</button>
                    <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleDelete(emp.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredEmployees.length === 0 && (
              <tr><td colSpan="7" className="text-center py-4 text-gray-500">No employees found.</td></tr>
            )}
          </tbody>          
          {hasMore && filteredEmployees.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan="7" className="text-center p-4">
                  <button onClick={loadMoreEmployees} disabled={isFetchingMore} className="bg-indigo-100 text-indigo-700 font-semibold px-6 py-2 rounded-lg hover:bg-indigo-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500">
                    {isFetchingMore ? "Loading..." : "Load More"}
                  </button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};


const Employee = () => {
  const [currentTab, setCurrentTab] = useState("time"); // time, assets, expenses, directory

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
      </div>

      {/* Main Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 inline-flex overflow-x-auto max-w-full">
        <button
          onClick={() => setCurrentTab("time")}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition flex items-center space-x-2 ${
            currentTab === "time" ? "bg-orange-100 text-orange-600" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Clock size={18} />
          <span>Time</span>
        </button>
        <button
          onClick={() => setCurrentTab("assets")}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition flex items-center space-x-2 ${
            currentTab === "assets" ? "bg-orange-100 text-orange-600" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Briefcase size={18} />
          <span>Assets</span>
        </button>
        <button
          onClick={() => setCurrentTab("expenses")}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition flex items-center space-x-2 ${
            currentTab === "expenses" ? "bg-orange-100 text-orange-600" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <CreditCard size={18} />
          <span>Expenses</span>
        </button>
        <button
          onClick={() => setCurrentTab("directory")}
          className={`px-6 py-2 rounded-lg font-medium text-sm transition flex items-center space-x-2 ${
            currentTab === "directory" ? "bg-orange-100 text-orange-600" : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Users size={18} />
          <span>Directory</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen">
        {currentTab === "time" && <TimeManagement />}
        {currentTab === "assets" && <AssetManagement />}
        {currentTab === "expenses" && <ExpenseManagement />}
        {currentTab === "directory" && <EmployeeDirectory />}
      </div>
    </DashboardLayout>
  );
};

export default Employee;
