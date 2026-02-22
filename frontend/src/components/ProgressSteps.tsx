import { motion } from 'framer-motion'

const STEPS_3 = ['Intake', 'Assessment', 'Report'] as const
const STEPS_4 = ['Intake', 'Ocular', 'Vocal', 'Report'] as const

interface ProgressStepsProps {
  active: 0 | 1 | 2 | 3
  steps?: 3 | 4
}

export function ProgressSteps({ active, steps: stepCount = 3 }: ProgressStepsProps) {
  const steps = stepCount === 4 ? STEPS_4 : STEPS_3
  const maxIndex = steps.length - 1
  const activeIndex = Math.min(active, maxIndex) as 0 | 1 | 2 | 3
  return (
    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <motion.div
            className={`
              flex items-center gap-2 text-sm
              ${i < activeIndex ? 'text-aura-green' : i === activeIndex ? 'text-aura-teal font-semibold' : 'text-aura-muted'}
            `}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span
              className={`
                w-2.5 h-2.5 rounded-full
                ${i < activeIndex ? 'bg-aura-green' : i === activeIndex ? 'bg-aura-teal shadow-[0_0_12px_#00d4ff]' : 'bg-aura-muted/50'}
              `}
            />
            {label}
          </motion.div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 h-0.5 ${i < activeIndex ? 'bg-aura-green' : 'bg-aura-border'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
