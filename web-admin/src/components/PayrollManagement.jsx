import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Calendar, Calculator, Save, X } from 'lucide-react';

const PayrollManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);

    // Form State
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [customAllowances, setCustomAllowances] = useState(0);
    const [leaveBonus, setLeaveBonus] = useState(0);
    const [unpaidDeductions, setUnpaidDeductions] = useState(0);
    const [advanceDeductions, setAdvanceDeductions] = useState(0);
    const [notes, setNotes] = useState("");
    const [calcLoading, setCalcLoading] = useState(false);

    // Helper to control useEffect firing only when intended
    const [processFormUpdate, setProcessFormUpdate] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        if (!processFormUpdate) return;

        // Ensure month matches month_number regardless of integer or string
        const exist = paymentHistory.find(p => p.month_number == month && p.year == year);

        if (exist) {
            setCustomAllowances(exist.allowances);
            setUnpaidDeductions(exist.deductions);
            setLeaveBonus(0);
            setAdvanceDeductions(0);
            setNotes(exist.notes || "");
        } else {
            setCustomAllowances(0);
            setUnpaidDeductions(0);
            setLeaveBonus(0);
            setAdvanceDeductions(0);
            setNotes("");
        }
    }, [month, year, paymentHistory, processFormUpdate]);

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const res = await api.get('/employees?active_only=true');
            setEmployees(res.data || []);
        } catch (e) {
            console.error("Failed to load employees", e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateClick = async (emp) => {
        setSelectedEmployee(emp);
        setProcessFormUpdate(false); // Stop updates while loading
        setPaymentHistory([]);

        try {
            // Fetch existing payments
            const res = await api.get(`/employees/${emp.id}/salary-payments`);
            setPaymentHistory(res.data || []);
        } catch (e) {
            console.error("Failed to load history", e);
        }

        // Reset to today
        const today = new Date();
        const m = today.getMonth() + 1;
        const y = today.getFullYear();
        setMonth(m);
        setYear(y);

        // Allow updates and trigger logic manually for default month
        // Find if current month exists in fetched history
        // (We can't rely on useEffect immediately because setPaymentHistory is async batch)

        // Wait, 'res' data is available here.
        // But doing it via state is cleaner if we wait.
        setProcessFormUpdate(true);
        setShowModal(true);
    };

    const fetchDeductions = async () => {
        if (!selectedEmployee) return;
        setCalcLoading(true);
        try {
            const res = await api.get(`/attendance/monthly-report/${selectedEmployee.id}?month=${month}&year=${year}`);
            if (res.data) {
                setUnpaidDeductions(res.data.deductions || 0);
                setAdvanceDeductions(res.data.advance_deductions || 0);
                setLeaveBonus(res.data.leave_encashment_amount || 0);
            }
        } catch (e) {
            console.error(e);
            alert("Could not fetch attendance report. Is attendance data available?");
        } finally {
            setCalcLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedEmployee) return;
        try {
            const basic = selectedEmployee.salary || 0;
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthName = monthNames[parseInt(month) - 1];

            const payload = {
                month: `${monthName} ${year}`,
                year: parseInt(year),
                month_number: parseInt(month),
                basic_salary: parseFloat(basic),
                allowances: parseFloat(customAllowances) + parseFloat(leaveBonus),
                deductions: parseFloat(unpaidDeductions) + parseFloat(advanceDeductions),
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: "Bank Transfer",
                notes: notes
            };

            await api.post(`/employees/${selectedEmployee.id}/salary-payments`, payload);
            alert("Salary Payment Saved Successfully!");
            setShowModal(false);

            // Refresh history in background so if they open again it's there
            // But we close modal, so it doesn't matter much.
        } catch (e) {
            console.error(e);
            alert("Failed to save payment: " + (e.response?.data?.detail || e.message));
        }
    };

    const netSalary = (selectedEmployee?.salary || 0) + parseFloat(customAllowances || 0) + parseFloat(leaveBonus || 0) - parseFloat(unpaidDeductions || 0) - parseFloat(advanceDeductions || 0);

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="text-green-600" /> Payroll Management
            </h2>

            {loading ? <div className="p-4 text-center">Loading...</div> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-left">
                                <th className="p-3 border">Employee</th>
                                <th className="p-3 border">Role</th>
                                <th className="p-3 border">Basic Salary</th>
                                <th className="p-3 border">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-medium">{emp.name}</td>
                                    <td className="p-3">{emp.role}</td>
                                    <td className="p-3">₹{emp.salary || 0}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => handleGenerateClick(emp)}
                                            className="bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 text-xs flex items-center gap-1"
                                        >
                                            <Calculator size={14} /> Manage Salary
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && selectedEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Generate Salary</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg mb-4">
                                <p className="text-sm font-semibold text-blue-900">{selectedEmployee.name}</p>
                                <p className="text-xs text-blue-700">{selectedEmployee.role}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Month</label>
                                    <select value={month} onChange={e => setMonth(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Year</label>
                                    <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-600 font-medium">Basic Salary</span>
                                    <span className="font-bold text-gray-900">₹{selectedEmployee.salary}</span>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-semibold text-gray-600">Deductions (Unpaid Leave)</label>
                                        <button onClick={fetchDeductions} disabled={calcLoading} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                            {calcLoading ? "Calculating..." : "Auto-Calculate from Attendance"}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        value={unpaidDeductions}
                                        onChange={e => setUnpaidDeductions(e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg text-red-600 font-bold focus:ring-2 focus:ring-red-200 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Deductions (Salary Advance)</label>
                                    <input
                                        type="number"
                                        value={advanceDeductions}
                                        onChange={e => setAdvanceDeductions(e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg text-amber-600 font-bold focus:ring-2 focus:ring-amber-200 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Leave Bonus</label>
                                        <input
                                            type="number"
                                            disabled
                                            value={leaveBonus}
                                            className="w-full border border-gray-200 bg-gray-50 p-2 rounded-lg text-blue-600 font-bold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Custom Allowances</label>
                                        <input
                                            type="number"
                                            value={customAllowances}
                                            onChange={e => setCustomAllowances(e.target.value)}
                                            className="w-full border border-gray-300 p-2 rounded-lg text-green-600 font-bold focus:ring-2 focus:ring-green-200 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-gray-200 outline-none"
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-indigo-900 font-medium">Net Salary</span>
                                    <span className="text-xl font-bold text-indigo-700">₹{netSalary.toFixed(2)}</span>
                                </div>
                            </div>

                            <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex justify-center items-center gap-2 mt-2 shadow-lg shadow-green-200">
                                <Save size={20} /> Generate & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollManagement;
