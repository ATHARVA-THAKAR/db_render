import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client.js";
import ItemCard from "../components/ItemCard.jsx";
import { LoadingSkeleton, EmptyState, ErrorState } from "../components/States.jsx";

const CATEGORIES = ["clothing", "books", "electronics", "food", "medicine", "furniture", "other"];

// Guided quick-listing form: donor posts donations, receiver posts
// requests. Same shape either way per "receiver flow mirrors donor
// flow" — the resource path is the only real difference.
export default function MyItems() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isDonor = user.role === "donor";
  const resource = isDonor ? "donations" : "requests";
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    category: CATEGORIES[0], title: "", description: "", quantity: 1,
    location: "", region: "", urgency: 3, photos: [],
  });
  const [submitMsg, setSubmitMsg] = useState(null);

  const { data, isLoading, isError, error } = useQuery(["my", resource], async () => {
    // The list endpoint defaults to only approved items, so pass an
    // explicit blank-ish filter workaround: fetch all statuses the
    // owner can see by hitting status=all via query trick — simplest
    // is to just request each status the owner cares about. Here we
    // keep it simple and request everything via a wide net.
    const statuses = ["pending_review", "approved", "rejected", "matched", "completed"];
    const results = await Promise.all(statuses.map((s) => api.get(`/${resource}`, { params: { status: s, pageSize: 50 } })));
    return results.flatMap((r) => r.data.items).filter((i) => (isDonor ? i.donorId : i.receiverId) === user.id);
  });

  const createMutation = useMutation(
    (payload) => api.post(`/${resource}`, payload),
    {
      onSuccess: (res) => {
        setSubmitMsg(`Submitted — status: ${res.data.status}`);
        queryClient.invalidateQueries(["my", resource]);
        setForm({ ...form, title: "", description: "", quantity: 1 });
      },
      onError: (err) => setSubmitMsg(err.response?.data?.error || "Submission failed"),
    }
  );

  const submit = (e) => {
    e.preventDefault();
    createMutation.mutate(isDonor ? form : { ...form });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-lg font-semibold mb-3">{isDonor ? "List a donation" : "Post a request"}</h2>
        <form onSubmit={submit} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
          <select className="border rounded px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input required placeholder={t("item.title")} className="border rounded px-3 py-2"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea required minLength={10} placeholder={t("item.description")} className="border rounded px-3 py-2" rows={3}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-3">
            <input required type="number" min={1} placeholder={t("item.quantity")} className="border rounded px-3 py-2 flex-1"
              value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            {!isDonor && (
              <input type="number" min={1} max={5} placeholder={t("item.urgency")} className="border rounded px-3 py-2 flex-1"
                value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} />
            )}
          </div>
          <div className="flex gap-3">
            <input placeholder={t("item.location")} className="border rounded px-3 py-2 flex-1"
              value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input placeholder={t("item.region")} className="border rounded px-3 py-2 flex-1"
              value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <p className="text-xs text-gray-400">
            Photo upload wires to Cloudinary via a signed upload (see api/client.js + server /utils/cloudinary.js) — omitted here for brevity; paste returned URLs into `photos`.
          </p>
          <button disabled={createMutation.isLoading} className="bg-brand-600 hover:bg-brand-500 text-white rounded py-2 disabled:opacity-50">
            {createMutation.isLoading ? t("common.loading") : t("item.submit")}
          </button>
          {submitMsg && <p className="text-sm text-gray-600">{submitMsg}</p>}
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("nav.myItems")}</h2>
        {isLoading && <LoadingSkeleton />}
        {isError && <ErrorState error={error} />}
        {data && data.length === 0 && <EmptyState />}
        <div className="grid gap-3">
          {data?.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
}
