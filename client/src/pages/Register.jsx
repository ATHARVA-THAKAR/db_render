import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "donor", orgName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white p-6 rounded-lg shadow-sm border">
      <h1 className="text-xl font-semibold mb-4">{t("nav.register")}</h1>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input required placeholder={t("auth.name")} className="border rounded px-3 py-2"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder={t("auth.email")} className="border rounded px-3 py-2"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" minLength={8} placeholder={t("auth.password") + " (min 8 chars)"} className="border rounded px-3 py-2"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input placeholder="Organization name (optional)" className="border rounded px-3 py-2"
          value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
        <label className="text-sm text-gray-600">{t("auth.role")}</label>
        <select className="border rounded px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="donor">{t("auth.role.donor")}</option>
          <option value="receiver">{t("auth.role.receiver")}</option>
        </select>
        <button disabled={loading} className="bg-brand-600 hover:bg-brand-500 text-white rounded py-2 disabled:opacity-50">
          {loading ? t("common.loading") : t("auth.submit.register")}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Already registered? <Link to="/login" className="text-brand-600 underline">{t("nav.login")}</Link>
      </p>
    </div>
  );
}
