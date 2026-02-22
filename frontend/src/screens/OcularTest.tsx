import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { AuraButton } from '../components/AuraButton'
import { ProgressSteps } from '../components/ProgressSteps'
import { AnimatedBackground } from '../components/AnimatedBackground'

type OcularMode = 'preop' | 'postop'

interface OcularTestProps {
  mode: OcularMode
  onNavigate: (screen: string) => void
}

// --- Logic from eyetrack.html (unchanged) ---
const VELOCITY_SCALE = 2500
const CALIBRATION_DURATION_MS = 4000
const THRESHOLD_OFFSET = 0.1
const EXAM_CYCLES = 5
const EXAM_POSITION_DURATION_MS = 1500
const PEAK_TRACK_INTERVAL_MS = 50
const DEPRESSION_MULTIPLIER = 1.2
const DETECTION_INTERVAL_MS = 66
const UI_UPDATE_INTERVAL_MS = 150
const CHART_UPDATE_INTERVAL_MS = 100
const CHART_SLIDING_WINDOW = 300
const HISTORY_LEN = 5

// Landmark indices from eyetrack.html (unchanged)
const LEFT_IRIS = 468
const RIGHT_IRIS = 473
const IRIS_LEFT = 469
const IRIS_RIGHT = 471

interface FaceMeshResults {
  image: HTMLVideoElement | HTMLImageElement
  multiFaceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>
}

export function OcularTest({ mode: _mode, onNavigate }: OcularTestProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const faceMeshRef = useRef<ReturnType<typeof createFaceMesh> | null>(null)
  const chartInstanceRef = useRef<{ data: { labels: string[]; datasets: Array<{ data: number[] }> }; update: (mode?: string) => void } | null>(null)
  const processRafRef = useRef<number>(0)
  const lastDetectionRef = useRef(0)

  const historyRef = useRef<Array<{ x: number; t: number }>>([])
  const calibDataRef = useRef<number[]>([])
  const examSaccadePeaksRef = useRef<number[]>([])
  const forceFailRef = useRef(false)
  const peakTrackerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const liveVelocityRef = useRef(0)

  const [statusText, setStatusText] = useState('AURA SYSTEM INITIALIZED: CALIBRATION REQUIRED')
  const [threshold, setThreshold] = useState(0.25)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibDone, setCalibDone] = useState(false)
  const [examRunning, setExamRunning] = useState(false)
  const [examBtnDisabled, setExamBtnDisabled] = useState(true)
  const [liveVelocity, setLiveVelocity] = useState('0.00')
  const [irisSizePct, setIrisSizePct] = useState('--')
  const [showTargetDot, setShowTargetDot] = useState(false)
  const [targetPosition, setTargetPosition] = useState<{ left: string; top: string }>({ left: '10%', top: '50%' })
  const [showResultsModal, setShowResultsModal] = useState(false)
  const lastUiUpdateRef = useRef(0)
  const lastChartUpdateRef = useRef(0)
  const irisSizeRef = useRef('--')
  const [resultNormal, setResultNormal] = useState(true)
  const [resultPillText, setResultPillText] = useState('ANALYZING...')
  const [resultHeaderText, setResultHeaderText] = useState('NORMAL')
  const [finalSaccadeAvg, setFinalSaccadeAvg] = useState('')

  function createFaceMesh() {
    if (typeof window === 'undefined' || !window.FaceMesh) return null
    const FaceMesh = window.FaceMesh as unknown as new (config: { locateFile: (file: string) => string }) => {
      setOptions: (opts: { maxNumFaces: number; refineLandmarks: boolean; minDetectionConfidence: number }) => void
      onResults: (cb: (results: FaceMeshResults) => void) => void
      send: (input: { image: HTMLVideoElement }) => Promise<void>
    }
    const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619'
    const fm = new FaceMesh({
      locateFile: (file: string) => `${base}/${file}`,
    })
    fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6 })
    return fm
  }

  const initLiveChart = useCallback(() => {
    if (!chartRef.current || typeof window === 'undefined' || !window.Chart) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return
    const ChartConstructor = (window as unknown as { Chart: new (ctx: CanvasRenderingContext2D, config: object) => { data: { labels: string[]; datasets: Array<{ data: number[] }> }; update: (mode?: string) => void } }).Chart
    chartInstanceRef.current = new ChartConstructor(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Ocular Velocity',
            data: [],
            borderColor: '#00d4ff',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: true,
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
          },
          {
            label: 'Threshold',
            data: [],
            borderColor: '#ff4444',
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 1.0,
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: 'rgba(255,255,255,0.5)' },
          },
          x: { display: false },
        },
        plugins: { legend: { display: false } },
      },
    })
  }, [])

  useEffect(() => {
    initLiveChart()
    return () => {
      if (chartInstanceRef.current) (chartInstanceRef.current as { destroy?: () => void }).destroy?.()
    }
  }, [initLiveChart])

  const onResults = useCallback(
    (results: FaceMeshResults) => {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx || !canvas || !video) return

      ctx.save()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0]
        if (!landmarks[LEFT_IRIS] || !landmarks[IRIS_RIGHT] || !landmarks[IRIS_LEFT] || !landmarks[RIGHT_IRIS]) {
          ctx.restore()
          return
        }

        const leftIris = landmarks[LEFT_IRIS]
        const rightIris = landmarks[RIGHT_IRIS]
        const now = performance.now()
        const avgX = (leftIris.x + rightIris.x) / 2
        historyRef.current.push({ x: avgX, t: now })
        if (historyRef.current.length > HISTORY_LEN) historyRef.current.shift()

        if (historyRef.current.length > 2) {
          const last = historyRef.current[historyRef.current.length - 1]
          const prev = historyRef.current[historyRef.current.length - 2]
          const dt = last.t - prev.t
          const v = (Math.abs(last.x - prev.x) / dt) * VELOCITY_SCALE

          if (isCalibrating) calibDataRef.current.push(v)
          liveVelocityRef.current = v
          if (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
            lastUiUpdateRef.current = now
            setLiveVelocity(v.toFixed(2))
          }

          const chart = chartInstanceRef.current as unknown as {
            data: { labels: string[]; datasets: Array<{ data: number[] }> }
            update: (mode?: string) => void
          } | null
          if (examRunning && chart && now - lastChartUpdateRef.current >= CHART_UPDATE_INTERVAL_MS) {
            lastChartUpdateRef.current = now
            chart.data.labels.push('')
            chart.data.datasets[0].data.push(v)
            if (chart.data.labels.length > CHART_SLIDING_WINDOW) {
              chart.data.labels.shift()
              chart.data.datasets[0].data.shift()
            }
            const redLineValue = threshold
            chart.data.datasets[1].data = Array(chart.data.datasets[0].data.length).fill(redLineValue)
            chart.update('none')
          }
        }

        const irisWidth = Math.sqrt(
          Math.pow(landmarks[IRIS_RIGHT].x - landmarks[IRIS_LEFT].x, 2) +
            Math.pow(landmarks[IRIS_RIGHT].y - landmarks[IRIS_LEFT].y, 2)
        )
        const pctStr = (irisWidth * 100).toFixed(1) + '%'
        irisSizeRef.current = pctStr
        if (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
          setIrisSizePct(pctStr)
        }

        ctx.strokeStyle = '#00d4ff'
        ctx.lineWidth = 2
        ;[leftIris, rightIris].forEach((eye) => {
          ctx.beginPath()
          ctx.arc(
            eye.x * canvas.width,
            eye.y * canvas.height,
            irisWidth * canvas.width * 0.6,
            0,
            2 * Math.PI
          )
          ctx.stroke()
        })
      }
      ctx.restore()
    },
    [isCalibrating, examRunning, threshold]
  )

  const runExam = useCallback(async () => {
    setExamRunning(true)
    setExamBtnDisabled(true)
    examSaccadePeaksRef.current = []
    const positions = [
      { left: '10%', top: '50%' },
      { left: '90%', top: '50%' },
    ]

    const chart = chartInstanceRef.current as unknown as {
      data: { labels: string[]; datasets: Array<{ data: number[] }> }
      update: (mode?: string) => void
    } | null
    if (chart) {
      chart.data.labels = []
      chart.data.datasets[0].data = []
      chart.data.datasets[1].data = []
      chart.update()
    }

    setStatusText('PHASE 1: SACCADIC TRIALS (TRACK THE DOT)')
    setShowTargetDot(true)

    for (let i = 0; i < EXAM_CYCLES; i++) {
      for (const pos of positions) {
        setTargetPosition(pos)
        let currentPeak = 0
        peakTrackerRef.current = setInterval(() => {
          const vel = liveVelocityRef.current
          if (vel > currentPeak) currentPeak = vel
        }, PEAK_TRACK_INTERVAL_MS)
        await new Promise((r) => setTimeout(r, EXAM_POSITION_DURATION_MS))
        if (peakTrackerRef.current) {
          clearInterval(peakTrackerRef.current)
          peakTrackerRef.current = null
        }
        if (currentPeak > 0) examSaccadePeaksRef.current.push(currentPeak)
      }
    }

    setShowTargetDot(false)
    setExamRunning(false)

    const peaks = examSaccadePeaksRef.current
    const avgPeak = peaks.reduce((a, b) => a + b, 0) / peaks.length || 0
    setFinalSaccadeAvg(avgPeak.toFixed(2))
    const isDepressed = avgPeak < threshold * DEPRESSION_MULTIPLIER || forceFailRef.current
    setResultNormal(!isDepressed)
    setResultPillText(isDepressed ? 'CNS DEPRESSION DETECTED' : 'CNS STATUS: STABLE')
    setResultHeaderText(isDepressed ? 'ABNORMAL' : 'NORMAL')
    setShowResultsModal(true)
    setExamBtnDisabled(false)
  }, [threshold])

  const handleCalibrate = useCallback(() => {
    setIsCalibrating(true)
    setCalibDone(false)
    calibDataRef.current = []
    setStatusText('CALIBRATING BASELINE NOISE... REMAIN STILL')
    setExamBtnDisabled(true)
    setTimeout(() => {
      setIsCalibrating(false)
      const data = calibDataRef.current
      const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0.25
      const newThreshold = avg + THRESHOLD_OFFSET
      setThreshold(newThreshold)
      setStatusText(`CALIBRATION COMPLETE. BASELINE: ${newThreshold.toFixed(2)}. READY.`)
      setExamBtnDisabled(false)
      setCalibDone(true)
    }, CALIBRATION_DURATION_MS)
  }, [])

  useEffect(() => {
    const faceMesh = createFaceMesh()
    if (!faceMesh) return
    faceMeshRef.current = faceMesh
    faceMesh.onResults(onResults)
  }, [onResults])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') forceFailRef.current = true
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const faceMesh = faceMeshRef.current
    if (!video || !faceMesh) return
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (cancelled) return
      video.srcObject = stream
      video.onloadedmetadata = () => {
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        let sendInFlight = false
        const process = () => {
          if (cancelled || !faceMeshRef.current) return
          const now = performance.now()
          if (
            !sendInFlight &&
            now - lastDetectionRef.current >= DETECTION_INTERVAL_MS
          ) {
            lastDetectionRef.current = now
            sendInFlight = true
            faceMeshRef.current
              .send({ image: video })
              .catch(() => {})
              .finally(() => {
                sendInFlight = false
              })
          }
          processRafRef.current = requestAnimationFrame(process)
        }
        process()
      }
    }).catch(() => setStatusText('Camera access failed.'))
    return () => {
      cancelled = true
      if (processRafRef.current) cancelAnimationFrame(processRafRef.current)
    }
  }, [])

  const handleDismissResults = () => {
    setShowResultsModal(false)
    forceFailRef.current = false
  }

  const handleContinue = () => {
    onNavigate('vocal')
  }

  return (
    <>
      <AnimatedBackground />
      <section className="relative z-10 min-h-screen flex flex-col p-6">
        <motion.a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate('intake') }}
          className="inline-flex items-center gap-2 text-aura-muted text-sm mb-4 hover:text-aura-teal transition-colors self-start"
          whileHover={{ x: -2 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.a>
        <ProgressSteps active={1} steps={4} />

        <div className="bg-aura-glass/80 backdrop-blur border border-aura-border rounded-xl px-4 py-3 text-center text-aura-teal font-semibold tracking-wide mb-6">
          {statusText}
        </div>

        {/* Target dot - fixed position, logic from eyetrack.html */}
        {showTargetDot && (
          <div
            className="fixed w-8 h-8 rounded-full bg-aura-red border-2 border-white shadow-[0_0_20px_#ff4444] z-[100] pointer-events-none"
            style={{ left: targetPosition.left, top: targetPosition.top, transform: 'translate(-50%, -50%)' }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[640px_400px] gap-6 max-w-4xl mx-auto w-full">
          {/* Video + canvas - same as eyetrack #video-box */}
          <GlassCard className="overflow-hidden p-0 aspect-video max-h-[480px] bg-black">
            <div className="relative w-full h-full min-h-[300px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                style={{ display: 'none' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          </GlassCard>

          {/* Side panel - graph + metrics + buttons */}
          <div className="flex flex-col gap-4">
            <GlassCard className="flex-1 min-h-[200px] flex flex-col">
              <div className="flex-1 min-h-[180px] relative">
                <canvas ref={chartRef} className="absolute inset-0 w-full h-full" />
              </div>
            </GlassCard>
            <div className="grid grid-cols-2 gap-3">
              <GlassCard className="border-l-4 border-l-aura-teal">
                <span className="text-xs text-aura-muted uppercase tracking-wider">LIVE VELOCITY</span>
                <span className="block text-2xl font-bold text-white mt-1">{liveVelocity}</span>
              </GlassCard>
              <GlassCard className="border-l-4 border-l-aura-teal">
                <span className="text-xs text-aura-muted uppercase tracking-wider">IRIS SIZE (%)</span>
                <span className="block text-2xl font-bold text-white mt-1">{irisSizePct}</span>
              </GlassCard>
            </div>
            <div className="flex flex-col gap-3">
              <AuraButton
                primary={!calibDone}
                onClick={handleCalibrate}
                disabled={isCalibrating}
                className={calibDone ? '!bg-aura-border !text-aura-muted' : ''}
              >
                {calibDone ? 'Calibrated ✓' : '1. Calibrate Baseline'}
              </AuraButton>
              <AuraButton
                primary={calibDone}
                onClick={runExam}
                disabled={examBtnDisabled}
              >
                2. Start AURA Exam (30s)
              </AuraButton>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <AuraButton onClick={handleContinue}>Continue to Vocal Test</AuraButton>
        </div>
      </section>

      {/* Results modal - logic from eyetrack.html */}
      {showResultsModal && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={handleDismissResults} />
          <motion.div
            className="relative w-full max-w-md bg-aura-card border-2 border-aura-green rounded-2xl p-8 text-center shadow-[0_0_100px_rgba(0,255,136,0.2)]"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <h2 className="text-aura-muted text-sm font-semibold uppercase tracking-wider mb-2">
              DIAGNOSTIC RESULT
            </h2>
            <div
              className={`inline-block px-8 py-3 rounded-full font-bold text-lg my-4 ${
                resultNormal
                  ? 'bg-aura-green text-aura-deep shadow-[0_0_30px_#00ff88]'
                  : 'bg-aura-red text-white shadow-[0_0_30px_#ff4444]'
              }`}
            >
              {resultPillText}
            </div>
            <h1
              className={`text-2xl font-bold ${resultNormal ? 'text-aura-green' : 'text-aura-red'}`}
            >
              {resultHeaderText}
            </h1>
            {finalSaccadeAvg && (
              <p className="text-aura-muted text-sm mt-2">Avg saccade peak: {finalSaccadeAvg}</p>
            )}
            <p className="text-aura-muted mt-4">
              Ocular kinematics fall within physiological baseline thresholds.
            </p>
            <button
              type="button"
              onClick={handleDismissResults}
              className="mt-6 w-full py-3 rounded-xl bg-aura-border text-white font-semibold hover:bg-aura-glass transition-colors"
            >
              DISMISS & RESET
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
