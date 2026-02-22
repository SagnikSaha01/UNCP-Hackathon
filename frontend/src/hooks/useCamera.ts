import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser')
      setStatus('error')
      return false
    }
    setStatus('requesting')
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      setStream(mediaStream)
      setStatus('active')
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not access camera'
      setError(message)
      setStatus('error')
      return false
    }
  }, [])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setStatus('idle')
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return { status, error, stream, start, stop }
}
