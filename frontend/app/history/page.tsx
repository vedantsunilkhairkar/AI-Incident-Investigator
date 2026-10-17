"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getIncidents,
  getAllInvestigationHistory,
  Incident,
  InvestigationHistoryRecord,
} from "../../services/api";

export default function InvestigationHistoryPage() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [historyRecords, setHistoryRecords] = useState<InvestigationHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"incidents" | "audit">("incidents");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // User details
  const [username, setUsername] = useState("User");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [authProvider, setAuthProvider] = useState("local");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setUsername(
      localStorage.getItem("name") ||
      localStorage.getItem("username") ||
      "User"
    );
    setEmail(localStorage.getItem("email") || "");
    setAvatarUrl(localStorage.getItem("avatar_url") || "");
    setAuthProvider(localStorage.getItem("auth_provider") || "local");

    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [incidentsData, auditData] = await Promise.all([
        getIncidents({ limit: 100 }),
        getAllInvestigationHistory(100),
      ]);

      setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
      setHistoryRecords(Array.isArray(auditData) ? auditData : []);
    } catch (err) {
      console.warn("Failed to load history data:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    localStorage.removeItem("user");
    localStorage.removeItem("email");
    localStorage.removeItem("avatar_url");
    localStorage.removeItem("auth_provider");
    localStorage.removeItem("rememberMe");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
    window.location.href = "/login";
  }

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  // Filter investigated incidents (incidents with root cause or resolved)
  const investigatedIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.application.toLowerCase().includes(query) ||
        item.error.toLowerCase().includes(query) ||
        (item.root_cause && item.root_cause.toLowerCase().includes(query)) ||
        (item.devops_tool && item.devops_tool.toLowerCase().includes(query));

      const matchesSeverity =
        severityFilter === "All" || item.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [incidents, search, severityFilter]);

  const filteredAuditRecords = useMemo(() => {
    return historyRecords.filter((rec) => {
      const query = search.trim().toLowerCase();
      return (
        !query ||
        rec.application?.toLowerCase().includes(query) ||
        rec.action?.toLowerCase().includes(query) ||
        rec.description?.toLowerCase().includes(query) ||
        (rec.root_cause && rec.root_cause.toLowerCase().includes(query))
      );
    });
  }, [historyRecords, search]);

  const stats = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter((i) => i.status === "Resolved" || Boolean(i.root_cause)).length;
    const critical = incidents.filter((i) => i.severity === "Critical").length;
    return {
      total,
      resolved,
      critical,
      totalEvents: historyRecords.length,
    };
  }, [incidents, historyRecords]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06] bg-[#070b13] transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />
                <path d="M9.5 12.5 11 14l3.5-4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold tracking-tight text-white">IncidentAI</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">SRE Platform</p>
            </div>
          </button>

          <button
            onClick={() => setMobileNavOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workspace</p>

          <nav className="space-y-1">
            <button
              onClick={() => {
                router.push("/");
                setMobileNavOpen(false);
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              Dashboard
            </button>

            <button
              onClick={() => {
                router.push("/history");
                setMobileNavOpen(false);
              }}
              className="group flex w-full items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.08] px-3 py-3 text-left text-sm font-medium text-cyan-200"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              Investigation History
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </button>

            <button
              onClick={() => {
                router.push("/incidents/new");
                setMobileNavOpen(false);
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              New Incident
            </button>

            <button
              onClick={() => {
                router.push("/profile");
                setMobileNavOpen(false);
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="3" />
                  <path d="M5 20c.8-3.5 3.2-5.5 7-5.5s6.2 2 7 5.5" />
                </svg>
              </span>
              Profile
            </button>
          </nav>

          <div className="my-6 h-px bg-white/[0.06]" />

          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Database & Status</p>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-300">Database Connected</span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Synchronized with PostgreSQL audit repository.
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-cyan-400/30"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-xs font-bold text-cyan-300 ring-1 ring-cyan-400/20">
                {getInitials(username)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-200">{username}</p>
              <p className="truncate text-[10px] text-slate-400">
                {email || (authProvider === "google" ? "Google Account" : "SRE Engineer")}
              </p>
            </div>
            {authProvider === "google" && (
              <span className="shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-300 ring-1 ring-blue-500/20">
                Google
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-red-500/[0.08] hover:text-red-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M21 3v18" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative min-h-screen lg:pl-[260px]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070b13]/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-slate-400 hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <p className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 sm:block">
                  Audit & Investigation Repository
                </p>
                <h1 className="text-sm font-semibold text-white sm:text-base">
                  Investigation History
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                <span className={loading ? "animate-spin" : ""}>🔄</span>
                <span>Refresh History</span>
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-purple-950/20 p-6 sm:p-8 shadow-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
              <span>📜</span>
              <span>Investigation Knowledge Base</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Past SRE Investigations & Root Causes
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Explore all past incident investigations conducted by the autonomous SRE agent. Review discovered root causes, preventative runbooks, and verify organizational reliability trends.
            </p>

            {/* Quick Metrics */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Incidents</p>
                <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Investigated / Resolved</p>
                <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.resolved}</p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Critical Handled</p>
                <p className="mt-1 text-2xl font-bold text-red-300">{stats.critical}</p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Audit Events Logged</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          {/* Controls: Search, Filter, and Tabs */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* View Tabs */}
            <div className="inline-flex rounded-2xl border border-white/[0.08] bg-[#070b13] p-1">
              <button
                onClick={() => setActiveTab("incidents")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === "incidents"
                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Investigated Incidents ({investigatedIncidents.length})
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === "audit"
                    ? "bg-cyan-500/20 text-cyan-300 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Detailed Audit Timeline ({filteredAuditRecords.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="flex flex-1 items-center gap-3 sm:max-w-md">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by app, root cause, error..."
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0a101f] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {activeTab === "incidents" && (
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="rounded-xl border border-white/[0.08] bg-[#0a101f] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              )}
            </div>
          </div>

          {/* TAB 1: INVESTIGATED INCIDENTS */}
          {activeTab === "incidents" && (
            <div className="space-y-4">
              {loading ? (
                <div className="rounded-3xl border border-white/[0.06] bg-[#070b13] p-12 text-center text-slate-500">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400 mb-3" />
                  <p className="text-sm">Loading historical incidents from database...</p>
                </div>
              ) : investigatedIncidents.length === 0 ? (
                <div className="rounded-3xl border border-white/[0.06] bg-[#070b13] p-12 text-center">
                  <p className="text-base font-semibold text-white">No matching incidents found</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try clearing your search query or create a new incident to investigate.
                  </p>
                  <button
                    onClick={() => router.push("/incidents/new")}
                    className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
                  >
                    + Create New Incident
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {investigatedIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a101f] p-5 transition hover:border-cyan-500/40 hover:bg-[#0c1427]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-400">#{inc.id}</span>
                            <span className="text-sm font-bold text-white">{inc.application}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                inc.severity === "Critical"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : inc.severity === "High"
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  : inc.severity === "Medium"
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {inc.severity}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                inc.status === "Resolved"
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : inc.status === "Investigating"
                                  ? "bg-purple-500/10 text-purple-300"
                                  : "bg-sky-500/10 text-sky-300"
                              }`}
                            >
                              {inc.status}
                            </span>
                            {inc.devops_tool && (
                              <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300">
                                🛠️ {inc.devops_tool}
                              </span>
                            )}
                            {inc.environment && (
                              <span className="rounded-lg bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                                {inc.environment}
                              </span>
                            )}
                          </div>

                          <p className="font-mono text-xs text-slate-300 bg-black/30 p-2.5 rounded-xl border border-white/[0.04] line-clamp-2">
                            {inc.error}
                          </p>

                          {inc.root_cause ? (
                            <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3 text-xs text-blue-200">
                              <span className="font-bold text-blue-400">AI Root Cause: </span>
                              <span className="line-clamp-2">{inc.root_cause}</span>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              Pending AI investigation. Click to trigger autonomous triage.
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => router.push(`/incidents/${inc.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                          >
                            <span>Inspect Incident</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED AUDIT TIMELINE */}
          {activeTab === "audit" && (
            <div className="rounded-3xl border border-white/[0.06] bg-[#070b13] p-6 sm:p-8">
              {loading ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400 mb-3" />
                  <p className="text-sm">Loading audit events from database...</p>
                </div>
              ) : filteredAuditRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm">No audit events match your search.</p>
                </div>
              ) : (
                <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
                  {filteredAuditRecords.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-cyan-400 shadow-sm shadow-cyan-400/50" />

                      <div className="rounded-2xl border border-slate-800/90 bg-[#0a101f] p-4 transition hover:border-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-400">
                              #{item.incident_id}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {item.application}
                            </span>
                            <span className="inline-flex items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                              {item.action}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-300 leading-relaxed mb-2">
                            {item.description}
                          </p>
                        )}

                        {item.root_cause && (
                          <div className="mt-2 rounded-xl bg-blue-500/[0.06] border border-blue-500/20 p-2.5 text-xs text-blue-200">
                            <span className="font-semibold text-blue-400">Root Cause Identified: </span>
                            {item.root_cause}
                          </div>
                        )}

                        <div className="mt-3">
                          <button
                            onClick={() => router.push(`/incidents/${item.incident_id}`)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                          >
                            View Incident #{item.incident_id} →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
