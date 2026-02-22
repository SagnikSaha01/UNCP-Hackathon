import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mic } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { AuraButton } from '../components/AuraButton'
import { ProgressSteps } from '../components/ProgressSteps'
import { AnimatedBackground } from '../components/AnimatedBackground'

type VocalMode = 'preop' | 'postop'

interface VocalTestProps {
  mode: VocalMode
  onNavigate: (screen: string) => void
}

export function VocalTest({ mode, onNavigate }: VocalTestProps) {
  const [recording, setRecording] = useState(false)
  const isPreOp = mode === 'preop'

  const handleContinue = () => {
    if (isPreOp) onNavigate('landing')
    else onNavigate('report')
  }

  return (
    <>
      <AnimatedBackground />
      <section className="relative z-10 min-h-screen flex flex-col p-6">
        <motion.a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate('ocular') }}
          className="inline-flex items-center gap-2 text-aura-muted text-sm mb-4 hover:text-aura-teal transition-colors self-start"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.a>
        <ProgressSteps active={2} steps={4} />
        <motion.div
          className="flex-1 flex flex-col max-w-2xl mx-auto w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-2">
            {isPreOp ? 'Pre-Op Baseline' : 'Post-Op Assessment'} — Vocal Test
          </h2>
          <p className="text-aura-muted text-center mb-8">
            Read the phrase below clearly. Recording is for observation only.
          </p>

          <GlassCard className="flex-1 flex flex-col">
            <h3 className="flex items-center gap-2 text-lg mb-4 text-aura-teal">
              <Mic className="w-5 h-5" /> Vocal Test
            </h3>
            <p className="text-aura-muted text-center py-6 px-4 italic bg-black/20 rounded-2xl mb-6 text-lg">
              &ldquo;The morning light filters through the window slowly.&rdquo;
            </p>
            <div className="flex items-center justify-center gap-1 h-14 mb-6">
              {[...Array(10)].map((_, i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-4 bg-aura-teal rounded-sm"
                  animate={
                    isPreOp
                      ? { scaleY: [0.4, 1, 0.4] }
                      : {
                          scaleY: [0.3, 0.9, 0.2, 0.7, 0.3],
                          scaleX: [1.2, 0.8, 1.1, 0.9, 1.2],
                        }
                  }
                  transition={{
                    duration: isPreOp ? 1.2 : 1.5,
                    repeat: Infinity,
                    delay: i * (isPreOp ? 0.1 : 0.08),
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <motion.button
              type="button"
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border font-medium transition-colors w-full sm:w-auto sm:min-w-[200px] self-center ${
                recording
                  ? 'bg-aura-red/20 border-aura-red text-aura-red'
                  : 'bg-aura-glass border-aura-teal text-aura-teal hover:bg-aura-teal/10'
              }`}
              onClick={() => setRecording(!recording)}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${recording ? 'animate-pulse' : ''}`}
                style={{ background: 'currentColor' }}
              />
              {recording ? 'Recording…' : 'Record response'}
            </motion.button>
          </GlassCard>

          <div className="mt-8 flex justify-center">
            <AuraButton onClick={handleContinue}>
              {isPreOp ? 'Done — Return home' : 'View Readiness Report'}
            </AuraButton>
          </div>
        </motion.div>
      </section>
    </>
  )
}
