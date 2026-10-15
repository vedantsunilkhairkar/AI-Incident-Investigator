"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getIncidents,
  updateIncidentStatus,
  getAnalyticsSummary,
} from "../services/api";

interface Incident {
  id: number;
  application: string;
  error: string;
  severity: string;
  description: string;
  status: string;
  root_cause?: string;
  investigation_severity?: string;
  explanation?: string;
  suggested_solution?: string;
  preventive_action?: string;
  devops_tool?: string;
  environment?: string;
  service_or_cluster?: string;
  incident_category?: string;
  ai_remediation_commands?: string;
  ai_runbook?: string;
}

const severityStyles: Record<string, string> = {
  Critical:
    "border-red-500/30 bg-red-500/10 text-red-300 ring-1 ring-red-500/10",
  High:
    "border-orange-500/30 bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/10",
  Medium:
    "border-yellow-500/30 bg-yellow-500/10 text-yellow-300 ring-1 ring-yellow-500/10",
  Low:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/10",
};

const statusStyles: Record<string, string> = {
  Open:
    "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Investigating:
    "border-violet-500/30 bg-violet-500/10 text-violet-300",
  Resolved:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "Critical") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
    );
  }

  if (severity === "High") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-300">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6v12" />
          <path d="M6 12h12" />
        </svg>
      </span>
    );
  }

  if (severity === "Medium") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-300">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 7v5l3 2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m7 12 3 3 7-7" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const dot =
    status === "Resolved"
      ? "bg-emerald-400"
      : status === "Investigating"
        ? "bg-violet-400"
        : "bg-sky-400";

  return <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />;
}

export default function Dashboard() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [username, setUsername] = useState("User");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [devopsFilter, setDevopsFilter] = useState("All");
  const [environmentFilter, setEnvironmentFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ML Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  const incidentsPerPage = 8;

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const savedUsername =
      localStorage.getItem("username") ||
      localStorage.getItem("user") ||
      "User";

    setUsername(savedUsername);

    loadIncidents();
    loadAnalytics();
  }, [router]);

  async function loadIncidents(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const data = await getIncidents();
      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load incidents. Please check that the backend is running.");

      const message =
        err instanceof Error ? err.message.toLowerCase() : "";

      if (
        message.includes("401") ||
        message.includes("unauthorized") ||
        message.includes("token")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("user");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadAnalytics() {
    try {
      const data = await getAnalyticsSummary();
      setAnalytics(data);
    } catch {
      // silent fail — analytics is a bonus
    }
  }

  async function handleRefresh() {
    await loadIncidents(true);
    await loadAnalytics();
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await updateIncidentStatus(id, status);

      setIncidents((previous) =>
        previous.map((incident) =>
          incident.id === id ? { ...incident, status } : incident
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update incident status.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    localStorage.removeItem("email");
    localStorage.removeItem("rememberMe");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

    router.replace("/login");
  }

  const stats = useMemo(() => {
    return {
      total: incidents.length,
      open: incidents.filter((item) => item.status === "Open").length,
      investigating: incidents.filter(
        (item) => item.status === "Investigating"
      ).length,
      resolved: incidents.filter((item) => item.status === "Resolved").length,
      critical: incidents.filter((item) => item.severity === "Critical").length,
    };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        !query ||
        incident.application.toLowerCase().includes(query) ||
        incident.error.toLowerCase().includes(query) ||
        incident.description.toLowerCase().includes(query) ||
        (incident.devops_tool && incident.devops_tool.toLowerCase().includes(query)) ||
        (incident.environment && incident.environment.toLowerCase().includes(query)) ||
        String(incident.id).includes(query);

      const matchesSeverity =
        severityFilter === "All" || incident.severity === severityFilter;

      const matchesStatus =
        statusFilter === "All" || incident.status === statusFilter;

      const matchesDevops =
        devopsFilter === "All" || incident.devops_tool === devopsFilter;

      const matchesEnv =
        environmentFilter === "All" || incident.environment === environmentFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesDevops && matchesEnv;
    });
  }, [incidents, search, severityFilter, statusFilter, devopsFilter, environmentFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredIncidents.length / incidentsPerPage)
  );

  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * incidentsPerPage,
    currentPage * incidentsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, severityFilter, statusFilter, devopsFilter, environmentFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function resetFilters() {
    setSearch("");
    setSeverityFilter("All");
    setStatusFilter("All");
    setDevopsFilter("All");
    setEnvironmentFilter("All");
    setCurrentPage(1);
  }

  const hasFilters =
    search.trim() !== "" ||
    severityFilter !== "All" ||
    statusFilter !== "All" ||
    devopsFilter !== "All" ||
    environmentFilter !== "All";

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/[0.06] blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-500/[0.05] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-500/[0.04] blur-3xl" />
      </div>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.07] bg-[#0a0f19]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/[0.06] px-5">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />
                <path d="M9.5 12.5 11 14l3.5-4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold tracking-tight text-white">
                IncidentAI
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                SRE Platform
              </p>
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
          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            Workspace
          </p>

          <nav className="space-y-1">
            <button
              onClick={() => {
                router.push("/");
                setMobileNavOpen(false);
              }}
              className="group flex w-full items-center gap-3 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.08] px-3 py-3 text-left text-sm font-medium text-cyan-200"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              Dashboard
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

          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            System
          </p>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-300">
                System Online
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Incident API is connected and ready to process events.
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-xs font-bold text-cyan-300 ring-1 ring-cyan-400/20">
              {getInitials(username)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">
                {username}
              </p>
              <p className="text-[10px] text-slate-500">Engineer</p>
            </div>
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

      {/* Main */}
      <main className="relative min-h-screen lg:pl-[260px]">
        {/* Top header */}
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
                  SRE Autonomous Operations
                </p>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-white sm:text-base">
                    Incident Dashboard
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-mono text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Agentic SRE Engine: Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 11a8 8 0 0 0-14.8-4M4 5v5h5" />
                  <path d="M4 13a8 8 0 0 0 14.8 4M20 19v-5h-5" />
                </svg>
                <span className="hidden sm:inline">
                  {refreshing ? "Refreshing" : "Refresh"}
                </span>
              </button>

              <button
                onClick={() => router.push("/incidents/new")}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110 sm:px-4"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>New Incident</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Welcome */}
          <section className="relative mb-7 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-[#101a29] via-[#0d1522] to-[#0a101a] p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.08] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-blue-500/[0.05] blur-3xl" />

            <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  SRE Control Center
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Welcome back, {username}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Monitor incidents, investigate production issues with AI,
                  and keep your systems healthy from one place.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M3 12h18" />
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">
                    Platform Status
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-300">
                    Operational
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total Incidents"
              value={stats.total}
              icon="total"
              description="All reported issues"
            />
            <StatCard
              label="Open"
              value={stats.open}
              icon="open"
              description="Waiting for action"
            />
            <StatCard
              label="Investigating"
              value={stats.investigating}
              icon="investigating"
              description="Under investigation"
            />
            <StatCard
              label="Resolved"
              value={stats.resolved}
              icon="resolved"
              description="Successfully closed"
            />
            <StatCard
              label="Critical"
              value={stats.critical}
              icon="critical"
              description="Needs priority"
              highlight={stats.critical > 0}
            />
          </section>

          {/* ═══ ML Analytics Intelligence Bar ═══ */}
          {analytics && analytics.total > 0 && (
            <section className="mb-7 overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.05] via-[#0b111c]/80 to-blue-500/[0.05]">
              <div className="flex items-center gap-2 border-b border-white/[0.05] px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">🤖 ML Insights</span>
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">Live</span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/[0.05] sm:grid-cols-4">
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">Resolution Rate</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {analytics.resolution_rate}<span className="text-sm text-slate-500">%</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{analytics.resolved} of {analytics.total} resolved</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">Most Broken App</p>
                  <p className="mt-1 truncate text-sm font-bold text-orange-300">
                    {analytics.top_broken_app || "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{analytics.top_broken_app_count} incidents</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">Critical Alerts</p>
                  <p className={`mt-1 text-xl font-bold ${analytics.critical_count > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {analytics.critical_count}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{analytics.high_count} high severity</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">Top Category</p>
                  <p className="mt-1 truncate text-sm font-bold text-violet-300">
                    {analytics.top_category || "Uncategorized"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">ML-detected pattern</p>
                </div>
              </div>
            </section>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-200">
                    Something went wrong
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-red-300/70">
                    {error}
                  </p>
                </div>
              </div>

              <button
                onClick={() => loadIncidents()}
                className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/15"
              >
                Try again
              </button>
            </div>
          )}

          {/* Incidents panel */}
          <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b111c]/80 shadow-2xl shadow-black/20">
            <div className="border-b border-white/[0.06] p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-white sm:text-lg">
                      Incident History
                    </h3>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {filteredIncidents.length} shown
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Track and manage your application incidents.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                  <div className="relative flex-1 sm:min-w-[240px] xl:w-[280px]">
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-4-4" />
                    </svg>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search incidents..."
                      className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 pl-9 pr-9 text-xs text-slate-200 outline-none placeholder:text-slate-600 transition focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/10"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
                        aria-label="Clear search"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m6 6 12 12M18 6 6 18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <select
                    value={severityFilter}
                    onChange={(event) => setSeverityFilter(event.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-[#101722] px-3 text-xs text-slate-300 outline-none focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-[#101722] px-3 text-xs text-slate-300 outline-none focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Resolved">Resolved</option>
                  </select>

                  <select
                    value={devopsFilter}
                    onChange={(event) => setDevopsFilter(event.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-[#101722] px-3 text-xs text-slate-300 outline-none focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="All">All DevOps Tools</option>
                    <option value="Kubernetes">☸️ Kubernetes</option>
                    <option value="Docker">🐳 Docker</option>
                    <option value="AWS / Cloud">☁️ AWS / Cloud</option>
                    <option value="Terraform">🟣 Terraform</option>
                    <option value="CI/CD">🚀 CI/CD</option>
                    <option value="Prometheus">📊 Prometheus</option>
                    <option value="NGINX">🌐 NGINX</option>
                    <option value="Database">🗄️ Database</option>
                  </select>

                  <select
                    value={environmentFilter}
                    onChange={(event) => setEnvironmentFilter(event.target.value)}
                    className="h-10 rounded-xl border border-white/[0.08] bg-[#101722] px-3 text-xs text-slate-300 outline-none focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/10"
                  >
                    <option value="All">All Environments</option>
                    <option value="Production">● Production</option>
                    <option value="Staging">● Staging</option>
                    <option value="Development">● Development</option>
                  </select>

                  {hasFilters && (
                    <button
                      onClick={resetFilters}
                      className="h-10 rounded-xl border border-white/[0.08] px-3 text-xs font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="p-4 sm:p-5">
                <div className="hidden md:block">
                  <div className="mb-3 grid grid-cols-6 gap-4 border-b border-white/[0.05] px-4 pb-3">
                    {["ID", "Application", "Error", "Severity", "Status", "Action"].map(
                      (label) => (
                        <div
                          key={label}
                          className="h-3 animate-pulse rounded bg-white/[0.05]"
                        />
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-6 items-center gap-4 rounded-2xl border border-white/[0.04] px-4 py-5"
                      >
                        {Array.from({ length: 6 }).map((__, cell) => (
                          <div
                            key={cell}
                            className={`h-4 animate-pulse rounded bg-white/[0.04] ${
                              cell === 2 ? "w-4/5" : "w-2/3"
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/[0.05] p-4"
                    >
                      <div className="mb-4 flex justify-between">
                        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.05]" />
                        <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.05]" />
                      </div>
                      <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.05]" />
                      <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/[0.04]" />
                      <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-white/[0.04]" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="px-5 py-16 text-center sm:py-20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-slate-600">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M8 9h8M8 13h5M8 17h3" />
                  </svg>
                </div>

                <h4 className="mt-5 text-sm font-semibold text-slate-200">
                  {hasFilters ? "No matching incidents" : "No incidents yet"}
                </h4>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
                  {hasFilters
                    ? "Try changing your search or filters to find the incident you need."
                    : "Create your first incident to start monitoring and investigating application issues."}
                </p>

                <div className="mt-5 flex justify-center gap-2">
                  {hasFilters && (
                    <button
                      onClick={resetFilters}
                      className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.04]"
                    >
                      Clear filters
                    </button>
                  )}

                  {!hasFilters && (
                    <button
                      onClick={() => router.push("/incidents/new")}
                      className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/10 hover:bg-cyan-400"
                    >
                      Create Incident
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[850px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-left">
                        <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          ID
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Application
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Error
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Severity
                        </th>
                        <th className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Status
                        </th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedIncidents.map((incident) => (
                        <tr
                          key={incident.id}
                          onClick={() =>
                            router.push(`/incidents/${incident.id}`)
                          }
                          className="group cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              #{String(incident.id).padStart(4, "0")}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-[10px] font-bold uppercase text-slate-400">
                                {incident.application.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="max-w-[150px] truncate text-sm font-medium text-slate-200">
                                    {incident.application}
                                  </p>
                                  {incident.environment && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded border border-white/10 bg-white/5 text-slate-400">
                                      {incident.environment === "Production" ? "prod" : incident.environment === "Staging" ? "stage" : "dev"}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2">
                                  {incident.devops_tool ? (
                                    <span className="text-[10px] font-medium text-cyan-400">
                                      {incident.devops_tool}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-600">
                                      Application
                                    </span>
                                  )}
                                  {incident.incident_category && (
                                    <span className="text-[10px] text-slate-500">
                                      • {incident.incident_category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="max-w-[300px] px-4 py-4">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm text-slate-300">
                                {incident.error}
                              </p>
                              {incident.root_cause && (
                                <span className="shrink-0 text-[9px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                  🤖 Triaged
                                </span>
                              )}
                            </div>
                            <p className="mt-1 max-w-[280px] truncate text-[10px] text-slate-500">
                              {incident.description}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold ${
                                severityStyles[incident.severity] ||
                                "border-white/10 bg-white/5 text-slate-400"
                              }`}
                            >
                              <SeverityIcon severity={incident.severity} />
                              <span>{incident.severity}</span>
                            </span>
                          </td>

                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={incident.status}
                              onChange={(event) =>
                                handleStatusChange(
                                  incident.id,
                                  event.target.value
                                )
                              }
                              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold outline-none ${
                                statusStyles[incident.status] ||
                                "border-white/10 bg-white/5 text-slate-400"
                              } bg-[#0d1420]`}
                            >
                              <option value="Open">Open</option>
                              <option value="Investigating">
                                Investigating
                              </option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/incidents/${incident.id}`);
                              }}
                              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] font-semibold text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05] hover:text-cyan-300"
                            >
                              View
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M13 6l6 6-6 6" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {paginatedIncidents.map((incident) => (
                    <article
                      key={incident.id}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 transition active:bg-white/[0.03]"
                    >
                      <button
                        onClick={() =>
                          router.push(`/incidents/${incident.id}`)
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-[10px] font-bold uppercase text-slate-400">
                              {incident.application.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-200">
                                {incident.application}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                                #{String(incident.id).padStart(4, "0")}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-lg border px-2 py-1 text-[9px] font-semibold ${
                              severityStyles[incident.severity] ||
                              "border-white/10 bg-white/5 text-slate-400"
                            }`}
                          >
                            {incident.severity}
                          </span>
                        </div>

                        <div className="mt-4 rounded-xl border border-white/[0.05] bg-black/10 p-3">
                          <p className="line-clamp-2 text-xs leading-5 text-slate-400">
                            {incident.error}
                          </p>
                        </div>
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
                        <div className="flex items-center gap-2 text-[10px] text-slate-600">
                          <StatusDot status={incident.status} />
                          {incident.status}
                        </div>

                        <select
                          value={incident.status}
                          onChange={(event) =>
                            handleStatusChange(
                              incident.id,
                              event.target.value
                            )
                          }
                          className={`rounded-lg border bg-[#0d1420] px-2.5 py-1.5 text-[10px] font-semibold outline-none ${
                            statusStyles[incident.status] ||
                            "border-white/10 text-slate-400"
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="Investigating">
                            Investigating
                          </option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-[10px] text-slate-600">
                    Showing{" "}
                    <span className="font-semibold text-slate-400">
                      {filteredIncidents.length === 0
                        ? 0
                        : (currentPage - 1) * incidentsPerPage + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-400">
                      {Math.min(
                        currentPage * incidentsPerPage,
                        filteredIncidents.length
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-400">
                      {filteredIncidents.length}
                    </span>{" "}
                    incidents
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      className="flex h-8 items-center gap-1 rounded-lg border border-white/[0.07] px-2.5 text-[10px] font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-cyan-500/10 px-2 text-[10px] font-semibold text-cyan-300">
                      {currentPage}
                    </span>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      className="flex h-8 items-center gap-1 rounded-lg border border-white/[0.07] px-2.5 text-[10px] font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Bottom platform info */}
          <div className="mt-5 flex flex-col gap-2 px-1 text-[10px] text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <p>IncidentAI • AI-powered software incident management</p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
              <span>API connected</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: "total" | "open" | "investigating" | "resolved" | "critical";
  description: string;
  highlight?: boolean;
}) {
  const iconMap = {
    total: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h6M8 17h3" />
      </svg>
    ),
    open: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    ),
    investigating: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
        <path d="M9 11h4M11 9v4" />
      </svg>
    ),
    resolved: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="m7 12 3 3 7-7" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
    critical: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 8v4M12 16h.01" />
        <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
  };

  const iconBackground = highlight
    ? "bg-red-500/10 text-red-300"
    : icon === "resolved"
      ? "bg-emerald-500/10 text-emerald-300"
      : icon === "investigating"
        ? "bg-violet-500/10 text-violet-300"
        : icon === "open"
          ? "bg-sky-500/10 text-sky-300"
          : "bg-cyan-500/10 text-cyan-300";

  return (
    <div
      className={`group rounded-2xl border bg-[#0b111c]/80 p-4 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#0d1420] ${
        highlight
          ? "border-red-500/20"
          : "border-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBackground}`}
        >
          {iconMap[icon]}
        </div>

        {highlight && value > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-red-300">
            Priority
          </span>
        )}
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{label}</p>
      <p className="mt-1 hidden text-[10px] text-slate-600 sm:block">
        {description}
      </p>
    </div>
  );
}
