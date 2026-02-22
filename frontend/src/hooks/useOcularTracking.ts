import { useRef, useCallback, useEffect, useState, type RefObject } from 'react'
import {
  getFaceLandmarker,
  detectFace,
  calculateGazeDeviation,
  computeOcularMetrics,
  type OcularTestMetrics,
} from '../lib/faceLandmarker'

export type OcularTrackingState = 'idle' | 'loading' | 'recording' | 'error'

type UseOcularTrackingOptions = {
  videoRef: RefObject<HTMLVideoElement | null>
  containerRef: RefObject<HTMLElement | null>
  getDotPosition: () => { x: number; y: number } | null
  enabled: boolean
}

// Number of frames collected at the start to establish the neutral-gaze baseline.
// The dot starts at center (t=0 in the figure-8), so these frames capture the
// iris offset when the user is looking straight at the center of the container.
const CALIBRATION_FRAMES = 10

export function useOcularTracking({
  videoRef,
  containerRef,
  getDotPosition,
  enabled,
}: UseOcularTrackingOptions) {
  const [state, setState] = useState<OcularTrackingState>('idle')
  const [testMetrics, setTestMetrics] = useState<OcularTestMetrics | null>(null)
  const [liveDeviation, setLiveDeviation] = useState<number | null>(null)
  const deviationsRef = useRef<number[]>([])
  const startTimeRef = useRef<number>(0)
  const endTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const landmarkerRef = useRef<Awaited<ReturnType<typeof getFaceLandmarker>> | null>(null)
  const liveDeviationRef = useRef<number | null>(null)

  // Calibration: stores the average iris offset observed during the first CALIBRATION_FRAMES
  // frames while the dot is at center. Subtracted from all subsequent frames to zero out
  // the constant Y bias (iris naturally sits above eye-socket center) and any baseline X offset.
  const calibrationRef = useRef<{ x: number; y: number } | null>(null)
  const calibBufferRef = useRef<{ x: number; y: number }[]>([])

  const startRecording = useCallback(async () => {
    if (!videoRef.current) return
    setState('loading')
    deviationsRef.current = []
    calibrationRef.current = null
    calibBufferRef.current = []
    setTestMetrics(null)
    setLiveDeviation(null)
    liveDeviationRef.current = null
    startTimeRef.current = performance.now()
    console.log('🟢 [OCULAR TEST] Starting test... (15 seconds)')
    try {
      const landmarker = await getFaceLandmarker()
      landmarkerRef.current = landmarker
      setState('recording')
    } catch (e) {
      console.error('Face landmarker failed to load', e)
      setState('error')
    }
  }, [videoRef])

  const stopRecording = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    endTimeRef.current = performance.now()
    setState('idle')
    liveDeviationRef.current = null

    const deviations = deviationsRef.current
    const metrics = computeOcularMetrics(deviations, startTimeRef.current, endTimeRef.current)
    setTestMetrics(metrics)
    setLiveDeviation(null)

    console.log('🔴 [OCULAR TEST] Test completed!')
    console.log('📊 Final Metrics:', metrics)
    console.log('📋 JSON for Gemini API:', JSON.stringify(metrics, null, 2))

    return metrics
  }, [])

  useEffect(() => {
    if (!enabled || state !== 'recording' || !videoRef.current || !landmarkerRef.current || !containerRef.current) return

    console.log('🎯 [OCULAR] Detection loop starting... (10 Hz to preserve FPS)')

    let lastDetectTime = 0
    let lastDebugLogTime = 0
    let detectionAttempts = 0
    let successfulDetections = 0
    const INTERVAL_MS = 100 // 10 Hz detection
    const DEBUG_INTERVAL_MS = 1000
    let pendingDetection = false

    const tick = async () => {
      const video = videoRef.current
      const landmarker = landmarkerRef.current
      const pos = getDotPosition()
      if (!video || !landmarker || !pos) {
        console.warn('[OCULAR] Missing video, landmarker, or dot position')
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const now = performance.now()

      if (now - lastDetectTime >= INTERVAL_MS && !pendingDetection) {
        lastDetectTime = now
        detectionAttempts++
        pendingDetection = true

        const container = containerRef.current
        const cw = container?.offsetWidth ?? 0
        const ch = container?.offsetHeight ?? 0
        detectFace(landmarker, video, pos, cw, ch)
          .then(result => {
            if (result) {
              // --- Calibration phase ---
              // Collect the first CALIBRATION_FRAMES to establish neutral-gaze baseline.
              // During this time the dot is near center, so these frames capture the
              // constant iris offset (Y bias etc.) that we subtract from all later frames.
              if (!calibrationRef.current) {
                calibBufferRef.current.push(result.gazePosition)
                if (calibBufferRef.current.length >= CALIBRATION_FRAMES) {
                  const buf = calibBufferRef.current
                  calibrationRef.current = {
                    x: buf.reduce((s, p) => s + p.x, 0) / buf.length,
                    y: buf.reduce((s, p) => s + p.y, 0) / buf.length,
                  }
                  console.log(`🎯 [OCULAR] Calibration complete: baseline=(${calibrationRef.current.x.toFixed(3)}, ${calibrationRef.current.y.toFixed(3)})`)
                }
                pendingDetection = false
                return // Don't count calibration frames as test data
              }

              // --- Post-calibration: compute deviation relative to neutral gaze ---
              successfulDetections++
              const calib = calibrationRef.current
              const calibratedGaze = {
                x: result.gazePosition.x - calib.x,
                y: result.gazePosition.y - calib.y,
              }
              const deviation = calculateGazeDeviation(calibratedGaze, pos, cw, ch)

              deviationsRef.current.push(deviation)
              const maxLen = 500
              if (deviationsRef.current.length > maxLen) {
                deviationsRef.current = deviationsRef.current.slice(-maxLen)
              }
              liveDeviationRef.current = deviation

              if (successfulDetections === 1) {
                console.log(`✅ [OCULAR] First post-calib frame: CalibratedGaze=(${calibratedGaze.x.toFixed(3)}, ${calibratedGaze.y.toFixed(3)}) | Deviation: ${deviation.toFixed(4)}`)
              }
              if (successfulDetections % 30 === 0) {
                console.log(`[OCULAR] Frame ${successfulDetections}: CalibratedGaze=(${calibratedGaze.x.toFixed(3)}, ${calibratedGaze.y.toFixed(3)}) | Dot=(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}) | Dev=${deviation.toFixed(4)}`)
              }
            }
            pendingDetection = false
          })
          .catch(e => {
            console.error('[OCULAR] Detection error:', e)
            pendingDetection = false
          })
      }

      // Debug logging every 1 second
      if (now - lastDebugLogTime >= DEBUG_INTERVAL_MS) {
        lastDebugLogTime = now
        const deviations = deviationsRef.current
        const elapsedSecs = (now - startTimeRef.current) / 1000
        const vid = videoRef.current
        const calibStatus = calibrationRef.current ? 'ready' : `building (${calibBufferRef.current.length}/${CALIBRATION_FRAMES})`

        console.log(`[OCULAR TEST] ${elapsedSecs.toFixed(1)}s | Attempts: ${detectionAttempts} | Success: ${successfulDetections}/${detectionAttempts} | Frames: ${deviations.length} | Calib: ${calibStatus} | Video: ready=${vid?.readyState} w=${vid?.videoWidth} h=${vid?.videoHeight}`)

        if (deviations.length > 0) {
          const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length
          const maxDeviation = Math.max(...deviations)
          const failures = deviations.filter(d => d > 0.25).length
          const fps = deviations.length / elapsedSecs

          console.log(
            `  → FPS: ${fps.toFixed(1)} | Avg Dev: ${avgDeviation.toFixed(4)} | Max Dev: ${maxDeviation.toFixed(4)} | Failures (>0.25): ${failures}`
          )
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const successRate = detectionAttempts > 0 ? ((successfulDetections/detectionAttempts)*100).toFixed(1) : '0'
      console.log('🎯 [OCULAR] Detection loop stopped', { detectionAttempts, successfulDetections, successRate: `${successRate}%` })
    }
  }, [enabled, state, videoRef, containerRef, getDotPosition])

  // Push live deviation from ref to state on a timer (never setState from inside async RAF)
  useEffect(() => {
    if (state !== 'recording') return
    const interval = setInterval(() => {
      if (liveDeviationRef.current != null) {
        setLiveDeviation(liveDeviationRef.current)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [state])

  return { state, testMetrics, liveDeviation, startRecording, stopRecording }
}
