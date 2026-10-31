import React, { useState } from 'react';
import { X } from 'lucide-react';
import { getApiBaseUrl } from '../utils/env';

const PaymentUpdateModal = ({
    purchase,
    currentPaymentStatus,
    setCurrentPaymentStatus,
    currentPaymentMethod,
    setCurrentPaymentMethod,
    onUpdate,
    onClose
}) => {
    // Use local state to prevent updating parent state before save (fixing cancel bug)
    const [localStatus, setLocalStatus] = useState(currentPaymentStatus || "pending");
    const [localMethod, setLocalMethod] = useState(currentPaymentMethod || "");
    const [updatingPayment, setUpdatingPayment] = useState(false);

    const handlePaymentUpdate = async () => {
        setUpdatingPayment(true);
        try {
            const token = localStorage.getItem("token");
            const apiBaseUrl = getApiBaseUrl();
            const response = await fetch(
                `${apiBaseUrl}/inventory/purchases/${purchase.id}/payment-status?payment_status=${localStatus}${localMethod ? `&payment_method=${encodeURIComponent(localMethod)}` : ""}`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            if (response.ok) {
                const data = await response.json();

                // Update parent state
                setCurrentPaymentStatus(data.payment_status);
                setCurrentPaymentMethod(data.payment_method);

                if (onUpdate) {
                    onUpdate({
                        ...purchase,
                        payment_status: data.payment_status,
                        payment_method: data.payment_method
                    });
                }
                alert("Payment status updated successfully!");
                onClose();
            } else {
                const error = await response.json();
                alert(`Failed to update payment status: ${error.detail || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error updating payment status:", error);
            alert("Failed to update payment status. Please try again.");
        } finally {
            setUpdatingPayment(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Update Payment Status</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Payment Status Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={localStatus}
                            onChange={(e) => setLocalStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    {/* Payment Method Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Method
                        </label>
                        <select
                            value={localMethod}
                            onChange={(e) => setLocalMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="UPI">UPI</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Credit Card">Credit Card</option>
                            <option value="Debit Card">Debit Card</option>
                            <option value="NEFT/RTGS">NEFT/RTGS</option>
                            <option value="IMPS">IMPS</option>
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={updatingPayment}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePaymentUpdate}
                            disabled={updatingPayment}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {updatingPayment ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Updating...
                                </>
                            ) : (
                                "Update Payment"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentUpdateModal;
