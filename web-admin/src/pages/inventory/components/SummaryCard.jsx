import React from "react";

const SummaryCard = ({ label, value, icon, color, highlight }) => {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600",
        red: "bg-red-50 text-red-600",
        green: "bg-green-50 text-green-600",
        purple: "bg-purple-50 text-purple-600",
        indigo: "bg-indigo-50 text-indigo-600",
        teal: "bg-teal-50 text-teal-600",
        orange: "bg-orange-50 text-orange-600",
    };

    return (
        <div
            className={`bg-white rounded-xl shadow-sm border-2 p-3 sm:p-4 ${highlight ? "border-red-300" : "border-gray-100"}`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{label}</p>
                    <div className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold mt-1 break-words ${colorClasses[color]}`}>
                        {value}
                    </div>
                </div>
                <div className={colorClasses[color] + " p-2 sm:p-3 rounded-lg flex-shrink-0"}>{icon}</div>
            </div>
        </div>
    );
};

export default SummaryCard;
