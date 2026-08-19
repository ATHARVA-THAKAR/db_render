import React from "react";
import { useTranslation } from "react-i18next";

export function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="grid gap-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({ message }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12 text-gray-400 text-sm">
      {message || t("common.noResults")}
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="text-center py-12 text-red-500 text-sm">
      Something went wrong{error?.response?.data?.error ? `: ${error.response.data.error}` : "."}
    </div>
  );
}
