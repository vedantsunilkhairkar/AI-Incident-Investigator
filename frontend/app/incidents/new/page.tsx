"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createIncident } from "../../../services/api";

const DEVOPS_TOOLS = [
  { id: "Kubernetes", label: "Kubernetes", icon: "☸️", color: "from-blue-600 to-cyan-600" },
  { id: "Docker", label: "Docker", icon: "🐳", color: "from-cyan-600 to-sky-600" },
  { id: "AWS / Cloud", label: "AWS / Cloud", icon: "☁️", color: "from-amber-600 to-orange-600" },
  { id: "Terraform", label: "Terraform / IaC", icon: "🟣", color: "from-purple-600 to-indigo-600" },
  { id: "CI/CD", label: "CI/CD Pipelines", icon: "🚀", color: "from-rose-600 to-pink-600" },
  { id: "Prometheus", label: "Prometheus / Metrics", icon: "📊", color: "from-orange-600 to-red-600" },
  { id: "NGINX", label: "NGINX / Ingress", icon: "🌐", color: "from-emerald-600 to-teal-600" },
  { id: "Database", label: "Database / Redis / Kafka", icon: "🗄️", color: "from-indigo-600 to-blue-600" },
];

const PRESETS = [
  {
    title: "☸️ K8s CrashLoopBackOff (OOMKilled)",
    tag: "Kubernetes",
    app: "payment-service",
    devopsTool: "Kubernetes",
    env: "Production",
    service: "k8s-prod-us-east-1 / namespace: payments / pod: payment-auth-6dfb4c-9zxk2",
    severity: "Critical",
    error: "Back-off restarting failed container. ExitCode: 137 (OOMKilled). Container memory limit (512Mi) exceeded.",
    desc: "Pod payment-auth-6dfb4c-9zxk2 has entered CrashLoopBackOff after restarting 8 times in 10 minutes. Node kernel invoked oom-killer because the container exceeded its 512Mi memory limit during traffic surge. Ingress returning 503 Service Unavailable to users.",
  },
  {
    title: "🟣 Terraform DynamoDB State Lock",
    tag: "Terraform",
    app: "infra-provisioning",
    devopsTool: "Terraform",
    env: "Production",
    service: "AWS us-east-1 / s3-backend: terraform-state-prod / dynamo: tf-locks",
    severity: "High",
    error: "Error: Error acquiring the state lock: ConditionalCheckFailedException: The conditional request failed (LockID: terraform-state-prod/rds/terraform.tfstate-md5)",
    desc: "Terraform apply was interrupted during an earlier CI/CD runner cancellation. The DynamoDB lock was not released. All subsequent deployment pipelines are failing with lock acquisition timeouts.",
  },
  {
    title: "🌐 NGINX 502 Bad Gateway / Upstream Timeout",
    tag: "NGINX",
    app: "api-gateway",
    devopsTool: "NGINX",
    env: "Production",
    service: "nginx-ingress-controller / upstream: core-api-pool:8080",
    severity: "High",
    error: "502 Bad Gateway: [error] 1421#1421: *89419 upstream timed out (110: Connection timed out) while connecting to upstream, client: 198.51.100.22, server: api.company.internal",
    desc: "NGINX reverse proxy is unable to establish TCP handshake with backend core-api upstream instances on port 8080. Backlog queue is full and worker processes are exhausting file descriptors.",
  },
  {
    title: "🚀 GitHub Actions Build Cache Failure",
    tag: "CI/CD",
    app: "frontend-deployer",
    devopsTool: "CI/CD",
    env: "Staging",
    service: "GitHub Actions / workflow: deploy-staging.yml / runner: ubuntu-latest",
    severity: "Medium",
    error: "Error: Process completed with exit code 137. docker buildx build failed: buildkit error: out of memory allocating 1073741824 bytes",
    desc: "GitHub Actions runner ran out of memory during docker buildx step while caching Next.js standalone output. Docker daemon crashed and the deployment failed to reach AWS ECR.",
  },
];

export default function NewIncidentPage() {
  const router = useRouter();

  const [application, setApplication] = useState("");
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [devopsTool, setDevopsTool] = useState("Kubernetes");
  const [environment, setEnvironment] = useState("Production");
  const [serviceOrCluster, setServiceOrCluster] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthError, setIsAuthError] = useState(false);

  // Check login status on page mount
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!token || token === "null" || token === "undefined") {
      setErrorMessage("You are not logged in. Please log in first to create incidents.");
      setIsAuthError(true);
    }
  }, []);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setApplication(preset.app);
    setError(preset.error);
    setSeverity(preset.severity);
    setDescription(preset.desc);
    setDevopsTool(preset.devopsTool);
    setEnvironment(preset.env);
    setServiceOrCluster(preset.service);
    if (!isAuthError) setErrorMessage("");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsAuthError(false);

    if (!application.trim() || !error.trim() || !description.trim()) {
      setErrorMessage("Please fill in all required fields (Application, Error, Description).");
      return;
    }

    setLoading(true);

    try {
      const incident = await createIncident({
        application: application.trim(),
        error: error.trim(),
        severity,
        description: description.trim(),
        devops_tool: devopsTool,
        environment,
        service_or_cluster: serviceOrCluster.trim() || undefined,
      });

      router.push(`/incidents/${incident.id}`);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Unable to create incident. Please try again.";
      if (
        msg.toLowerCase().includes("token") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("log in") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        setIsAuthError(true);
        setErrorMessage("Your login session has expired. Please log in again to save this incident.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-200">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-[#080b14]/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ←
            </Link>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                DevOps & SRE Incident Platform
              </p>
              <h1 className="text-xl font-bold text-white">
                Create & Investigate DevOps Incident
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/vedantsunilkhairkar/AI-Incident-Investigator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition"
              title="View on GitHub"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">
                DevOps Copilot Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {/* ONE-CLICK DEVOPS PRESETS BANNER */}
        <section className="mb-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                ⚡ 1-Click DevOps Incident Simulators
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any real-world DevOps scenario below to auto-populate logs, environment, and telemetry:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="group flex flex-col items-start p-3 rounded-xl border border-slate-800 bg-[#0c1222] hover:border-indigo-500/50 hover:bg-indigo-950/20 text-left transition"
              >
                <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                  {preset.title}
                </span>
                <span className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                  {preset.error}
                </span>
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* FORM */}
            <section className="lg:col-span-2 space-y-6">
              {/* DEVOPS INFRASTRUCTURE CONTEXT */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-6 shadow-2xl">
                <div className="border-b border-slate-800 pb-4 mb-5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🛠️</span> DevOps Technology & Target Environment
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Select the DevOps tool and deployment environment so the AI can generate verified remediation commands.
                  </p>
                </div>

                {/* TOOL SELECTOR PILLS */}
                <div className="mb-6">
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary DevOps Tool / Technology
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEVOPS_TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setDevopsTool(tool.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
                          devopsTool === tool.id
                            ? "border-indigo-500 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/10"
                            : "border-slate-800 bg-[#080b14] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <span>{tool.icon}</span>
                        <span>{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ENVIRONMENT & CLUSTER */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Environment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Production", "Staging", "Development"].map((env) => (
                        <button
                          key={env}
                          type="button"
                          onClick={() => setEnvironment(env)}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition ${
                            environment === env
                              ? env === "Production"
                                ? "border-red-500/60 bg-red-500/20 text-red-300"
                                : env === "Staging"
                                ? "border-amber-500/60 bg-amber-500/20 text-amber-300"
                                : "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                              : "border-slate-800 bg-[#080b14] text-slate-500 hover:border-slate-700"
                          }`}
                        >
                          {env}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Cluster / Namespace / Target
                    </label>
                    <input
                      type="text"
                      value={serviceOrCluster}
                      onChange={(e) => setServiceOrCluster(e.target.value)}
                      placeholder="e.g. k8s-prod-cluster-01 / payments-ns"
                      className="w-full rounded-xl border border-slate-700 bg-[#080b14] px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* INCIDENT DETAILS */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-6 shadow-2xl">
                <div className="border-b border-slate-800 pb-4 mb-5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📋</span> Incident Telemetry & Logs
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Paste stack traces, pod events, or CI/CD logs.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* APPLICATION */}
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Service / Application Name *
                      </label>
                      <input
                        type="text"
                        value={application}
                        onChange={(e) => setApplication(e.target.value)}
                        placeholder="e.g. payment-service or ingress-nginx"
                        className="w-full rounded-xl border border-slate-700 bg-[#080b14] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>

                    {/* SEVERITY */}
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Severity Level
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["Low", "Medium", "High", "Critical"].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSeverity(lvl)}
                            className={`py-2 rounded-xl border text-xs font-bold text-center transition ${
                              severity === lvl
                                ? lvl === "Critical"
                                  ? "border-red-500 bg-red-500/20 text-red-400"
                                  : lvl === "High"
                                  ? "border-orange-500 bg-orange-500/20 text-orange-400"
                                  : lvl === "Medium"
                                  ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                                  : "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                : "border-slate-800 bg-[#080b14] text-slate-500 hover:border-slate-700"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ERROR LOG */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Error Message / Telemetry *
                    </label>
                    <input
                      type="text"
                      value={error}
                      onChange={(e) => setError(e.target.value)}
                      placeholder="e.g. ExitCode: 137 (OOMKilled) or 502 Bad Gateway"
                      className="w-full rounded-xl border border-slate-700 bg-[#080b14] px-4 py-2.5 font-mono text-sm text-amber-300 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Description / Observed Symptoms / Stack Trace *
                      </label>
                      <span className="text-[11px] text-slate-600 font-mono">
                        {description.length}/2000
                      </span>
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                      rows={6}
                      placeholder="Paste pod describe logs, docker events, terraform plan output, or error stack traces..."
                      className="w-full rounded-xl border border-slate-700 bg-[#080b14] px-4 py-3 font-mono text-xs leading-6 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                  <span>{errorMessage}</span>
                  {isAuthError && (
                    <Link
                      href="/login"
                      className="ml-3 shrink-0 rounded-lg bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/30 transition"
                    >
                      Log In Now →
                    </Link>
                  )}
                </div>
              )}

              {/* BUTTONS */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition"
                >
                  {loading ? "Creating & Embedding Incident..." : "Create Incident & Investigate 🚀"}
                </button>
              </div>
            </section>

            {/* SRE COPILOT ASIDE */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/30 to-slate-900/60 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/30 text-lg">
                  🤖
                </div>

                <h3 className="mt-4 text-base font-bold text-white">
                  DevOps AI Copilot Capabilities
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  When you submit this incident, our AI engine will:
                </p>

                <div className="mt-5 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <span className="text-emerald-400 text-sm">✓</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Root Cause Diagnostics</p>
                      <p className="text-[11px] text-slate-500">Deep technical analysis of logs and telemetry</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 text-sm">✓</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Copy-Pasteable CLI Commands</p>
                      <p className="text-[11px] text-slate-500">Tailored <code className="text-indigo-300">kubectl</code>, <code className="text-indigo-300">docker</code>, or <code className="text-indigo-300">terraform</code> fixes</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-purple-400 text-sm">✓</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">SRE Runbook & Rollback</p>
                      <p className="text-[11px] text-slate-500">Emergency mitigation and verification procedures</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-amber-400 text-sm">✓</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">RAG Historical Matching</p>
                      <p className="text-[11px] text-slate-500">Retrieves similar past resolved incidents using embeddings</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* COVERED TECHNOLOGIES */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Supported DevOps Stack
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {["Kubernetes", "Docker", "AWS ECS/EKS", "Terraform", "GitHub Actions", "Prometheus", "Grafana", "NGINX", "PostgreSQL", "Redis", "Helm", "Istio"].map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-1 rounded-lg border border-slate-800 bg-[#080b14] text-[11px] text-slate-400 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}