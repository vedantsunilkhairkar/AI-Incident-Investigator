"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getSimilarIncidents,
  getIncidentHistory,
  sendAgentChat,
  executeAgentCommand,
  IncidentHistoryItem,
} from "../../../services/api";

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

  // Agentic & Generative AI fields
  agent_thought_trace?: string | null;
  architecture_diagram?: string | null;
  chat_history?: string | null;
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

interface ThoughtStep {
  step: number;
  phase: string;
  tool: string;
  command: string;
  status: string;
  observation: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  user?: string;
}

interface SandboxResult {
  command: string;
  output: string;
  exit_code: number;
  duration_ms: number;
  risk_level: string;
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

  // Copy state
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Agent Thought Trace
  const [thoughtSteps, setThoughtSteps] = useState<ThoughtStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Sandbox Command Execution State
  const [sandboxHistory, setSandboxHistory] = useState<SandboxResult[]>([]);
  const [executingCmd, setExecutingCmd] = useState(false);
  const [customCmd, setCustomCmd] = useState("");

  // Chat Copilot Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ML similar incidents state
  const [similar, setSimilar] = useState<SimilarIncident[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [expandedSimilar, setExpandedSimilar] = useState<number | null>(null);

  // Incident Audit Trail & History state
  const [history, setHistory] = useState<IncidentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    if (!incidentId) return;
    setHistoryLoading(true);
    try {
      const items = await getIncidentHistory(Number(incidentId));
      setHistory(items);
    } catch (err) {
      console.warn("Could not load incident history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

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

      // Parse Thought Trace
      if (data.agent_thought_trace) {
        try {
          setThoughtSteps(JSON.parse(data.agent_thought_trace));
        } catch {
          setThoughtSteps([]);
        }
      }

      // Parse Chat History
      if (data.chat_history) {
        try {
          setChatMessages(JSON.parse(data.chat_history));
        } catch {
          setChatMessages([]);
        }
      }

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
          agent_thought_trace: invData.agent_thought_trace,
          architecture_diagram: invData.architecture_diagram,
          status: "Resolved",
        } : null);

        if (invData.agent_thought_trace) {
          try {
            setThoughtSteps(JSON.parse(invData.agent_thought_trace));
          } catch {
            setThoughtSteps([]);
          }
        }

        setSuccessMessage("DevOps & SRE Autonomous Agent investigation completed.");
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
      if (data?.similar) {
        setSimilar(data.similar);
      }
    } catch (err) {
      console.warn("Could not load similar incidents:", err);
    } finally {
      setSimilarLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchIncident();
      fetchSimilar();
      fetchHistory();
    }
  }, [incidentId]);

  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleReinvestigate = async () => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    setInvestigating(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`${API_URL}/incidents/${incidentId}/investigate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "AI investigation failed.");
      }

      setIncident((prev) => prev ? {
        ...prev,
        root_cause: data.root_cause,
        investigation_severity: data.severity,
        explanation: data.explanation,
        suggested_solution: data.suggested_solution,
        preventive_action: data.preventive_action,
        ai_remediation_commands: data.remediation_commands,
        ai_runbook: data.runbook,
        devops_tool: prev.devops_tool || data.devops_tool,
        agent_thought_trace: data.agent_thought_trace,
        architecture_diagram: data.architecture_diagram,
        status: "Resolved",
      } : null);

      if (data.agent_thought_trace) {
        try {
          setThoughtSteps(JSON.parse(data.agent_thought_trace));
        } catch {
          setThoughtSteps([]);
        }
      }

      setSuccessMessage("DevOps & SRE Autonomous Agent re-investigation finished.");
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
*Report generated by AI Incident Investigator Autonomous Copilot*
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

  // Safe Sandbox Execution
  const handleExecuteSandboxCommand = async (cmdToRun: string) => {
    if (!cmdToRun.trim() || executingCmd) return;
    setExecutingCmd(true);
    try {
      const res = await executeAgentCommand(Number(incidentId), cmdToRun.trim());
      setSandboxHistory((prev) => [...prev, res]);
      setCustomCmd("");
    } catch (err: any) {
      setSandboxHistory((prev) => [
        ...prev,
        {
          command: cmdToRun,
          output: `Error executing command: ${err.message}`,
          exit_code: 1,
          duration_ms: 50,
          risk_level: "ERROR",
        },
      ]);
    } finally {
      setExecutingCmd(false);
    }
  };

  // Execute all commands from remediation block
  const handleExecuteAllRemediations = async () => {
    if (!incident?.ai_remediation_commands) return;
    const lines = incident.ai_remediation_commands
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    for (const cmd of lines) {
      await handleExecuteSandboxCommand(cmd);
    }
  };

  // Send message to SRE Copilot
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatSending(true);

    try {
      const res = await sendAgentChat(Number(incidentId), userMsg);
      setChatMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Failed to reach SRE Copilot: ${err.message}`,
        },
      ]);
    } finally {
      setChatSending(false);
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold tracking-wide text-cyan-200">Initializing SRE Copilot</h2>
          <p className="mt-2 text-sm text-slate-500">Connecting to telemetry stream and vector memory...</p>
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
            className="mt-7 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold transition hover:bg-cyan-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  return (
    <div className="min-h-screen bg-[#060a12] text-white selection:bg-cyan-500/30">
      {/* Background cyber ambient gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-10 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-10 left-1/3 h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      {/* Top Navigation & Status Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060a12]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition"
              >
                <span>←</span> Dashboard
              </button>

              <span className="text-slate-600">/</span>

              <button
                onClick={() => router.push("/history")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition"
              >
                <span>🕒</span> History
              </button>

              <span className="text-slate-600">|</span>

              {/* Live Autonomous Agent Status Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-medium text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>SRE Autonomous Agent: Active</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-white">
                Incident #{incident.id}
              </h1>

              {incident.devops_tool && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 shadow-sm shadow-cyan-950">
                  <span>{DEVOPS_ICONS[incident.devops_tool] || "⚙️"}</span>
                  <span>{incident.devops_tool}</span>
                </span>
              )}

              {incident.environment && (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEnvStyle(incident.environment)}`}>
                  ● {incident.environment}
                </span>
              )}

              {incident.incident_category && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                  🏷️ {incident.incident_category}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Open SRE Chat Drawer */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-3.5 py-2 text-xs font-bold text-violet-300 transition shadow-sm"
              title="Open real-time interactive SRE Copilot assistant"
            >
              <span>💬</span>
              <span>Ask SRE Copilot</span>
            </button>

            {/* Copy Post-Mortem */}
            {incident.root_cause && (
              <button
                onClick={handleCopyPostMortem}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition shadow-sm"
                title="Export complete SRE Post-Mortem in Markdown"
              >
                <span>{copiedReport ? "✓" : "📋"}</span>
                <span>{copiedReport ? "Copied Post-Mortem!" : "Copy Post-Mortem"}</span>
              </button>
            )}

            {/* Re-Run Autonomous Agent */}
            <button
              onClick={handleReinvestigate}
              disabled={investigating}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-900/40 transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
            >
              {investigating ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Agent Triaging...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  {incident.root_cause ? "Re-Run Autonomous Agent" : "Run Autonomous Agent"}
                </>
              )}
            </button>

            <a
              href="https://github.com/vedantsunilkhairkar/AI-Incident-Investigator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              title="View on GitHub"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>

            <button
              onClick={() => router.push("/incidents/new")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold hover:bg-slate-700 transition"
            >
              <span>+</span> New
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">
        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400 font-bold">✓</div>
            <div>
              <p className="font-semibold text-emerald-300 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* ═══ 1. INCIDENT TELEMETRY SUMMARY CARD ═══ */}
        <section className="overflow-hidden rounded-3xl border border-slate-800/90 bg-[#0a101d] shadow-2xl">
          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Target Service / Component
                </span>
                <h2 className="text-2xl font-bold sm:text-3xl text-white mt-1">
                  {incident.application}
                </h2>
                {incident.service_or_cluster && (
                  <p className="mt-1 font-mono text-xs text-cyan-300">
                    Cluster / Target: <span className="text-slate-300">{incident.service_or_cluster}</span>
                  </p>
                )}

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-md shadow-amber-500/50" />
                  <p className="break-words font-mono text-xs leading-6 text-amber-300">
                    {incident.error}
                  </p>
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

          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-800/80 bg-[#080d18]">
            <div className="border-r border-b sm:border-b-0 border-slate-800/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">DevOps Tool</p>
              <p className="mt-1 font-semibold text-slate-200 text-sm">{incident.devops_tool || "General"}</p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-r border-slate-800/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Environment</p>
              <p className="mt-1 font-semibold text-slate-200 text-sm">{incident.environment || "Production"}</p>
            </div>
            <div className="border-r border-slate-800/80 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Impact Classification</p>
              <p className="mt-1 font-semibold text-cyan-300 text-sm">{incident.investigation_severity || incident.severity}</p>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resolution State</p>
              <p className="mt-1 font-semibold text-emerald-400 text-sm">{incident.status}</p>
            </div>
          </div>
        </section>

        {/* ═══ 2. AGENTIC MULTI-STEP REASONING TIMELINE (OODA LOOP) ═══ */}
        {thoughtSteps.length > 0 && (
          <section className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#091122] shadow-2xl">
            <div className="border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                    🧠
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-200 uppercase tracking-wide">
                      Autonomous SRE Agent Execution Trace (ReAct Engine)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Multi-phase OODA loop: Telemetry Mining → Diagnostic Tooling → Metrics Probe → Blast Radius Audit
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-mono text-cyan-300">
                  {thoughtSteps.length} Steps Executed
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-3">
              {thoughtSteps.map((step) => {
                const isExpanded = expandedStep === step.step;
                return (
                  <div
                    key={step.step}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-[#060c18] transition hover:border-cyan-500/30"
                  >
                    <div
                      onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                      className="flex cursor-pointer items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300">
                          {step.step}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{step.phase}</span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                              {step.tool}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs font-mono text-cyan-400/80 truncate max-w-md sm:max-w-xl">
                            $ {step.command}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          ✓ {step.status}
                        </span>
                        <span className="text-xs text-slate-500">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800/80 bg-slate-950/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Observation Telemetry</p>
                        <p className="font-mono text-xs leading-6 text-slate-300 bg-[#040810] p-3 rounded-xl border border-slate-800">
                          {step.observation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ 3. VISUAL FAILURE ARCHITECTURE TOPOLOGY (GENERATIVE AI) ═══ */}
        <section className="overflow-hidden rounded-3xl border border-indigo-500/25 bg-[#091020] shadow-2xl">
          <div className="border-b border-slate-800 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent px-6 py-4">
            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-2">
              <span>🗺️</span> Failure Topology & Blast Radius Map
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live visual system flow showing user ingress, dependent services, and the failing component
            </p>
          </div>

          <div className="p-6">
            {/* Visual Node Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Ingress Node */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
                <span className="text-2xl">🌐</span>
                <p className="mt-2 text-xs font-bold text-emerald-300">Client / Gateway</p>
                <span className="mt-1 inline-block text-[10px] text-emerald-400 font-mono">200 OK Ingress</span>
              </div>

              {/* Proxy / Ingress */}
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-center">
                <span className="text-2xl">🚪</span>
                <p className="mt-2 text-xs font-bold text-blue-300">
                  {incident.devops_tool === "NGINX" ? "NGINX Reverse Proxy" : "ALB / K8s Ingress"}
                </p>
                <span className="mt-1 inline-block text-[10px] text-blue-400 font-mono">Routing Traffic</span>
              </div>

              {/* Failing Node (Pulsating Hazard) */}
              <div className="relative rounded-2xl border-2 border-red-500/60 bg-red-500/10 p-4 text-center shadow-lg shadow-red-950 animate-pulse">
                <span className="absolute -top-2.5 -right-2.5 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                  Failing
                </span>
                <span className="text-2xl">💥</span>
                <p className="mt-2 text-xs font-bold text-red-200">{incident.application}</p>
                <span className="mt-1 inline-block text-[10px] text-red-400 font-mono">
                  {incident.root_cause ? incident.root_cause.slice(0, 32) + "..." : "Error Triggered"}
                </span>
              </div>

              {/* Data Store */}
              <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 text-center">
                <span className="text-2xl">🗄️</span>
                <p className="mt-2 text-xs font-bold text-slate-300">Data Store / State</p>
                <span className="mt-1 inline-block text-[10px] text-slate-400 font-mono">PostgreSQL / S3</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 4. INTERACTIVE SRE TERMINAL & SAFE SANDBOX RUNNER ═══ */}
        {incident.ai_remediation_commands && (
          <section className="overflow-hidden rounded-3xl border border-cyan-500/40 bg-[#050914] shadow-2xl">
            {/* Terminal Top Window Bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#09101f] px-5 py-3.5 gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/90 inline-block shadow-sm shadow-red-500/50" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/90 inline-block shadow-sm shadow-yellow-500/50" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/90 inline-block shadow-sm shadow-emerald-500/50" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <span>sre-copilot@k8s-prod:~$</span>
                  <span className="text-cyan-400">remediation-sandbox.sh</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCommands}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                >
                  <span>{copiedCmd ? "✓" : "📋"}</span>
                  <span>{copiedCmd ? "Copied" : "Copy All"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExecuteAllRemediations}
                  disabled={executingCmd}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-xs font-bold text-white transition shadow-md shadow-cyan-950 disabled:opacity-50"
                >
                  <span>⚡</span>
                  <span>{executingCmd ? "Running in Sandbox..." : "Run in Sandbox"}</span>
                </button>
              </div>
            </div>

            {/* Terminal Commands Display */}
            <div className="p-5 border-b border-slate-800/80 bg-[#040711]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                # SRE Remediation Commands (Click any command to run in sandbox):
              </p>
              <div className="space-y-1">
                {incident.ai_remediation_commands.split("\n").map((line, idx) => {
                  const isComment = line.trim().startsWith("#");
                  return (
                    <div
                      key={idx}
                      className={`flex items-start justify-between group py-0.5 px-2 rounded hover:bg-slate-800/40 font-mono text-xs leading-6 ${
                        isComment ? "text-slate-500" : "text-cyan-300 cursor-pointer"
                      }`}
                      onClick={() => !isComment && handleExecuteSandboxCommand(line)}
                    >
                      <span className="break-all">{line}</span>
                      {!isComment && (
                        <button
                          className="opacity-0 group-hover:opacity-100 text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 transition shrink-0 ml-2"
                        >
                          Execute ⚡
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sandbox Execution Output Console */}
            {sandboxHistory.length > 0 && (
              <div className="p-5 bg-[#02050b] border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>🟢</span> Live Sandbox Output ({sandboxHistory.length} runs)
                  </span>
                  <button
                    onClick={() => setSandboxHistory([])}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                  >
                    Clear Terminal
                  </button>
                </div>

                <div className="space-y-3">
                  {sandboxHistory.map((item, i) => (
                    <div key={i} className="rounded-xl border border-slate-800/90 bg-[#060a14] p-3.5 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2 text-[11px]">
                        <span className="text-cyan-400 font-bold">$ {item.command}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.exit_code === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            Exit {item.exit_code}
                          </span>
                          <span className="text-slate-500 text-[10px]">{item.duration_ms}ms</span>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap text-slate-300 text-[11px] leading-5">
                        {item.output}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Command Input Bar */}
            <div className="p-3 bg-[#080d1a] border-t border-slate-800 flex items-center gap-2">
              <span className="text-cyan-400 font-mono text-xs pl-2">$</span>
              <input
                type="text"
                value={customCmd}
                onChange={(e) => setCustomCmd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExecuteSandboxCommand(customCmd)}
                placeholder="Type custom kubectl, docker, or aws command to run in safe sandbox..."
                className="flex-1 bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => handleExecuteSandboxCommand(customCmd)}
                disabled={!customCmd.trim() || executingCmd}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-40 transition"
              >
                Execute
              </button>
            </div>
          </section>
        )}

        {/* ═══ 5. SRE POST-MORTEM RUNBOOK CARD ═══ */}
        {incident.ai_runbook && (
          <section className="overflow-hidden rounded-3xl border border-purple-500/25 bg-[#0a101f] shadow-2xl">
            <div className="border-b border-slate-800 bg-gradient-to-r from-purple-950/40 to-indigo-950/20 px-6 py-4">
              <h3 className="text-sm font-bold text-purple-200 uppercase tracking-wide flex items-center gap-2">
                <span>🛡️</span> SRE Post-Mortem Runbook & Verification Checklist
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Step-by-step mitigation, health-check verification, and rollback procedure.
              </p>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-slate-800 bg-[#060a14] p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {incident.ai_runbook}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═══ 6. AI ROOT CAUSE & TECHNICAL ANALYSIS CARDS ═══ */}
        <section className="overflow-hidden rounded-3xl border border-blue-500/20 bg-[#0a101f] shadow-2xl">
          <div className="border-b border-slate-800/80 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-xl font-bold">
                🤖
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold sm:text-xl">AI Root Cause & Architecture Analysis</h3>
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                    {similar.length > 0 ? `RAG · ${similar.length} Historical Matches` : "Gemini SRE Copilot"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Comprehensive systems diagnosis generated for this incident
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* Root Cause */}
            <div>
              <div className="mb-2">
                <h4 className="text-sm font-bold text-blue-300">Root Cause Diagnosis</h4>
                <p className="text-xs text-slate-500">Identified underlying failure trigger</p>
              </div>
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100 font-medium">
                  {incident.root_cause || "Investigation has not been completed yet."}
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div>
              <h4 className="mb-2 text-sm font-bold text-blue-300">Technical Explanation</h4>
              <div className="rounded-2xl border border-slate-800 bg-[#060a14] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.explanation || "No AI explanation available yet."}
                </p>
              </div>
            </div>

            {/* Suggested Solution & Preventive Action */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-sm text-emerald-400 font-bold">✓</div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">Suggested Solution</h4>
                    <p className="text-xs text-slate-500">Recommended technical remediation</p>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {incident.suggested_solution || "No solution has been generated yet."}
                </p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.03] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-sm text-purple-400 font-bold">+</div>
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

        {/* ═══ 7. ML SIMILAR PAST INCIDENTS ═══ */}
        <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-[#0a101f] shadow-2xl">
          <div className="border-b border-slate-800/80 bg-gradient-to-r from-violet-500/10 via-transparent to-purple-500/10 p-5 sm:p-7">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-xl">
                🔍
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold sm:text-xl">Similar Past Incidents</h3>
                  <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    ML Embeddings RAG
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Past resolved incidents from your organization that closely match this telemetry
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {similarLoading ? (
              <div className="flex items-center gap-3 py-6 text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-violet-400" />
                <span className="text-sm">Searching vector embeddings...</span>
              </div>
            ) : similar.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#060a14] p-6 text-center">
                <p className="text-sm text-slate-500">
                  No similar past incidents found yet.{" "}
                  <span className="text-slate-400">
                    As incidents are resolved, this section will automatically surface verified fixes.
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {similar.map((s) => (
                  <div
                    key={s.id}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-[#060a14] transition hover:border-violet-500/30"
                  >
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

                    {expandedSimilar === s.id && (
                      <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
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

        {/* ═══ 8. INCIDENT AUDIT TRAIL & ACTION HISTORY ═══ */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0a101f] shadow-2xl">
          <div className="border-b border-slate-800/80 bg-gradient-to-r from-slate-800/30 via-transparent to-blue-500/10 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/60 text-xl font-bold">
                  📜
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold sm:text-xl">Incident Audit Trail & History</h3>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                      {history.length} Event{history.length === 1 ? "" : "s"} Recorded
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Chronological lifecycle of status updates, investigations, and remediation actions
                  </p>
                </div>
              </div>

              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <span>🔄</span>
                <span>Refresh History</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {historyLoading ? (
              <div className="flex items-center gap-3 py-6 text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
                <span className="text-sm">Loading audit history...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#060a14] p-6 text-center">
                <p className="text-sm text-slate-400">
                  Initial incident recorded. Every status change, diagnostic run, or remediation action will be logged in this audit trail.
                </p>
              </div>
            ) : (
              <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
                {history.map((item, idx) => (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-cyan-400 shadow-sm shadow-cyan-400/50" />

                    <div className="rounded-2xl border border-slate-800/90 bg-[#060a14] p-4 transition hover:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                          {item.action}
                        </span>
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
                          <span className="font-semibold text-blue-400">Root Cause Discovered: </span>
                          {item.root_cause}
                        </div>
                      )}

                      {item.suggested_solution && (
                        <div className="mt-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-2.5 text-xs text-emerald-200">
                          <span className="font-semibold text-emerald-400">Remediation: </span>
                          {item.suggested_solution}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-4">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-800 bg-[#0a101f] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => router.push("/incidents/new")}
            className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold transition hover:bg-cyan-500"
          >
            + Create Another Incident
          </button>
        </div>
      </main>

      {/* ═══ 8. INTERACTIVE SLIDE-OVER SRE COPILOT CHAT DRAWER ═══ */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#070c18] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Chat Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0b1326]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300">
                  🤖
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">SRE Copilot Assistant</h3>
                  <p className="text-[11px] text-slate-400">Context: Incident #{incident.id} ({incident.application})</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="p-3 bg-[#050812] border-b border-slate-800/80 flex flex-wrap gap-1.5">
              {[
                "What is the blast radius?",
                "Give me a rollback command",
                "How do I verify the fix?",
                "Will this cause downtime?",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setChatInput(suggestion);
                  }}
                  className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/60 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <span className="text-3xl mb-2">💬</span>
                  <p className="text-sm font-semibold text-slate-400">Ask the SRE Copilot anything</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Get real-time answers about Kubernetes pods, blast radius, rollback steps, or command verification.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-5 ${
                          isUser
                            ? "bg-cyan-600 text-white rounded-br-none"
                            : "bg-[#0d162d] border border-slate-800 text-slate-200 rounded-bl-none font-sans"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {chatSending && (
                <div className="flex justify-start">
                  <div className="bg-[#0d162d] border border-slate-800 rounded-2xl rounded-bl-none p-3 flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
                    <span>SRE Copilot thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-[#0b1326] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask SRE Copilot about this incident..."
                className="flex-1 rounded-xl border border-slate-700 bg-[#060a14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatSending}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating SRE Copilot Trigger Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-2xl shadow-cyan-900/60 hover:scale-105 transition"
        >
          <span className="text-base">💬</span>
          <span>Ask SRE Copilot</span>
        </button>
      )}
    </div>
  );
}
