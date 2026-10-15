"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createIncident } from "../../../services/api";

export default function NewIncidentPage() {
  const router = useRouter();

  const [application, setApplication] = useState("");
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!application.trim() || !error.trim() || !description.trim()) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const incident = await createIncident({
        application,
        error,
        severity,
        description,
      });

      router.push(`/incidents/${incident.id}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Unable to create the incident. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-200">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-[#080b14]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-lg text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              &lt;
            </Link>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                Incident Management
              </p>

              <h1 className="mt-1 text-xl font-bold text-white">
                Create New Incident
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40" />
            <span className="text-xs font-medium text-emerald-400">
              AI Engine Operational
            </span>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Report an incident
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Provide details about the application failure. The AI
            investigator will analyze the incident and identify possible
            causes and solutions.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* FORM */}
            <section className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-6 shadow-2xl shadow-black/10">
                <div className="border-b border-slate-800 pb-5">
                  <h3 className="text-lg font-bold text-white">
                    Incident Information
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Enter the information collected from the affected service.
                  </p>
                </div>

                <div className="mt-6 space-y-6">
                  {/* APPLICATION */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Application / Service
                    </label>

                    <input
                      type="text"
                      value={application}
                      onChange={(e) => setApplication(e.target.value)}
                      placeholder="Example: Payment Service"
                      className="w-full rounded-xl border border-slate-700 bg-[#080b14] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* ERROR */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Error
                    </label>

                    <input
                      type="text"
                      value={error}
                      onChange={(e) => setError(e.target.value)}
                      placeholder="Example: Connection timeout"
                      className="w-full rounded-xl border border-slate-700 bg-[#080b14] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* SEVERITY */}
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-slate-300">
                      Severity
                    </label>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        {
                          name: "Low",
                          description: "Minor impact",
                          active:
                            "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                        },
                        {
                          name: "Medium",
                          description: "Moderate impact",
                          active:
                            "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
                        },
                        {
                          name: "High",
                          description: "Major impact",
                          active:
                            "border-orange-500/40 bg-orange-500/10 text-orange-400",
                        },
                        {
                          name: "Critical",
                          description: "Severe impact",
                          active:
                            "border-red-500/40 bg-red-500/10 text-red-400",
                        },
                      ].map((level) => (
                        <button
                          key={level.name}
                          type="button"
                          onClick={() => setSeverity(level.name)}
                          className={`rounded-xl border p-4 text-left transition ${
                            severity === level.name
                              ? level.active
                              : "border-slate-800 bg-[#080b14] text-slate-500 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-sm font-semibold">
                            {level.name}
                          </div>

                          <div className="mt-1 text-[11px] text-slate-600">
                            {level.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-300">
                        Description
                      </label>

                      <span className="text-[11px] text-slate-600">
                        {description.length}/1000
                      </span>
                    </div>

                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, 1000))
                      }
                      rows={9}
                      placeholder="Describe what happened, when it happened, affected users, error messages, and any other useful information..."
                      className="w-full resize-none rounded-xl border border-slate-700 bg-[#080b14] px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* ERROR */}
              {errorMessage && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                  {errorMessage}
                </div>
              )}

              {/* BUTTONS */}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/"
                  className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating Incident..." : "Create Incident"}
                </button>
              </div>
            </section>

            {/* AI SIDEBAR */}
            <aside className="space-y-6">
              {/* AI CARD */}
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                  AI
                </div>

                <h3 className="mt-5 text-lg font-bold text-white">
                  AI Investigation
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Once the incident is created, the AI engine will analyze
                  the available information to assist with troubleshooting.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-slate-400">
                      Root cause analysis
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-slate-400">
                      Technical explanation
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-slate-400">
                      Recommended solution
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-slate-400">
                      Preventive actions
                    </span>
                  </div>
                </div>
              </div>

              {/* WORKFLOW */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-6">
                <h3 className="font-bold text-white">
                  Investigation Workflow
                </h3>

                <div className="mt-6 space-y-5">
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400">
                      1
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-300">
                        Create incident
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Store incident information
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-bold text-violet-400">
                      2
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-300">
                        AI investigation
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Analyze possible causes
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                      3
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-300">
                        Resolve
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Apply recommended solution
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIP */}
              <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                  Tip
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Include specific error messages and symptoms. More
                  context helps the AI produce a better investigation.
                </p>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}