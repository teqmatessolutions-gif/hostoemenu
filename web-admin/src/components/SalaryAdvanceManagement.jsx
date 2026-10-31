import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Calendar, Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const SalaryAdvanceManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [advances, setAdvances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form states
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [deductMonth, setDeductMonth] = useState(new Date().getMonth() + 1);
    const [deductYear, setDeductYear] = useState(new Date().getFullYear());
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        api.get('/employees?active_only=true').then(res => {
            setEmployees(res.data || []);
            if (res.data && res.data.length > 0) {
                setSelectedEmployeeId(res.data[0].id);
            }
        });
    }, []);

    useEffect(() => {
        if (selectedEmployeeId) {
            fetchAdvances();
        } else {
            setAdvances([]);
        }
    }, [selectedEmployeeId]);

    const fetchAdvances = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/salary-advances/employee/${selectedEmployeeId}`);
            setAdvances(res.data || []);
        } catch (e) {
            console.error("Failed to fetch advances", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdvance = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId || !amount) return;

        setActionLoading(true);
        try {
            const payload = {
                employee_id: parseInt(selectedEmployeeId),
                amount: parseFloat(amount),
                date: date,
                reason: reason,
                deduct_month: parseInt(deductMonth),
                deduct_year: parseInt(deductYear),
                payment_method: paymentMethod,
                notes: notes
            };
            await api.post('/salary-advances/', payload);
            setAmount('');
            setReason('');
            setNotes('');
            fetchAdvances();
            alert("Salary Advance recorded successfully!");
        } catch (error) {
            console.error("Failed to record advance", error);
            alert("Failed to save: " + (error.response?.data?.detail || error.message));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteAdvance = async (id) => {
        if (!window.confirm("Are you sure you want to delete this advance record?")) return;
        try {
            await api.delete(`/salary-advances/${id}`);
            fetchAdvances();
        } catch (e) {
            console.error(e);
            alert("Failed to delete record");
        }
    };

    const handleToggleStatus = async (advance) => {
        const newStatus = advance.status === 'pending' ? 'deducted' : 'pending';
        try {
            await api.put(`/salary-advances/${advance.id}`, { status: newStatus });
            fetchAdvances();
        } catch (e) {
            console.error(e);
            alert("Failed to update status");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <DollarSign className="text-indigo-600" /> Salary Advance Management
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Advance Form */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 h-fit">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-indigo-500" /> Issue Salary Advance
                    </h3>
                    <form onSubmit={handleCreateAdvance} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Select Employee</label>
                            <select
                                value={selectedEmployeeId}
                                onChange={e => setSelectedEmployeeId(e.target.value)}
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
                            >
                                <option value="">-- Select Employee --</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Issue Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Deduct Month</label>
                                <select
                                    value={deductMonth}
                                    onChange={e => setDeductMonth(e.target.value)}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Deduct Year</label>
                                <input
                                    type="number"
                                    required
                                    value={deductYear}
                                    onChange={e => setDeductYear(e.target.value)}
                                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Payment Method</label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            >
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Reason</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Medical, Rent, Festival, etc."
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Internal Notes</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Additional details"
                                rows={2}
                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                            {actionLoading ? "Saving..." : "Record Advance"}
                        </button>
                    </form>
                </div>

                {/* History List */}
                <div className="lg:col-span-2">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-indigo-500" /> Advance History
                    </h3>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading history...</div>
                    ) : advances.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 border border-dashed rounded-xl flex flex-col items-center gap-2">
                            <AlertCircle size={32} className="text-gray-300" />
                            <p className="font-medium text-sm">No advances found for this employee</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {advances.map(adv => (
                                <div key={adv.id} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg text-gray-900">{formatCurrency(adv.amount)}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                adv.status === 'deducted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {adv.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span>Issued: <b>{new Date(adv.date).toLocaleDateString()}</b></span>
                                            <span>Deduct Target: <b>{new Date(adv.deduct_year, adv.deduct_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</b></span>
                                            <span>Via: <b className="capitalize">{adv.payment_method}</b></span>
                                        </div>
                                        {adv.reason && <p className="text-xs text-gray-700 font-medium">Reason: {adv.reason}</p>}
                                        {adv.notes && <p className="text-[11px] text-gray-400 italic">Notes: {adv.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleStatus(adv)}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                                                adv.status === 'deducted' 
                                                    ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' 
                                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                            }`}
                                        >
                                            {adv.status === 'deducted' ? <Clock size={13} /> : <CheckCircle size={13} />}
                                            Mark {adv.status === 'deducted' ? 'Pending' : 'Deducted'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAdvance(adv.id)}
                                            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalaryAdvanceManagement;
