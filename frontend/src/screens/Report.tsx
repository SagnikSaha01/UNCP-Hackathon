import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, Lock } from 'lucide-react'
import { AnimatedGauge } from '../components/AnimatedGauge'
import { TypewriterText } from '../components/TypewriterText'
import { AuraButton } from '../components/AuraButton'
import { AnimatedBackground } from '../components/AnimatedBackground'

const AI_ANALYSIS =
  'Patient shows 34% degradation in saccadic response velocity and elevated vocal tremor index of 2.3σ above baseline. Recommend minimum 90-minute supervised observation before reassessment. Findings consistent with residual GABAergic anesthesia effects on brainstem motor pathways.'

interface ReportProps {
  onNavigate: (screen: string) => void
}

export function Report({ onNavigate }: ReportProps) {
  return (
    <>
      <AnimatedBackground />
      <section className="relative z-10 min-h-screen p-6">
        <motion.a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate('vocal') }}
          className="inline-flex items-center gap-2 text-aura-muted text-sm mb-6 hover:text-aura-teal transition-colors"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to assessment
        </motion.a>
        <motion.div
          className="max-w-xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-8">AURA Readiness Report</h2>
          <AnimatedGauge value={61} />
          <motion.div
            className="bg-aura-glass border border-aura-border rounded-2xl p-6 mb-6 min-h-[140px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-xs uppercase tracking-wider text-aura-teal mb-3">AI Analysis</div>
            <div className="text-[15px] leading-relaxed text-aura-muted">
              <TypewriterText text={AI_ANALYSIS} speed={16} />
            </div>
          </motion.div>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { value: 58, label: 'Ocular Score', color: 'text-aura-amber' },
              { value: 64, label: 'Vocal Score', color: 'text-aura-amber' },
              { value: 61, label: 'CNS Readiness Index', color: 'text-aura-red' },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                className="bg-aura-glass border border-aura-border rounded-2xl p-5 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-aura-muted mt-1">{m.label}</div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className="flex items-center gap-4 p-5 rounded-2xl mb-6 bg-aura-red/15 border border-aura-red/40 text-aura-red font-semibold"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <span>HOLD — Further Observation Required</span>
          </motion.div>
          <motion.div
            className="bg-aura-glass border border-aura-border rounded-2xl p-8 text-center opacity-60 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.9 }}
          >
            <Lock className="w-8 h-8 text-aura-muted mx-auto mb-2" />
            <div className="font-semibold text-aura-muted">Discharge Certificate</div>
            <div className="text-sm text-aura-muted mt-1">Available when AURA score meets clearance threshold</div>
          </motion.div>
          <div className="text-center">
            <AuraButton primary={false} onClick={() => onNavigate('dashboard')}>
              Open Clinician Dashboard
            </AuraButton>
          </div>
        </motion.div>
      </section>
    </>
  )
}
