"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Building2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Failed to sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6 font-sans">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-blue-600)] text-white shadow-lg">
            <Building2 size={28} />
          </div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-zinc-900">
            Property Visualizer
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">Admin dashboard — sign in to continue</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)]">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.08em] text-zinc-500">
                EMAIL
              </label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-[var(--color-blue-600)] focus:bg-white"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.08em] text-zinc-500">
                PASSWORD
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[14px] text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-[var(--color-blue-600)] focus:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[var(--color-blue-600)] py-3 text-[14px] font-semibold text-white transition hover:bg-[var(--color-blue-700)] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
