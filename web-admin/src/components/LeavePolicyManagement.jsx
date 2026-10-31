import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Save, Calendar, Briefcase } from 'lucide-react';

const LeavePolicyManagement = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Leave policy state
    const [policy, setPolicy] = useState({
        paid_leave_monthly: 4,
        paid_leave_yearly: 48,
        sick_leave_monthly: 1,
        sick_leave_yearly: 12,
        long_leave_monthly: 0,
        long_leave_yearly: 5,
        wellness_leave_monthly: 0,
        wellness_leave_yearly: 5,
    });

    useEffect(() => {
        loadPolicy();
    }, []);

    const loadPolicy = async () => {
        setLoading(true);
        try {
            const res = await api.get('/employees/leave-policy');
            if (res.data) {
                setPolicy(res.data);
            }
        } catch (e) {
            console.error("Failed to load leave policy", e);
            // Use defaults if API fails
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/employees/leave-policy', policy);
            alert("Leave policy updated successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to save policy: " + (e.response?.data?.detail || e.message));
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setPolicy(prev => ({
            ...prev,
            [field]: parseFloat(value) || 0
        }));
    };

    const leaveTypes = [
        { key: 'paid_leave', label: 'Paid Leave', color: 'blue' },
        { key: 'sick_leave', label: 'Sick Leave', color: 'red' },
        { key: 'long_leave', label: 'Long Leave', color: 'purple' },
        { key: 'wellness_leave', label: 'Wellness Leave', color: 'green' },
    ];

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="text-indigo-600" /> Leave Policy Configuration
                </h2>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Policy'}
                </button>
            </div>

            {loading ? (
                <div className="p-4 text-center">Loading...</div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Configure monthly and yearly leave allocations for each leave type.
                            Monthly allocations accumulate over the year (e.g., 4 per month = 48 per year).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {leaveTypes.map(({ key, label, color }) => (
                            <div key={key} className={`border-2 border-${color}-200 rounded-lg p-5 bg-${color}-50`}>
                                <h3 className={`text-lg font-bold text-${color}-700 mb-4 flex items-center gap-2`}>
                                    <Briefcase size={20} />
                                    {label}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            <Calendar size={16} className="inline mr-1" />
                                            Monthly Allocation
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={policy[`${key}_monthly`]}
                                            onChange={(e) => handleChange(`${key}_monthly`, e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leaves per month</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            <Calendar size={16} className="inline mr-1" />
                                            Yearly Allocation
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={policy[`${key}_yearly`]}
                                            onChange={(e) => handleChange(`${key}_yearly`, e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Total leaves per year</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-bold text-gray-700 mb-2">Current Configuration Summary:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {leaveTypes.map(({ key, label }) => (
                                <div key={key} className="bg-white p-3 rounded border">
                                    <p className="font-semibold text-gray-600">{label}</p>
                                    <p className="text-lg font-bold text-indigo-600">
                                        {policy[`${key}_yearly`]} days/year
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        ({policy[`${key}_monthly`]} per month)
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePolicyManagement;
