import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Download, RotateCcw, CheckCircle, TrendingUp, Eye, Clock, Mic2, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { VoiceAssistantButton } from "../components/voice-assistant-button";
import { motion } from "motion/react";
import { useAuth } from "../context/auth-context";
import { buildApiUrl } from "../config/api";
import { loadLatestGeminiSummary } from "../lib/gemini-analysis";

type SessionRecord = {
  timestamp?: string;
  session_averages?: Record<string, number | null>;
  baseline_snapshot?: Record<string, number | null>;
  derived_metrics?: {
    deltas_vs_baseline?: Record<string, number | null>;
  };
  gemini_summary?: {
    risk_level?: string;
    conditions_flagged?: string[];
    confidence_score?: number;
    explanation?: string[];
    research_references_used?: string[];
    patient_name?: string;
  };
};

export function ResultsScreen() {
  const navigate = useNavigate();
  const { getCurrentPatientId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestSession, setLatestSession] = useState<SessionRecord | null>(null);
  const [summary, setSummary] = useState<SessionRecord["gemini_summary"]>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const patientId = await getCurrentPatientId();
        if (!patientId) {
          if (!cancelled) {
            setLatestSession(null);
            setSummary({});
            setLoading(false);
          }
          return;
        }

        const sessionsRes = await fetch(buildApiUrl(`/session/${encodeURIComponent(patientId)}`));
        const sessions: SessionRecord[] = sessionsRes.ok ? await sessionsRes.json() : [];
        const latest = Array.isArray(sessions) && sessions.length > 0 ? sessions[sessions.length - 1] : null;
        const cachedSummary = loadLatestGeminiSummary(patientId) || {};
        const mergedSummary = {
          ...cachedSummary,
          ...(latest?.gemini_summary || {}),
        };

        if (!cancelled) {
          setLatestSession(latest);
          setSummary(mergedSummary);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load latest assessment results.");
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [getCurrentPatientId]);

  const riskLevelValue = summary?.risk_level ?? "inconclusive";
  const confidenceScore = typeof summary?.confidence_score === "number" ? summary.confidence_score : null;
  const cognitiveScore = confidenceScore != null
    ? Math.max(0, Math.min(100, Math.round(confidenceScore * 100)))
    : riskLevelValue === "high"
      ? 35
      : riskLevelValue === "moderate" || riskLevelValue === "medium"
        ? 60
        : riskLevelValue === "low"
          ? 85
          : 50;

  const riskLevel: "green" | "amber" | "red" =
    cognitiveScore >= 75 ? "green" : cognitiveScore >= 50 ? "amber" : "red";

  const getRiskColor = () => {
    switch (riskLevel) {
      case "green":
        return "#10b981";
      case "amber":
        return "#f59e0b";
      case "red":
        return "#ef4444";
    }
  };

  const getRiskText = () => {
    switch (riskLevel) {
      case "green":
        return "Stable";
      case "amber":
        return "Monitor";
      case "red":
        return "Attention Needed";
    }
  };

  const metrics = useMemo(() => {
    const avg = latestSession?.session_averages || {};
    const deltas = latestSession?.derived_metrics?.deltas_vs_baseline || {};

    const metricDefs = [
      {
        icon: Eye,
        key: "fixation_stability",
        label: "Eye Tracking Stability",
        formatter: (value: number) => `${Math.round(value * 100)}%`,
      },
      {
        icon: Clock,
        key: "prosaccade_latency",
        label: "Reaction Time",
        formatter: (value: number) => `${value.toFixed(2)} ms`,
      },
      {
        icon: Mic2,
        key: "smooth_pursuit_gain",
        label: "Tracking Smoothness",
        formatter: (value: number) => `${Math.round(value * 100)}%`,
      },
    ];

    return metricDefs.map((metric) => {
      const value = avg[metric.key];
      const delta = deltas[`delta_${metric.key}`];
      return {
        icon: metric.icon,
        label: metric.label,
        value: typeof value === "number" ? metric.formatter(value) : "—",
        change:
          typeof delta === "number"
            ? `${delta > 0 ? "+" : ""}${delta.toFixed(3)}`
            : "No baseline delta",
      };
    });
  }, [latestSession]);

  const primaryExplanation = Array.isArray(summary?.explanation) && summary.explanation.length > 0
    ? summary.explanation[0]
    : "Your latest test was processed and baseline-linked metrics are available on this report.";

  const transcript = `Assessment summary ready. Risk level is ${summary?.risk_level ?? "inconclusive"} with score ${cognitiveScore} out of 100. ${primaryExplanation}`;

  return (
    <div className="min-h-screen bg-[#0a0f1e] p-6 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/10 via-transparent to-[#00d4ff]/10" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#10b981]/80 mb-3">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Cognitive Stability Summary
          </h1>
          <p className="text-sm text-white/60">
            Completed on {new Date().toLocaleDateString("en-US", { 
              weekday: "long", 
              month: "long", 
              day: "numeric",
              year: "numeric" 
            })}
          </p>
        </div>

        {loading && (
          <Card className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
            <div className="flex items-center gap-2 text-white/80">
              <Loader2 className="h-4 w-4 animate-spin text-[#00d4ff]" />
              Loading latest Gemini summary...
            </div>
          </Card>
        )}

        {!loading && error && (
          <Card className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200">
            {error}
          </Card>
        )}

        {!loading && !error && (
          <>

        {/* Score Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
        >
          <Card className="max-w-sm mx-auto p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="12"
                    fill="none"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke={getRiskColor()}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "502.65 502.65", strokeDashoffset: 502.65 }}
                    animate={{ strokeDashoffset: 502.65 - (502.65 * cognitiveScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-5xl font-bold mb-1" style={{ color: getRiskColor() }}>
                    {cognitiveScore}
                  </p>
                  <p className="text-sm text-white/60">out of 100</p>
                </div>
              </div>
              <div
                className="inline-block px-6 py-2 rounded-xl border"
                style={{ 
                  backgroundColor: `${getRiskColor()}15`,
                  borderColor: `${getRiskColor()}40`
                }}
              >
                <p className="text-sm font-semibold" style={{ color: getRiskColor() }}>
                  {summary?.risk_level ? `${summary.risk_level.toUpperCase()} RISK` : getRiskText()}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* What We Measured */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white text-center">
            What We Measured
          </h2>
          <div className="grid gap-3">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-[#00d4ff]/20 to-[#7c3aed]/20 rounded-lg border border-white/10">
                        <metric.icon className="h-5 w-5 text-[#00d4ff]" />
                      </div>
                      <div>
                        <p className="text-sm text-white/80">{metric.label}</p>
                        <p className="text-xl font-bold text-white mt-0.5">
                          {metric.value}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[#10b981]">
                        <TrendingUp className="h-4 w-4" />
                        <p className="text-sm font-medium">{metric.change}</p>
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">vs. baseline</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* What This Means */}
        <Card className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-3">
            What This Means
          </h2>
          <p className="text-sm text-white/80 leading-relaxed">
            {primaryExplanation}
          </p>
        </Card>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-3">
          <Button
            className="h-12 bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] hover:opacity-90 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#00d4ff]/20"
          >
            <Download className="mr-2 h-4 w-4" />
            Save Report
          </Button>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="h-12 border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm rounded-xl"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Repeat Assessment
          </Button>
        </div>

        {/* Additional Info */}
        <Card className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
          <p className="text-xs text-white/60 text-center">
            💡 Tip: Take assessments regularly to track changes over time. 
            Share these results with your healthcare provider if needed.
          </p>
        </Card>
        </>
        )}
      </div>

      {/* Floating Voice Assistant Button */}
      <VoiceAssistantButton transcript={transcript} />
    </div>
  );
}
