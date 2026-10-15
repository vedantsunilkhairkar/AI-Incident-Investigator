"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { changeEmail } from "../../services/api";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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

    setUsername(localStorage.getItem("username") || "");
    setEmail(localStorage.getItem("email") || "");
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
            href="/profile"
            className="block rounded-xl bg-blue-600/20 px-4 py-3 font-medium text-blue-400"
          >
            Profile
          </Link>
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
              <h3 className="text-lg font-semibold">
                Account Information
              </h3>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-sm text-slate-500">
                    Username
                  </p>
                  <p className="mt-1 text-lg font-medium">
                    {username || "Loading..."}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">
                    Current Email
                  </p>
                  <p className="mt-1 break-all text-lg font-medium">
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