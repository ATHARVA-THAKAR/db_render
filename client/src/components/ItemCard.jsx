import React from "react";
import { useTranslation } from "react-i18next";

const STATUS_COLORS = {
  pending_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  matched: "bg-blue-100 text-blue-800",
  completed: "bg-gray-200 text-gray-700",
};

export default function ItemCard({ item }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-900">{item.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
          {t(`item.status.${item.status}`, item.status)}
        </span>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
        <span>📦 {item.category}</span>
        <span>#️⃣ {item.quantity}</span>
        {item.location && <span>📍 {item.location}</span>}
        {item.urgency && <span>⚡ {item.urgency}/5</span>}
      </div>
    </div>
  );
}
