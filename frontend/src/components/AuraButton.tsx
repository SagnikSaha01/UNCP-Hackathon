import { motion } from 'framer-motion'

interface AuraButtonProps {
  children: React.ReactNode
  onClick?: () => void
  primary?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function AuraButton({ children, onClick, primary = true, className = '', disabled, type = 'button' }: AuraButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-semibold px-8 py-4 rounded-2xl border transition-colors
        ${primary
          ? 'bg-gradient-to-br from-aura-teal to-[#00a8cc] text-aura-deep border-transparent shadow-[0_4px_24px_rgba(0,212,255,0.4)]'
          : 'bg-aura-glass text-aura-teal border-aura-border hover:bg-aura-teal/10'
        }
        ${className}
      `}
      whileHover={{ scale: 1.02, boxShadow: primary ? '0 8px 32px rgba(0, 212, 255, 0.5)' : undefined }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  )
}
