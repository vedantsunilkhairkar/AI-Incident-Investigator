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

  // DevOps & Infrastructure fields
  devops_tool?: string | null;
  environment?: string | null;
  service_or_cluster?: string | null;
  ai_remediation_commands?: string | null;
  ai_runbook?: string | null;

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
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEVOPS_ICONS: Record<string, string> = {
  Kubernetes: "☸️",
  Docker: "🐳",
  "AWS / Cloud": "☁️",
  Terraform: "🟣",
  "CI/CD": "🚀",
  Prometheus: "📊",
  NGINX: "🌐",
  Database: "🗄️",
};

export default function IncidentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params?.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copiedCmd, setCopiedCmd] = useState(false);

  const [copiedReport, setCopiedReport] = useState(false);

  // ML similar incidents state
  const [similar, setSimilar] = useState<SimilarIncident[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [expandedSimilar, setExpandedSimilar] = useState<number | null>(null);

  const fetchIncident = async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_URL}/incidents/${incidentId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch incident details.");
      }

      setIncident(data);

      // Auto-trigger AI investigation if this incident has not been investigated yet
      if (!data.root_cause) {
        handleAutoInvestigate(token);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load incident.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoInvestigate = async (token: string) => {
    try {
      setInvestigating(true);
      const res = await fetch(`${API_URL}/incidents/${incidentId}/investigate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const invData = await res.json();
        setIncident((prev) => prev ? {
          ...prev,
          root_cause: invData.root_cause,
          investigation_severity: invData.severity,
          explanation: invData.explanation,
          suggested_solution: invData.suggested_solution,
          preventive_action: invData.preventive_action,
          ai_remediation_commands: invData.remediation_commands,
          ai_runbook: invData.runbook,
          devops_tool: prev.devops_tool || invData.devops_tool,
          status: "Resolved",
        } : null);
        setSuccessMessage("DevOps AI investigation completed successfully.");
        fetchSimilar();
      }
    } catch (e) {
      console.error("Auto investigation error:", e);
    } finally {
      setInvestigating(false);
    }
  };

  const fetchSimilar = async () => {
    if (!incidentId) return;
    setSimilarLoading(true);
    try {
      const data = await getSimilarIncidents(Number(incidentId));
      setSimilar(data.similar || []);
    } catch {
      setSimilar([]);
    } finally {
      setSimilarLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchIncident();
      fetchSimilar();
    }
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

      setSuccessMessage("DevOps AI investigation completed successfully.");
      await fetchIncident();
      await fetchSimilar();
    } catch (err: any) {
      setError(err?.message || "AI investigation failed.");
    } finally {
      setInvestigating(false);
    }
  };

  const handleCopyPostMortem = () => {
    if (!incident) return;
    const report = `# 🚨 SRE Incident Post-Mortem Report

## 1. Incident Overview
- **Incident ID:** #${incident.id}
- **Service / Application:** ${incident.application}
- **DevOps Technology:** ${incident.devops_tool || "General"}
- **Environment:** ${incident.environment || "Production"}
- **Target Cluster / Namespace:** ${incident.service_or_cluster || "N/A"}
- **Severity Level:** ${incident.severity}
- **Final Status:** ${incident.status}
- **Category:** ${incident.incident_category || "N/A"}

## 2. Telemetry & Error Log
\`\`\`
${incident.error}
\`\`\`

## 3. Incident Symptoms
${incident.description}

## 4. Root Cause Analysis
${incident.root_cause || "Pending investigation"}

## 5. Technical Systems Explanation
${incident.explanation || "N/A"}

## 6. Remediation CLI Commands Executed
\`\`\`bash
${incident.ai_remediation_commands || "# No commands recorded"}
\`\`\`

## 7. SRE Verification & Rollback Runbook
${incident.ai_runbook || "N/A"}

## 8. Preventative Actions & Guardrails
${incident.preventive_action || "N/A"}

---
*Report generated by AI Incident Investigator Copilot*
`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleCopyCommands = () => {
    if (incident?.ai_remediation_commands) {
      navigator.clipboard.writeText(incident.ai_remediation_commands);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
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

  const getEnvStyle = (env: string) => {
    switch (env) {
      case "Production": return "bg-red-500/15 text-red-300 border-red-500/40";
      case "Staging": return "bg-amber-500/15 text-amber-300 border-amber-500/40";
      case "Development": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
      default: return "bg-slate-500/15 text-slate-300 border-slate-500/40";
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
          <p className="mt-2 text-sm text-slate-500">Retrieving telemetry & ML data...</p>
        </div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-[#0c1220] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-xl font-bold text-red-400">
            !
          </div>
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
    );
  }

  if (!incident) return null;

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      {/* Background accents */}
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
                Incident #{incident.id}
              </h1>

              {/* DevOps Tool Badge */}
              {incident.devops_tool && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <span>{DEVOPS_ICONS[incident.devops_tool] || "⚙️"}</span>
                  <span>{incident.devops_tool}</span>
                </span>
              )}

              {/* Environment Badge */}
              {incident.environment && (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEnvStyle(incident.environment)}`}>
                  ● {incident.environment}
                </span>
              )}

              {/* ML: Category badge */}
              {incident.incident_category && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                  🏷 {incident.incident_category}
                </span>
              )}
            </div>

            {incident.service_or_cluster && (
              <p className="mt-2 text-xs font-mono text-slate-400">
                Target: <span className="text-indigo-300">{incident.service_or_cluster}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {incident.root_cause && (
              <button
                onClick={handleCopyPostMortem}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white"
                title="Copy complete SRE Post-Mortem report formatted in Markdown"
              >
                <span>{copiedReport ? "✓" : "📋"}</span>
                <span>{copiedReport ? "Copied Post-Mortem!" : "Copy Post-Mortem"}</span>
              </button>
            )}

            <button
              onClick={handleReinvestigate}
              disabled={investigating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-900/30 transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
            >
              {investigating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  AI Investigating...
                </>
              ) : (
                <>
                  <span>🤖</span>
                  {incident.root_cause ? "Re-Run SRE Copilot" : "Investigate with AI"}
                </>
              )}
            </button>

            <button
              onClick={() => router.push("/incidents/new")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-700"
            >
              <span>+</span> New Incident
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Alerts */}
        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm text-emerald-400">✓</div>
            <div>
              <p className="font-medium text-emerald-300">Investigation Completed</p>
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
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Service / Application</span>
                </div>
                <h2 className="break-words text-2xl font-bold sm:text-3xl text-white">{incident.application}</h2>
                <div className="mt-4 flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-lg shadow-amber-500/30" />
                  <p className="break-words font-mono text-sm leading-6 text-amber-300/90">{incident.error}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold ${getSeverityStyle(incident.severity)}`}>
                  Severity: {incident.severity}
                </span>
                <span className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold ${getStatusStyle(incident.status)}`}>
                  Status: {incident.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-800/80">
            <div className="border-r border-b sm:border-b-0 border-slate-800/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">DevOps Tool</p>
              <p className="mt-1 font-semibold text-slate-200 text-sm">{incident.devops_tool || "General"}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-800/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Environment</p>
              <p className="mt-1 font-semibold text-slate-200 text-sm">{incident.environment || "Production"}</p>
            </div>
            <div className="border-r border-slate-800/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Severity</p>
              <p className="mt-1 font-semibold text-slate-200 text-sm">{incident.severity}</p>
            </div>
            <div className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</p>
              <p className="mt-1 font-semibold text-slate-200 text-sm">{incident.status}</p>
            </div>
          </div>
        </section>

        {/* Context / Telemetry description */}
        <section className="mb-6 rounded-3xl border border-slate-800/80 bg-[#0c1220] p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span>📋</span> Observed Telemetry & Incident Description
            </h3>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-5">
            <p className="whitespace-pre-wrap font-mono text-xs leading-7 text-slate-300">
              {incident.description || "No description was provided for this incident."}
            </p>
          </div>
        </section>

        {/* ═══ SRE CLI REMEDIATION COMMANDS TERMINAL (NEW) ═══ */}
        {incident.ai_remediation_commands && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#080d18] shadow-2xl">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0d1526] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  terminal — remediation-commands.sh ({incident.devops_tool || "DevOps"})
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyCommands}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-300 transition"
              >
                <span>{copiedCmd ? "✓" : "📋"}</span>
                <span>{copiedCmd ? "Copied to Clipboard!" : "Copy CLI Commands"}</span>
              </button>
            </div>

            {/* Terminal Body */}
            <div className="p-5 overflow-x-auto">
              <pre className="font-mono text-xs leading-6 text-cyan-300 whitespace-pre-wrap">
                {incident.ai_remediation_commands}
              </pre>
            </div>
          </section>
        )}

        {/* ═══ SRE POST-MORTEM RUNBOOK & ROLLBACK STRATEGY (NEW) ═══ */}
        {incident.ai_runbook && (
          <section className="mb-6 overflow-hidden rounded-3xl border border-purple-500/25 bg-[#0c1220] shadow-2xl">
            <div className="border-b border-slate-800 bg-gradient-to-r from-purple-950/30 to-indigo-950/20 px-6 py-4">
              <h3 className="text-base font-bold text-purple-200 flex items-center gap-2">
                <span>🛡️</span> SRE Post-Mortem Runbook & Verification Checklist
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Step-by-step mitigation, health-check verification, and rollback procedure.
              </p>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {incident.ai_runbook}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═══ AI Investigation Core Cards ═══ */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-blue-500/20 bg-[#0c1220] shadow-2xl">
          {/* Header */}
          <div className="border-b border-slate-800/80 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xl font-bold">
                🤖
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold sm:text-xl">AI Root Cause & Architecture Analysis</h3>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                    {similar.length > 0 ? `RAG · ${similar.length} Historical Matches` : "Gemini Copilot"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Comprehensive systems diagnosis generated for this incident
                </p>
              </div>
            </div>
          </div>

          {/* AI Content */}
          <div className="p-5 sm:p-7 space-y-6">
            {/* Root Cause */}
            <div>
              <div className="mb-3">
                <h4 className="text-sm font-bold text-blue-300">Root Cause Diagnosis</h4>
                <p className="mt-0.5 text-xs text-slate-500">Identified underlying failure trigger</p>
              </div>
              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.03] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200 font-medium">
                  {incident.root_cause || "Investigation has not been completed yet. Click 'Investigate with AI' above."}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-blue-300">Technical Explanation</h4>
              <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.explanation || "No AI explanation available yet."}
                </p>
              </div>
            </div>

            {/* Suggested Solution & Preventive Action */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.025] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-sm text-emerald-400">✓</div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">Suggested Solution</h4>
                    <p className="text-xs text-slate-500">Recommended technical remediation</p>
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
                    <p className="text-xs text-slate-500">Long-term architectural guardrails</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.preventive_action || "No preventive action has been generated yet."}
                </p>
              </div>
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
                    ML Embeddings
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
                    As more incidents are resolved, this section will automatically surface verified fixes and CLI commands.
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
                        <span className="text-xs text-slate-500">
                          {expandedSimilar === s.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Expandable fix content */}
                    {expandedSimilar === s.id && (
                      <div className="border-t border-slate-800/80 bg-slate-900/30 p-4 space-y-3">
                        {s.root_cause && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Past Root Cause</p>
                            <p className="text-sm text-slate-300">{s.root_cause}</p>
                          </div>
                        )}
                        {s.suggested_solution && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">Verified Fix</p>
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
