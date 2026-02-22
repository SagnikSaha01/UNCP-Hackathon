import { motion } from 'framer-motion'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className = '', hover = true }: GlassCardProps) {
  return (
    <motion.div
      className={`bg-aura-glass backdrop-blur-glass border border-aura-border rounded-2xl p-6 shadow-glow ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={hover ? { borderColor: 'rgba(0, 212, 255, 0.2)', boxShadow: '0 0 60px rgba(0, 212, 255, 0.12)' } : undefined}
    >
      {children}
    </motion.div>
  )
}
