# AURA — Automated Universal Recovery Assessment (React)

A premium, frontend-only digital clearance platform for surgical patients, built with React, **Framer Motion**, **Tailwind CSS**, and **Lucide React**.

## Stack

- **Vite** + **React** + **TypeScript**
- **Framer Motion** — page transitions, staggered reveals, animated gauge, typewriter, hover/tap micro-interactions
- **Tailwind CSS** — design tokens (teal, violet, status colors), glassmorphism, responsive layout
- **Lucide React** — icons (Activity, Eye, Mic, ArrowLeft, AlertTriangle, Lock, Clock)

## Run

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

## Build

```bash
npm run build
npm run preview
```

## Screens

1. **Landing** — Hero, AURA logo, tagline, heartbeat line, CTAs (Pre-Op / Post-Op)
2. **Intake** — 3-step progress, patient form
3. **Pre-Op** — Ocular (figure-8 dot) + Vocal tests, baseline score 94/100
4. **Post-Op** — Same tests with “off” feel, score 61/100
5. **Report** — Animated gauge 0→61, typewriter AI analysis, metrics, HOLD banner, locked discharge cert
6. **Dashboard** — 6 patient cards, live clock, status badges

All data is mocked; no backend.
