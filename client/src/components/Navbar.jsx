import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const changeLang = (e) => {
    i18n.changeLanguage(e.target.value);
    localStorage.setItem("lang", e.target.value);
  };

  return (
    <nav className="bg-brand-700 text-white px-4 py-3 flex items-center justify-between shadow-sm">
      <Link to="/" className="font-semibold text-lg">{t("app.title")}</Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/" className="hover:underline">{t("nav.browse")}</Link>
        {user && <Link to="/my-items" className="hover:underline">{t("nav.myItems")}</Link>}
        {user?.role === "admin" && <Link to="/admin" className="hover:underline">{t("nav.admin")}</Link>}
        <select
          onChange={changeLang}
          defaultValue={i18n.language}
          aria-label="Select language"
          className="text-gray-900 rounded px-1 py-0.5 text-xs"
        >
          <option value="en">EN</option>
          <option value="hi">हिं</option>
        </select>
        {user ? (
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="bg-brand-600 hover:bg-brand-500 px-3 py-1 rounded"
          >
            {t("nav.logout")}
          </button>
        ) : (
          <>
            <Link to="/login" className="hover:underline">{t("nav.login")}</Link>
            <Link to="/register" className="bg-brand-600 hover:bg-brand-500 px-3 py-1 rounded">{t("nav.register")}</Link>
          </>
        )}
      </div>
    </nav>
  );
}
