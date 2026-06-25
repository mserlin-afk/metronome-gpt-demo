"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AppSession = {
  metronomeCustomerId: string;
  stripeCustomerId: string;
  displayName: string;
  projects: { id: string; name: string }[];
};

function getSession(): AppSession | null {
  try {
    const raw = localStorage.getItem("appSession");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/chat");
  }, [router]);

  async function handleGetStarted() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md px-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-white">Dexter&apos;s AI Lab</h1>
          <p className="text-gray-400">Powered by Metronome usage-based billing</p>
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-medium text-white">Starter Pack</p>
              <p className="text-sm text-gray-400 mt-1">$10 in AI credits to get started</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-white">$10</p>
              <p className="text-xs text-gray-500">one-time</p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-indigo-400">✓</span> Access to all models (gpt-5.4, gpt-5.4-mini, gpt-5.5)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-400">✓</span> All API types (flex, batch, standard, priority)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-400">✓</span> Pay-as-you-go overages when credits run out
            </li>
          </ul>

          <button
            onClick={handleGetStarted}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Redirecting to checkout..." : "Get Started →"}
          </button>
        </div>
      </div>
    </div>
  );
}
