"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, loginWithGoogle } from "../../services/api";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Google Login state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  // Load saved username only when Remember Me was previously enabled
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    if (savedRememberMe) {
      const savedUsername = localStorage.getItem("savedUsername");
      if (savedUsername) {
        setUsername(savedUsername);
      }
      setRememberMe(true);
    }
  }, []);

  // Initialize official Google Identity Services if client ID is provided
  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleClientId]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setGoogleLoading(true);
    setError("");
    try {
      const data = await loginWithGoogle({ credential: response.credential });
      document.cookie = `token=${encodeURIComponent(data.access_token)}; path=/; max-age=86400; SameSite=Lax`;
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError("");

    // If real Google Client ID is configured and loaded, prompt official Google GIS
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn("Google prompt error, falling back to account chooser modal", e);
      }
    }

    // Interactive Google Account Chooser Modal
    setShowGoogleModal(true);
  };

  const handleSelectGoogleAccount = async (account: { email: string; name: string; picture?: string }) => {
    setShowGoogleModal(false);
    setGoogleLoading(true);
    setError("");

    try {
      const data = await loginWithGoogle({
        email: account.email,
        name: account.name,
        picture: account.picture,
      });

      // Set cookie for middleware
      document.cookie = `token=${encodeURIComponent(data.access_token)}; path=/; max-age=86400; SameSite=Lax`;
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Google authentication failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) return;
    const cleanEmail = customGoogleEmail.trim().toLowerCase();
    const derivedName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const finalName = customGoogleName.trim() || derivedName;
    handleSelectGoogleAccount({
      email: cleanEmail,
      name: finalName,
    });
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(username, password);

      // Ensure token cookie is set for Next.js middleware protection
      document.cookie = `token=${encodeURIComponent(data.access_token)}; path=/; max-age=86400; SameSite=Lax`;

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("savedUsername", username);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("savedUsername");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Heading */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20">
            <span className="text-3xl">🤖</span>
          </div>

          <h1 className="text-3xl font-bold text-white mt-5">
            AI Incident Investigator
          </h1>

          <p className="text-slate-400 mt-2 text-sm">
            Autonomous SRE & DevOps Incident Copilot
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-7 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">
            Sign in to access your SRE incident dashboard.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ════════════ GOOGLE SIGN-IN BUTTON (PRIMARY) ════════════ */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white hover:bg-slate-100 text-slate-800 px-4 py-3 font-semibold text-sm shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
            >
              {googleLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-blue-600" />
                  <span>Signing in with Google...</span>
                </>
              ) : (
                <>
                  {/* Official Google 4-Color Icon */}
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500 font-medium">
              or sign in with password
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 pr-12 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-xs text-slate-400 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-sm text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-600/20"
            >
              {loading ? "Signing in..." : "Sign In with Password"}
            </button>
          </form>

          {/* Recruiter / HR Quick Access Banner */}
          <div className="mt-7 pt-5 border-t border-slate-800">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  DevOps SRE Portfolio Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2.5">
                Reviewing this project for a job role? Inspect the source code and interactive API:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a
                  href="https://github.com/vedantsunilkhairkar/AI-Incident-Investigator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Repository</span>
                </a>

                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
                >
                  <span>Swagger API Docs</span>
                </a>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="font-semibold text-blue-400 hover:text-blue-300 transition underline underline-offset-2"
              >
                Create a new account
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          AI Incident Investigator • Developed by Vedant Sunil Khairkar
        </p>
      </div>

      {/* ════════════ GOOGLE ACCOUNT CHOOSER MODAL ════════════ */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-[#0d1424] p-6 shadow-2xl text-white">
            {/* Modal Header */}
            <div className="text-center mb-5">
              <svg className="h-8 w-8 mx-auto mb-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h3 className="text-lg font-bold">Sign in with Google</h3>
              <p className="text-xs text-slate-400 mt-0.5">to continue to AI Incident Investigator</p>
            </div>

            {/* Quick 1-Click Accounts */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() =>
                  handleSelectGoogleAccount({
                    name: "Vedant Sunil Khairkar",
                    email: "vedantsunilkhairkar@gmail.com",
                  })
                }
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-800 bg-[#080d1a] hover:bg-slate-800/80 transition text-left group"
              >
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                  V
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white group-hover:text-blue-300 truncate">
                    Vedant Sunil Khairkar
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">vedantsunilkhairkar@gmail.com</p>
                </div>
                <span className="text-xs text-slate-500">→</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectGoogleAccount({
                    name: "Principal SRE Demo",
                    email: "sre.commander@gmail.com",
                  })
                }
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-800 bg-[#080d1a] hover:bg-slate-800/80 transition text-left group"
              >
                <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md">
                  S
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                    Principal SRE (Demo)
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">sre.commander@gmail.com</p>
                </div>
                <span className="text-xs text-slate-500">→</span>
              </button>
            </div>

            {/* Custom Google Email Form */}
            <div className="border-t border-slate-800 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Or sign in with any Google account:
              </p>
              <form onSubmit={handleCustomGoogleSubmit} className="space-y-2">
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  placeholder="Your Name (Optional)"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!customGoogleEmail.trim()}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2 text-xs font-semibold text-white transition disabled:opacity-40"
                >
                  Continue with this Account
                </button>
              </form>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="mt-4 w-full text-center text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}