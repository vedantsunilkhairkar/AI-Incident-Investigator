"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSimilarIncidents } from "../../../services/api";

interface Incident {
  id: number;
  application: string;
  error: string;
  severity: string;
  description: string;
  status: string;

  root_cause?: string | null;
  investigation_severity?: string | null;
  explanation?: string | null;
  suggested_solution?: string | null;
  preventive_action?: string | null;

  // ML fields
  incident_category?: string | null;
  ml_predicted_severity?: string | null;
}

interface SimilarIncident {
  id: number;
  application: string;
  error: string;
  severity: string;
  root_cause?: string;
  suggested_solution?: string;
  preventive_action?: string;
  similarity_score: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function IncidentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investigating, setInvestigating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ML: Similar incidents state
  const [similar, setSimilar] = useState<SimilarIncident[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [expandedSimilar, setExpandedSimilar] = useState<number | null>(null);

  const incidentId = params?.id;

  const fetchIncident = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      if (!incidentId) {
        setError("Incident ID not found.");
        return;
      }

      const response = await fetch(
        `${API_URL}/incidents/${incidentId}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load incident.");
      }

      setIncident(data);
    } catch (err: any) {
      setError(err?.message || "Unable to load incident details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilar = async () => {
    if (!incidentId) return;
    setSimilarLoading(true);
    try {
      const data = await getSimilarIncidents(Number(incidentId));
      setSimilar(data.similar || []);
    } catch {
      // Silent fail — similar incidents are a bonus, not critical
    } finally {
      setSimilarLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    fetchSimilar();
  }, [incidentId]);

  const handleReinvestigate = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      setInvestigating(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_URL}/incidents/${incidentId}/investigate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "AI investigation failed.");
      }

      setSuccessMessage("AI investigation completed successfully.");
      await fetchIncident();
      await fetchSimilar();
    } catch (err: any) {
      setError(err?.message || "AI investigation failed.");
    } finally {
      setInvestigating(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-red-500/10 text-red-300 border-red-500/30";
      case "High": return "bg-orange-500/10 text-orange-300 border-orange-500/30";
      case "Medium": return "bg-yellow-500/10 text-yellow-300 border-yellow-500/30";
      case "Low": return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      default: return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Open": return "bg-red-500/10 text-red-300 border-red-500/30";
      case "Investigating": return "bg-blue-500/10 text-blue-300 border-blue-500/30";
      case "Resolved": return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      default: return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-red-300 bg-red-500/10 border-red-500/20";
    if (score >= 80) return "text-orange-300 bg-orange-500/10 border-orange-500/20";
    return "text-yellow-300 bg-yellow-500/10 border-yellow-500/20";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0c1220] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          </div>
          <h2 className="text-lg font-semibold">Loading incident</h2>
          <p className="mt-2 text-sm text-slate-500">
            Fetching incident details and AI data...
          </p>
        </div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white px-4 sm:px-6">
        <div className="mx-auto max-w-4xl py-10 sm:py-16">
          <button
            onClick={() => router.push("/")}
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <span>←</span> Back to Dashboard
          </button>
          <div className="rounded-3xl border border-red-500/20 bg-[#0c1220] p-7 sm:p-10 shadow-2xl">
            <h1 className="text-2xl font-bold">Unable to load incident</h1>
            <p className="mt-3 text-sm leading-6 text-red-300">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-7 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  return (
    <div className="min-h-screen bg-[#070b14] text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute -right-40 bottom-20 h-96 w-96 rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/80 bg-[#070b14]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <button
              onClick={() => router.push("/")}
              className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <span>←</span> Back to Dashboard
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Incident Details
              </h1>
              <span className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-xs font-medium text-slate-400">
                #{incident.id}
              </span>
              {/* ML: Category badge */}
              {incident.incident_category && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                  🏷 {incident.incident_category}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Review incident information and AI-powered investigation.
            </p>
          </div>

          <button
            onClick={() => router.push("/incidents/new")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 sm:w-auto"
          >
            <span className="text-lg leading-none">+</span>
            New Incident
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Alerts */}
        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm text-emerald-400">✓</div>
            <div>
              <p className="font-medium text-emerald-300">Investigation completed</p>
              <p className="mt-1 text-sm text-emerald-400/80">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-sm text-red-400">!</div>
            <div>
              <p className="font-medium text-red-300">Something went wrong</p>
              <p className="mt-1 text-sm text-red-400/80">{error}</p>
            </div>
          </div>
        )}

        {/* Summary card */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-800/80 bg-[#0c1220] shadow-2xl">
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Application</span>
                </div>
                <h2 className="break-words text-2xl font-bold sm:text-3xl">{incident.application}</h2>
                <div className="mt-4 flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400 shadow-lg shadow-red-500/30" />
                  <p className="break-words text-sm leading-6 text-slate-400 sm:text-base">{incident.error}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold ${getSeverityStyle(incident.severity)}`}>
                  Severity: {incident.severity}
                </span>
                <span className={`inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold ${getStatusStyle(incident.status)}`}>
                  {incident.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 border-t border-slate-800/80 sm:grid-cols-3">
            <div className="border-b border-slate-800/80 p-5 sm:border-b-0 sm:border-r">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Incident ID</p>
              <p className="mt-2 font-semibold text-slate-200">#{incident.id}</p>
            </div>
            <div className="border-b border-slate-800/80 p-5 sm:border-b-0 sm:border-r">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Severity</p>
              <p className="mt-2 font-semibold text-slate-200">{incident.severity}</p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Status</p>
              <p className="mt-2 font-semibold text-slate-200">{incident.status}</p>
            </div>
          </div>
        </section>

        {/* Info + Description */}
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-3xl border border-slate-800/80 bg-[#0c1220] p-5 shadow-xl sm:p-6 lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-lg">◈</div>
              <div>
                <h3 className="font-semibold">Incident Information</h3>
                <p className="text-xs text-slate-500">Original incident data</p>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Application</p>
                <p className="mt-2 break-words text-sm text-slate-200">{incident.application}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Error</p>
                <div className="mt-2 rounded-xl border border-slate-800 bg-[#080d18] p-3">
                  <p className="break-words font-mono text-xs leading-6 text-slate-300">{incident.error}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Severity</p>
                <span className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${getSeverityStyle(incident.severity)}`}>
                  {incident.severity}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-600">Status</p>
                <span className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${getStatusStyle(incident.status)}`}>
                  {incident.status}
                </span>
              </div>
              {/* ML: Category */}
              {incident.incident_category && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-600">ML Category</p>
                  <span className="mt-2 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                    {incident.incident_category}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/80 bg-[#0c1220] p-5 shadow-xl sm:p-6 lg:col-span-3">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-lg">≡</div>
              <div>
                <h3 className="font-semibold">Incident Description</h3>
                <p className="text-xs text-slate-500">Context provided for investigation</p>
              </div>
            </div>
            <div className="min-h-[220px] rounded-2xl border border-slate-800 bg-[#080d18] p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {incident.description || "No description was provided for this incident."}
              </p>
            </div>
          </div>
        </section>

        {/* ═══ ML: Similar Past Incidents ═══ */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-[#0c1220] shadow-2xl">
          <div className="border-b border-slate-800/80 bg-gradient-to-r from-violet-500/5 via-transparent to-purple-500/5 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-xl">
                🔍
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold sm:text-xl">Similar Past Incidents</h3>
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    ML Powered
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Past resolved incidents from your organization that closely match this one
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {similarLoading ? (
              <div className="flex items-center gap-3 py-6 text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-violet-400" />
                <span className="text-sm">Searching for similar incidents using ML...</span>
              </div>
            ) : similar.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-6 text-center">
                <p className="text-sm text-slate-500">
                  No similar past incidents found yet.{" "}
                  <span className="text-slate-400">
                    As more incidents are resolved, this section will show matches with their verified fixes.
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {similar.map((s) => (
                  <div
                    key={s.id}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-[#080d18] transition hover:border-violet-500/30"
                  >
                    {/* Card header */}
                    <div
                      className="flex cursor-pointer items-center justify-between gap-4 p-4"
                      onClick={() => setExpandedSimilar(expandedSimilar === s.id ? null : s.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-400">
                            #{s.id} · {s.application}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getSeverityStyle(s.severity)}`}>
                            {s.severity}
                          </span>
                        </div>
                        <p className="truncate text-sm text-slate-300">{s.error}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getScoreColor(s.similarity_score)}`}>
                          {s.similarity_score}% match
                        </span>
                        <span className="text-slate-500 text-xs">
                          {expandedSimilar === s.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Expanded fix */}
                    {expandedSimilar === s.id && (
                      <div className="border-t border-slate-800 p-4 space-y-4">
                        {s.root_cause && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Root Cause</p>
                            <p className="text-sm leading-6 text-slate-300">{s.root_cause}</p>
                          </div>
                        )}
                        {s.suggested_solution && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Verified Fix</p>
                            <p className="text-sm leading-6 text-emerald-300/90">{s.suggested_solution}</p>
                          </div>
                        )}
                        <button
                          onClick={() => router.push(`/incidents/${s.id}`)}
                          className="text-xs text-violet-400 underline underline-offset-2 hover:text-violet-300 transition"
                        >
                          View full incident →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* AI Investigation */}
        <section className="overflow-hidden rounded-3xl border border-blue-500/20 bg-[#0c1220] shadow-2xl">
          {/* Header */}
          <div className="border-b border-slate-800/80 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl">
                  AI
                  {investigating && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-blue-400 ring-4 ring-[#0c1220]" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold sm:text-xl">AI Investigation</h3>
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                      {similar.length > 0 ? `RAG · ${similar.length} historical match${similar.length > 1 ? "es" : ""}` : "AI Powered"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Root cause analysis and recommended remediation
                    {similar.length > 0 && " — enhanced with your organization's incident history"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleReinvestigate}
                disabled={investigating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {investigating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200/30 border-t-white" />
                    AI is investigating...
                  </>
                ) : (
                  <>
                    <span>↻</span>
                    {incident.root_cause ? "Re-investigate with AI" : "Investigate with AI"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Content */}
          <div className="p-5 sm:p-7">
            <div className="mb-7 flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#080d18] px-4 py-3">
              <div className={`h-2.5 w-2.5 rounded-full ${incident.root_cause ? "bg-emerald-400 shadow-lg shadow-emerald-500/30" : "bg-slate-600"}`} />
              <p className="text-xs text-slate-400">
                {incident.root_cause
                  ? "AI investigation data is available for this incident."
                  : "This incident has not been investigated by AI yet. Click the button above to start."}
              </p>
            </div>

            <div className="mb-6">
              <div className="mb-3">
                <h4 className="text-sm font-bold text-blue-300">Root Cause</h4>
                <p className="mt-1 text-xs text-slate-600">Most likely underlying cause</p>
              </div>
              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.03] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.root_cause || "Investigation has not been completed yet."}
                </p>
              </div>
            </div>

            {incident.investigation_severity && (
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-bold text-blue-300">AI-Assessed Severity</h4>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-[#080d18] p-4">
                  <span className={`inline-flex rounded-full border px-3.5 py-1.5 text-xs font-semibold ${getSeverityStyle(incident.investigation_severity)}`}>
                    {incident.investigation_severity}
                  </span>
                  <span className="text-xs text-slate-500">Severity determined during AI investigation</span>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="mb-3 text-sm font-bold text-blue-300">Explanation</h4>
              <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.explanation || "No AI explanation is available yet."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.025] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-sm text-emerald-400">✓</div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">Suggested Solution</h4>
                    <p className="text-xs text-slate-600">Recommended remediation</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.suggested_solution || "No solution has been generated yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.025] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-sm text-purple-400">+</div>
                  <div>
                    <h4 className="text-sm font-bold text-purple-300">Preventive Action</h4>
                    <p className="text-xs text-slate-600">Reduce chance of recurrence</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.preventive_action || "No preventive action has been generated yet."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-800 bg-[#0c1220] px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800/50 hover:text-white"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => router.push("/incidents/new")}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + Create Another Incident
          </button>
        </div>

      </main>
    </div>
  );
}
