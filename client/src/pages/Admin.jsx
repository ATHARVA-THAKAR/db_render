import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import api from "../api/client.js";
import { LoadingSkeleton, EmptyState, ErrorState } from "../components/States.jsx";

// One admin screen: moderation queue + suggested-match review with
// explainable scoring + one-click approve/reject that notifies both
// parties, plus history export. This is the "one admin screen that
// takes a suggested match to both parties notified in one click"
// differentiator called out in the brief.
export default function Admin() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("queue");

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex gap-2 mb-6 text-sm">
        {[
          ["queue", t("admin.moderationQueue")],
          ["matches", t("admin.matches")],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded ${tab === key ? "bg-brand-700 text-white" : "bg-white border"}`}>
            {label}
          </button>
        ))}
        <a href={`${api.defaults.baseURL}/admin/export.csv`} target="_blank" rel="noreferrer"
          className="ml-auto px-3 py-1.5 rounded bg-gray-800 text-white text-sm">
          {t("admin.export")} (CSV)
        </a>
      </div>
      {tab === "queue" ? <ModerationQueue /> : <MatchReview />}
    </div>
  );
}

function ModerationQueue() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery("moderation-queue", async () => {
    const { data } = await api.get("/admin/moderation-queue");
    return data;
  });

  const decide = useMutation(
    ({ kind, id, verdict }) => api.post(`/admin/moderation/${kind}/${id}`, { verdict }),
    { onSuccess: () => queryClient.invalidateQueries("moderation-queue") }
  );

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState error={error} />;

  const rows = [
    ...data.donations.map((d) => ({ ...d, kind: "donation", by: d.donor?.name })),
    ...data.requests.map((r) => ({ ...r, kind: "request", by: r.receiver?.name })),
  ];

  if (!rows.length) return <EmptyState message="Nothing pending review." />;

  return (
    <div className="grid gap-3">
      {rows.map((item) => (
        <div key={`${item.kind}-${item.id}`} className="bg-white border rounded-lg p-4 flex justify-between items-center gap-4">
          <div>
            <p className="font-medium">{item.title} <span className="text-xs text-gray-400">({item.kind})</span></p>
            <p className="text-sm text-gray-500">{item.description}</p>
            <p className="text-xs text-gray-400 mt-1">By {item.by} · qty {item.quantity} · {item.category}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => decide.mutate({ kind: item.kind, id: item.id, verdict: "approved" })}
              className="bg-green-600 text-white text-sm px-3 py-1.5 rounded">{t("common.approve")}</button>
            <button onClick={() => decide.mutate({ kind: item.kind, id: item.id, verdict: "rejected" })}
              className="bg-red-600 text-white text-sm px-3 py-1.5 rounded">{t("common.reject")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchReview() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery("matches-suggested", async () => {
    const { data } = await api.get("/matches", { params: { status: "suggested" } });
    return data;
  });

  const decide = useMutation(
    ({ id, status }) => api.post(`/admin/matches/${id}/decision`, { status }),
    { onSuccess: () => queryClient.invalidateQueries("matches-suggested") }
  );

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState error={error} />;
  if (!data.length) return <EmptyState message="No suggested matches pending." />;

  return (
    <div className="grid gap-3">
      {data.map((m) => (
        <div key={m.id} className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{m.donation.title} → {m.request.title}</p>
              <p className="text-xs text-gray-400">score {m.score.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => decide.mutate({ id: m.id, status: "approved" })}
                className="bg-green-600 text-white text-sm px-3 py-1.5 rounded">Approve & notify</button>
              <button onClick={() => decide.mutate({ id: m.id, status: "rejected" })}
                className="bg-red-600 text-white text-sm px-3 py-1.5 rounded">Reject</button>
            </div>
          </div>
          {m.scoreBreakdown && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              {Object.entries(m.scoreBreakdown).map(([key, val]) => (
                <span key={key} className="bg-gray-100 px-2 py-0.5 rounded">
                  {key}: {typeof val === "object" ? val.contribution : val}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
