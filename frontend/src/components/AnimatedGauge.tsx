import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface AnimatedGaugeProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}

function useCountUp(end: number, durationMs = 1400, start = 0) {
  const [n, setN] = useState(start)
  useEffect(() => {
    setN(start)
    const startTime = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1)
      const eased = 1 - (1 - t) * (1 - t)
      setN(Math.round(start + (end - start) * eased))
      if (t < 1) requestAnimationFrame(tick)
    }
    const id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [end, durationMs, start])
  return n
}

export function AnimatedGauge({ value, size = 220, strokeWidth = 12, className = '' }: AnimatedGaugeProps) {
  const displayValue = useCountUp(value)
  const r = size / 2 - strokeWidth
  const circumference = 2 * Math.PI * r
  const offset = circumference - (circumference * value) / 100
  const strokeColor = value >= 80 ? '#00ff88' : value >= 60 ? '#ffb800' : '#ff4444'

  return (
    <div className={`relative mx-auto mb-8 ${className}`} style={{ width: size, height: size }}>
      <svg
        className="w-full h-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          className="text-4xl font-bold tabular-nums"
          style={{ color: strokeColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {displayValue}
        </motion.span>
        <span className="text-xs text-aura-muted mt-0.5">Readiness score</span>
      </div>
    </div>
  )
}
