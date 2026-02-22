import { motion } from 'framer-motion'

const orbVariants = {
  animate: (i: number) => ({
    x: [0, 30, -20, 0],
    y: [0, -40, 20, 0],
    scale: [1, 1.05, 0.95, 1],
    transition: { duration: 25, repeat: Infinity, ease: 'easeInOut', delay: i * -3 },
  }),
}

const particleCount = 36

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-aura-teal -top-[10%] -left-[10%] blur-[80px] opacity-35"
        variants={orbVariants}
        animate="animate"
        custom={0}
      />
      <motion.div
        className="absolute w-[350px] h-[350px] rounded-full bg-aura-violet top-1/2 -right-[15%] blur-[80px] opacity-35"
        variants={orbVariants}
        animate="animate"
        custom={1}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full bg-aura-teal -bottom-[10%] left-[30%] blur-[80px] opacity-35"
        variants={orbVariants}
        animate="animate"
        custom={2}
      />
      <div className="absolute inset-0">
        {Array.from({ length: particleCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-white/15"
            style={{
              left: `${(i * 97) % 100}%`,
              top: `${(i * 73) % 100}%`,
            }}
            animate={{
              y: ['100vh', '-100px'],
              x: [0, -50 - (i % 3) * 30],
              opacity: [0, 0.15, 0.15, 0],
              rotate: 720,
            }}
            transition={{
              duration: 18 + (i % 5),
              repeat: Infinity,
              delay: i * 0.7,
            }}
          />
        ))}
      </div>
    </div>
  )
}
