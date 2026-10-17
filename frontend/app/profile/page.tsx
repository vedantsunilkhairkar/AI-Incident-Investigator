"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { changeEmail } from "../../services/api";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [authProvider, setAuthProvider] = useState("local");
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setUsername(
      localStorage.getItem("name") ||
      localStorage.getItem("username") ||
      ""
    );
    setEmail(localStorage.getItem("email") || "");
    setAvatarUrl(localStorage.getItem("avatar_url") || "");
    setAuthProvider(localStorage.getItem("auth_provider") || "local");
  }, []);

  const handleChangeEmail = async (e: FormEvent) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      setError("Please enter a new email address.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (trimmedEmail === email) {
      setError("This is already your current email.");
      return;
    }

    setLoading(true);

    try {
      const data = await changeEmail(trimmedEmail);

      setEmail(data.email);
      setNewEmail("");
      setMessage("Email updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Failed to update email.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("rememberMe");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#080d18] text-white">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-white/10 bg-[#0d1422] px-5 py-6">
        <div className="mb-10">
          <h1 className="text-xl font-bold">
            AI Incident
          </h1>
          <p className="text-sm text-slate-400">
            Investigator
          </p>
        </div>

        <nav className="space-y-2">
          <Link
            href="/"
            className="block rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            Dashboard
          </Link>

          <Link
            href="/incidents/new"
            className="block rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            New Incident
          </Link>

          <Link
            href="/history"
            className="block rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            Investigation History
          </Link>

          <Link
            href="/profile"
            className="block rounded-xl bg-blue-600/20 px-4 py-3 font-medium text-blue-400"
          >
            Profile
          </Link>

          <a
            href="https://github.com/vedantsunilkhairkar/AI-Incident-Investigator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
        </nav>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-red-500/20 px-4 py-3 text-left text-red-400 transition hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen p-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <p className="text-sm text-blue-400">
              ACCOUNT
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Profile
            </h2>

            <p className="mt-2 text-slate-400">
              Manage your account information.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Information */}
            <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Account Information
                </h3>
                {authProvider === "google" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Google Account
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                    Local Account
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4 border-b border-white/[0.06] pb-6">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg">
                    {username ? username[0].toUpperCase() : "U"}
                  </div>
                )}
                <div>
                  <p className="text-xl font-bold text-white">
                    {username || "Loading..."}
                  </p>
                  <p className="text-xs text-slate-400">
                    {authProvider === "google" ? "Google OAuth Authenticated" : "Standard Account"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Display Name
                  </p>
                  <p className="mt-1 text-base font-medium text-white">
                    {username || "Loading..."}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Email Address
                  </p>
                  <p className="mt-1 break-all text-base font-medium text-cyan-300 font-mono">
                    {email || "No email available"}
                  </p>
                </div>
              </div>
            </div>

            {/* Change Email */}
            <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-6">
              <h3 className="text-lg font-semibold">
                Change Email
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Update the email connected to your account.
              </p>

              <form
                onSubmit={handleChangeEmail}
                className="mt-6 space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm text-slate-400">
                    New Email
                  </label>

                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) =>
                      setNewEmail(e.target.value)
                    }
                    placeholder="Enter new email"
                    className="w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                  />
                </div>

                {message && (
                  <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Updating..."
                    : "Update Email"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}