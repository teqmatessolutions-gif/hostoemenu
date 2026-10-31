import React, { useState } from "react";
import { X } from "lucide-react";

const UnitFormModal = ({ onClose, onSave }) => {
    const [unit, setUnit] = useState({ value: "", label: "" });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!unit.value || !unit.label) {
            alert("Please fill in both Unit Value and Label");
            return;
        }
        onSave(unit);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[11000] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Add New Unit</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Value (Code) *
                        </label>
                        <input
                            type="text"
                            value={unit.value}
                            onChange={(e) => setUnit({ ...unit, value: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                            placeholder="e.g. dozen"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            This will be used internally (e.g. 'dozen', 'kg', 'ltr')
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Label (Display Name) *
                        </label>
                        <input
                            type="text"
                            value={unit.label}
                            onChange={(e) => setUnit({ ...unit, label: e.target.value })}
                            placeholder="e.g. Dozen (12 pcs)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Add Unit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UnitFormModal;
