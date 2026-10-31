
import React, { useEffect, useState } from 'react';
import { X, TrendingUp, ShoppingCart, Activity, DollarSign, Package, AlertCircle } from 'lucide-react';
import API from '../../../services/api';
import { formatDateIST, formatDateTimeIST } from '../../../utils/dateUtils';

const DepartmentDetailsModal = ({ isOpen, onClose, department }) => {
    const [activeTab, setActiveTab] = useState('assets');
    const [data, setData] = useState({
        assets: [],
        capital_investment: [],
        expenses: [],
        inventory_consumption: [],
        income: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && department) {
            fetchDetails();
        }
    }, [isOpen, department]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await API.get(`/dashboard/department/${department}/details`);
            setData(res.data);
        } catch (err) {
            console.error("Failed to fetch department details:", err);
            setError("Failed to load department details.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'assets', label: 'Assets', icon: <TrendingUp size={16} /> },
        { id: 'capital_investment', label: 'Capital Investment', icon: <ShoppingCart size={16} /> },
        { id: 'expenses', label: 'Expenses', icon: <Activity size={16} /> },
        { id: 'inventory_consumption', label: 'Consumption', icon: <Package size={16} /> },
        { id: 'income', label: 'Income', icon: <DollarSign size={16} /> },
    ];

    /* --- RENDER TABLES --- */

    const renderAssetsTable = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">Item Name</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">Total Value</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.assets.length > 0 ? (
                        data.assets.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium">{item.name}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${item.type === 'Fixed Asset' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right">{item.quantity}</td>
                                <td className="px-4 py-2 text-right">₹{item.unit_price.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right font-semibold">₹{item.value.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="5" className="text-center py-8 text-gray-500">No assets found</td></tr>
                    )}
                </tbody>
                {data.assets.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                            <td colSpan="4" className="px-4 py-2 text-right">Total Asset Value:</td>
                            <td className="px-4 py-2 text-right">
                                ₹{data.assets.reduce((sum, item) => sum + (item.value || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    const renderCapitalInvestmentTable = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">PO #</th>
                        <th className="px-4 py-2 text-left">Item</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.capital_investment.length > 0 ? (
                        data.capital_investment.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{formatDateIST(item.date)}</td>
                                <td className="px-4 py-2">{item.po_number}</td>
                                <td className="px-4 py-2 font-medium">{item.item_name}</td>
                                <td className="px-4 py-2 text-right">{item.quantity}</td>
                                <td className="px-4 py-2 text-right">₹{item.unit_price.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right font-semibold">₹{item.total_amount.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="6" className="text-center py-8 text-gray-500">No capital investments found</td></tr>
                    )}
                </tbody>
                {data.capital_investment.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                            <td colSpan="5" className="px-4 py-2 text-right">Total Investment:</td>
                            <td className="px-4 py-2 text-right">
                                ₹{data.capital_investment.reduce((sum, item) => sum + (item.total_amount || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    const renderExpensesTable = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Category</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.expenses.length > 0 ? (
                        data.expenses.map((exp, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{formatDateIST(exp.date)}</td>
                                <td className="px-4 py-2">{exp.category}</td>
                                <td className="px-4 py-2">{exp.description}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${exp.type === 'Direct Expense' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {exp.type}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">₹{exp.amount.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="5" className="text-center py-8 text-gray-500">No expenses recorded</td></tr>
                    )}
                </tbody>
                {data.expenses.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                            <td colSpan="4" className="px-4 py-2 text-right">Total Expenses:</td>
                            <td className="px-4 py-2 text-right">
                                ₹{data.expenses.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    const renderConsumptionTable = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Item Name</th>
                        <th className="px-4 py-2 text-right">Qty Consumed</th>
                        <th className="px-4 py-2 text-right">Cost Value</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.inventory_consumption.length > 0 ? (
                        data.inventory_consumption.map((txn, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{formatDateTimeIST(txn.date)}</td>
                                <td className="px-4 py-2 font-medium">{txn.item_name}</td>
                                <td className="px-4 py-2 text-right text-red-600">{txn.quantity}</td>
                                <td className="px-4 py-2 text-right font-semibold">₹{txn.amount.toFixed(2)}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="4" className="text-center py-8 text-gray-500">No inventory consumption</td></tr>
                    )}
                </tbody>
                {data.inventory_consumption.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                            <td colSpan="3" className="px-4 py-2 text-right">Total Consumption Cost:</td>
                            <td className="px-4 py-2 text-right">
                                ₹{data.inventory_consumption.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    const renderIncomeTable = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Source</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.income.length > 0 ? (
                        data.income.map((inc, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{formatDateTimeIST(inc.date)}</td>
                                <td className="px-4 py-2">{inc.source}</td>
                                <td className="px-4 py-2 text-right text-green-600 font-semibold">₹{inc.amount.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="3" className="text-center py-8 text-gray-500">No income records found</td></tr>
                    )}
                </tbody>
                {data.income.length > 0 && (
                    <tfoot className="bg-gray-50 font-semibold">
                        <tr>
                            <td colSpan="2" className="px-4 py-2 text-right">Total Income:</td>
                            <td className="px-4 py-2 text-right text-green-600">
                                ₹{data.income.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="text-indigo-600" />
                            {department} Department - Detail Breakdown
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Detailed view of assets, investments, expenses, and consumption.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm"
                    >
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                            <p className="text-gray-500">Loading department details...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <AlertCircle size={48} className="text-red-400 mb-4" />
                            <p className="text-red-600 font-medium">{error}</p>
                            <button onClick={fetchDetails} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                Retry
                            </button>
                        </div>
                    ) : (
                        <div className="chart-animate-appear">
                            {activeTab === 'assets' && renderAssetsTable()}
                            {activeTab === 'capital_investment' && renderCapitalInvestmentTable()}
                            {activeTab === 'expenses' && renderExpensesTable()}
                            {activeTab === 'inventory_consumption' && renderConsumptionTable()}
                            {activeTab === 'income' && renderIncomeTable()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepartmentDetailsModal;
