/// <reference types="vite/client" />

declare global {
  interface Window {
    FaceMesh: new (config: { locateFile: (file: string) => string }) => {
      setOptions: (opts: { maxNumFaces: number; refineLandmarks: boolean; minDetectionConfidence: number }) => void
      onResults: (cb: (results: FaceMeshResults) => void) => void
      send: (input: { image: HTMLVideoElement }) => Promise<void>
    }
    Chart: unknown
  }
}

export interface FaceMeshResults {
  image: HTMLVideoElement | HTMLImageElement
  multiFaceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>
}
