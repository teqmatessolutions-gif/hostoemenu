import React, { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";

const Laundry = () => {
    const [laundryItems, setLaundryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchLaundryItems();
    }, []);

    const fetchLaundryItems = async () => {
        try {
            setLoading(true);
            // Fetch items specifically in the LAUNDRY location
            const response = await api.get("/inventory/laundry/items");
            setLaundryItems(response.data);
        } catch (error) {
            console.error("Error fetching laundry items:", error);
            toast.error("Failed to load laundry items");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkWashed = async (logId) => {
        try {
            setProcessingId(logId);
            await api.patch(`/inventory/laundry/${logId}/status?status=Washed`);
            toast.success("Item marked as WASHED");
            fetchLaundryItems();
        } catch (error) {
            console.error("Error processing laundry:", error);
            toast.error("Failed to update status");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReturnItem = async (item) => {
        try {
            // Return to source location (Room)
            if (!item.source_location_id) {
                toast.error("Source location unknown");
                return;
            }
            setProcessingId(item.id);
            await api.post(`/inventory/laundry/return-items?log_id=${item.id}&target_location_id=${item.source_location_id}`);
            toast.success("Item returned to source location");
            fetchLaundryItems();
        } catch (error) {
            console.error("Error returning laundry:", error);
            toast.error("Failed to return item");
            // Detailed error for debugging
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            }
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Laundry Management</h1>
                <button
                    onClick={fetchLaundryItems}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source (Room)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Sent</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : laundryItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No items in laundry</td>
                                </tr>
                            ) : (
                                laundryItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                                            <div className="text-sm text-gray-500">{item.item_code}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.quantity} {item.unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.room_number || "N/A"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'Washed'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(item.sent_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {item.status === "Incomplete Washing" && (
                                                <button
                                                    onClick={() => handleMarkWashed(item.id)}
                                                    disabled={processingId === item.id}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4 disabled:opacity-50"
                                                >
                                                    {processingId === item.id ? "Processing..." : "Mark Washed"}
                                                </button>
                                            )}
                                            {item.status === "Washed" && (
                                                <button
                                                    onClick={() => handleReturnItem(item)}
                                                    disabled={processingId === item.id}
                                                    className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                >
                                                    {processingId === item.id ? "Returning..." : "Return to Room"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Laundry;
