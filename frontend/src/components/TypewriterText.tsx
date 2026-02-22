import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export function TypewriterText({ text, speed = 18, onComplete, className = '' }: TypewriterTextProps) {
  const [display, setDisplay] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplay('')
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      if (i < text.length) {
        setDisplay(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(id)
        setDone(true)
        onComplete?.()
      }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed, onComplete])

  return (
    <span className={className}>
      {display}
      {!done && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-aura-teal ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  )
}
