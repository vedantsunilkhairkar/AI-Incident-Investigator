"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../../services/api";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load saved username only when Remember Me was previously enabled
  useEffect(() => {
    const savedRememberMe =
      localStorage.getItem("rememberMe") === "true";

    if (savedRememberMe) {
      const savedUsername =
        localStorage.getItem("savedUsername");

      if (savedUsername) {
        setUsername(savedUsername);
      }

      setRememberMe(true);
    }
  }, []);

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
      setError(
        err.message ||
          "Invalid username or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* Logo / Heading */}
        <div className="text-center mb-8">

          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/20">
            <span className="text-3xl">
              🤖
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mt-5">
            AI Investigator
          </h1>

          <p className="text-slate-400 mt-2">
            Sign in to manage your incidents
          </p>

        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">

          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back
          </h2>

          <p className="text-slate-400 text-sm mb-7">
            Enter your account details to continue.
          </p>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Username */}
            <div>

              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

            </div>

            {/* Password */}
            <div>

              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

            </div>

            {/* Remember Me */}
            <div className="flex items-center">

              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(
                    e.target.checked
                  )
                }
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />

              <label
                htmlFor="remember"
                className="ml-2 text-sm text-slate-400 cursor-pointer select-none"
              >
                Remember me
              </label>

            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Signing in..."
                : "Sign In"}
            </button>

          </form>

          {/* Register Option */}
          <div className="mt-7 pt-6 border-t border-slate-800 text-center">

            <p className="text-sm text-slate-400">
              Don't have an account?
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/register")
              }
              className="mt-2 font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Create a new account →
            </button>

          </div>

        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          AI-powered incident investigation system
        </p>

      </div>

    </div>
  );
}