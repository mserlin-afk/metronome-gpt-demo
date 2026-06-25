"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AppSession = {
  metronomeCustomerId: string;
  stripeCustomerId: string;
  displayName: string;
  projects: { id: string; name: string }[];
};

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [step, setStep] = useState<"provisioning" | "name">("provisioning");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [metronomeCustomerId, setMetronomeCustomerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 1: get Stripe customer ID from checkout session, then poll for Metronome provisioning
  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
      return;
    }

    async function init() {
      // Retrieve stripe customer ID from checkout session
      const res = await fetch(`/api/checkout-session?session_id=${sessionId}`);
      const { stripeCustomerId: cid } = await res.json();
      if (!cid) { router.replace("/"); return; }
      setStripeCustomerId(cid);

      // Poll for Metronome provisioning
      intervalRef.current = setInterval(async () => {
        const statusRes = await fetch(`/api/session-status?stripeCustomerId=${cid}`);
        const { ready, metronomeCustomerId: mid } = await statusRes.json();
        if (ready && mid) {
          clearInterval(intervalRef.current!);
          setMetronomeCustomerId(mid);
          setStep("name");
        }
      }, 2000);
    }

    init();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionId, router]);

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed || !metronomeCustomerId || !stripeCustomerId) return;

    const session: AppSession = {
      metronomeCustomerId,
      stripeCustomerId,
      displayName: trimmed,
      projects: [],
    };
    localStorage.setItem("appSession", JSON.stringify(session));
    router.push("/chat");
  }

  if (step === "provisioning") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-medium">Setting up your account...</p>
          <p className="text-gray-400 text-sm">This will just take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm px-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-semibold text-white">You&apos;re all set!</h1>
          <p className="text-gray-400 text-sm">What should we call you?</p>
        </div>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
          />
          <button
            type="submit"
            disabled={!displayName.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start chatting →
          </button>
        </form>
      </div>
    </div>
  );
}
