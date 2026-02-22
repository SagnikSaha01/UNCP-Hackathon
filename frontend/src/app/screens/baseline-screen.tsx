import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Target, Lock, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { VoiceAssistantButton } from "../components/voice-assistant-button";
import { useAuth } from "../context/auth-context";
import { buildApiUrl } from "../config/api";

const BASELINE_TRANSCRIPT =
  "Pre-op baseline. Establish your baseline before surgery. You will follow the dot with your eyes and complete a short voice check. The test takes a few minutes. Keep your head still and follow the on-screen instructions.";

interface BaselineStatus {
  has_baseline: boolean;
  session_count: number;
  baseline_reset_at: string | null;
}

export function BaselineScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<BaselineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (!user?.patientId) { setLoading(false); return; }
    fetch(buildApiUrl(`/patients/${user.patientId}/baseline-status`))
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStatus(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.patientId]);

  const handleReset = async () => {
    if (!user?.patientId) return;
    setResetting(true);
    setResetError("");
    try {
      const res = await fetch(buildApiUrl(`/patients/${user.patientId}/reset`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResetError(data.detail ?? "Reset failed. Please try again.");
        setResetting(false);
        return;
      }
      // Reset succeeded — update local status
      setStatus({ has_baseline: false, session_count: 0, baseline_reset_at: new Date().toISOString() });
      setShowConfirm(false);
    } catch {
      setResetError("Could not reach the server. Is the backend running?");
    }
    setResetting(false);
  };

  const hasBaseline = status?.has_baseline ?? false;
  const sessionCount = status?.session_count ?? 0;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0a0f1e] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/10 via-transparent to-[#00d4ff]/10" />

      <div className="max-w-2xl mx-auto px-6 py-10 relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">

        {/* Icon */}
        <div className={`p-4 rounded-2xl border mb-6 ${hasBaseline ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/10"}`}>
          {hasBaseline
            ? <CheckCircle className="h-12 w-12 text-green-400" />
            : <Target className="h-12 w-12 text-[#00d4ff]" />
          }
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">Pre-op Baseline</h1>
        <p className="text-white/60 text-center mb-8">
          {hasBaseline
            ? "Your baseline is recorded. All future post-op tests will be compared against it."
            : "Establish your baseline before surgery. This gives us a reference for later comparisons."}
        </p>

        {/* Status card */}
        {!loading && (
          <Card className="p-6 bg-white/5 border border-white/10 rounded-xl w-full max-w-md mb-6">
            {hasBaseline ? (
              <div className="space-y-3">
                {/* Baseline locked state */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-300">Baseline recorded</p>
                    <p className="text-xs text-white/50">{sessionCount} session{sessionCount !== 1 ? "s" : ""} on file</p>
                  </div>
                </div>

                {/* Locked start button */}
                <div className="relative">
                  <Button
                    disabled
                    className="w-full h-12 bg-white/5 text-white/30 font-semibold rounded-xl border border-white/10 cursor-not-allowed"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Start baseline assessment
                  </Button>
                  <p className="text-xs text-white/40 text-center mt-2">
                    Baseline is locked. Reset below to record a new one.
                  </p>
                </div>

                {/* Reset button */}
                <div className="pt-2 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => { setShowConfirm(true); setResetError(""); }}
                    className="w-full h-11 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/50 font-semibold rounded-xl"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Baseline
                  </Button>
                  <p className="text-xs text-white/40 text-center mt-2">
                    Use this only when starting a new treatment or surgery cycle.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-white/70">
                  The test takes a few minutes. Keep your head still and follow the on-screen instructions.
                </p>
                {status?.baseline_reset_at && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">
                      Baseline was reset on {new Date(status.baseline_reset_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. All previous data cleared.
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => navigate("/instructions")}
                  className="w-full h-12 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] hover:opacity-90 text-white font-semibold rounded-xl"
                >
                  Start baseline assessment
                </Button>
              </div>
            )}
          </Card>
        )}

        {loading && (
          <div className="text-white/40 text-sm">Loading baseline status…</div>
        )}
      </div>

      {/* Confirmation dialog overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <Card className="w-full max-w-md p-6 bg-[#0f1628] border border-red-500/30 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Reset Baseline?</h2>
                <p className="text-sm text-white/50">This cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-white/70">
              This will permanently delete your current baseline and all{" "}
              <span className="text-white font-semibold">{sessionCount} session{sessionCount !== 1 ? "s" : ""}</span>{" "}
              of test data. The next baseline assessment you complete will become your new reference point.
            </p>

            <p className="text-xs text-white/40">
              Only do this if you are starting a new treatment cycle or surgery.
            </p>

            {resetError && (
              <p className="text-sm text-red-400">{resetError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowConfirm(false); setResetError(""); }}
                disabled={resetting}
                className="flex-1 h-11 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Yes, reset everything"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <VoiceAssistantButton transcript={BASELINE_TRANSCRIPT} />
    </div>
  );
}
