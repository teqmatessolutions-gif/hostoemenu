
import React, { useEffect, useState } from "react";
import { X, ArrowDown, ArrowUp, AlertTriangle, FileText } from "lucide-react";
import API from "../../../services/api";
import { formatCurrency } from "../../../utils/currency";

const ItemHistoryModal = ({ isOpen, onClose, item }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && item) {
            fetchTransactions();
        }
    }, [isOpen, item]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await API.get(`/inventory/items/${item.id}/transactions`);
            setTransactions(res.data || []);
        } catch (err) {
            console.error("Failed to fetch item history:", err);
            setError("Failed to load history.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !item) return null;

    // Calculate Running Balance
    // We need to process from oldest to newest to calculate running balance correctly
    // But transactions are returned newest first usually. Let's reverse for calc, then reverse back for display?
    // Actually, standard ledger shows newest on top usually, but running balance logic needs chronological order.

    const sortedTxns = [...transactions].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    let runningBalance = 0;
    const historyWithBalance = sortedTxns.map(txn => {
        let qtyChange = 0;

        // Calculate quantity change based on transaction type
        // IMPORTANT: transfer_in does NOT affect global warehouse stock!
        // It only tracks that a location received items (affects LocationStock only)
        if (txn.transaction_type === "in") {
            // Purchases, returns - adds to global warehouse stock
            qtyChange = txn.quantity;
        } else if (txn.transaction_type === "out" || txn.transaction_type === "waste_spoilage") {
            // Consumption, waste, spoilage - removes from global stock
            qtyChange = -txn.quantity;
        } else if (txn.transaction_type === "transfer_out") {
            // Internal transfer (e.g. Warehouse -> Room)
            // Does NOT affect global stock count (just changes location)
            qtyChange = 0;
        } else if (txn.transaction_type === "adjustment") {
            // Manual adjustments (can be + or -)
            qtyChange = txn.quantity;
        } else if (txn.transaction_type === "transfer_in") {
            // Internal transfer (e.g. Room -> Warehouse)
            // Does NOT affect global stock count (just changes location)
            qtyChange = 0;
        }

        runningBalance += qtyChange;
        return { ...txn, qtyChange, runningBalance };
    });

    // Display newest first
    const displayRows = [...historyWithBalance].reverse();
    const calculatedStock = runningBalance;
    const discrepancies = Math.abs(calculatedStock - item.current_stock) > 0.01;


    const handleFixStock = async () => {
        if (!window.confirm(`Are you sure you want to update the current stock from ${item.current_stock} to ${calculatedStock} to match the transaction history?`)) {
            return;
        }

        try {
            setLoading(true);
            await API.post(`/inventory/items/${item.id}/fix-stock`);
            // Refresh
            const res = await API.get(`/inventory/items/${item.id}/transactions`);
            setTransactions(res.data || []);
            // Also refresh item details if possible, or just close and let parent refresh
            onClose();
            // Better: We should probably inform parent to refresh, but for now closing works as basic refresh
        } catch (err) {
            console.error("Failed to fix stock:", err);
            setError("Failed to synchronize stock.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Item History: {item.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Current Stock: <span className="font-bold text-gray-800">{item.current_stock} {item.unit}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-10">{error}</div>
                    ) : (
                        <>
                            {discrepancies && (
                                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold text-orange-800">Stock Discrepancy Detected</h3>
                                            <p className="text-sm text-orange-700">
                                                The calculated history total ({calculatedStock}) does not match the current stock ({item.current_stock}).
                                                This may be due to manual database edits or untracked adjustments.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleFixStock}
                                        className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-200 whitespace-nowrap transition-colors"
                                    >
                                        Sync Stock to History
                                    </button>
                                </div>
                            )}

                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Reference</th>
                                        <th className="px-4 py-3">Department / Notes</th>
                                        <th className="px-4 py-3 text-right">Change</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {displayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                                No transactions found
                                            </td>
                                        </tr>
                                    ) : (
                                        displayRows.map((txn, idx) => (
                                            <tr key={txn.id || idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {new Date(txn.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium 
                            ${txn.qtyChange > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {txn.qtyChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                        {txn.transaction_type.toUpperCase().replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-700">
                                                    {txn.reference_number || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={txn.notes}>
                                                    <div className="flex flex-col">
                                                        {txn.department && <span className="text-xs font-bold text-gray-400">{txn.department}</span>}
                                                        <span>{txn.notes || "-"}</span>
                                                        {txn.created_by_name && <span className="text-xs text-gray-400">by {txn.created_by_name}</span>}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-medium ${txn.qtyChange > 0 ? 'text-green-600' : txn.qtyChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {txn.qtyChange === 0 && txn.quantity > 0 && (txn.transaction_type.includes('transfer')) ? (
                                                        <span className="text-xs italic text-blue-500">Global Stock Unchanged</span>
                                                    ) : (
                                                        <>{txn.qtyChange > 0 ? '+' : ''}{txn.qtyChange} {item.unit}</>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-600 font-semibold">
                                                    {txn.runningBalance} {item.unit}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemHistoryModal;
