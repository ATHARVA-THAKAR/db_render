import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import ItemCard from "../components/ItemCard.jsx";
import { LoadingSkeleton, EmptyState, ErrorState } from "../components/States.jsx";

// Browse open donations — feature I (search/filter/paginate from day one).
export default function Browse() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery(
    ["donations", q, category, page],
    async () => {
      const { data } = await api.get("/donations", { params: { q, category, page, pageSize: 9 } });
      return data;
    },
    { keepPreviousData: true }
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          className="border rounded px-3 py-2 flex-1 min-w-[200px]"
          placeholder={t("search.placeholder")}
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
        />
        <select className="border rounded px-3 py-2" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
          <option value="">{t("item.category")}: all</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
          <option value="electronics">Electronics</option>
          <option value="food">Food</option>
        </select>
      </div>

      {isLoading && <LoadingSkeleton rows={4} />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && <EmptyState />}

      {data && data.items.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
          <div className="flex justify-center gap-3 mt-6 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span className="py-1">Page {data.page} / {data.totalPages || 1}</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </>
      )}
    </div>
  );
}
