import { analyzeFrame } from "../lib/ai-service"

interface ProcessFrameMessage {
  type: "PROCESS_FRAME"
  frame: string // base64 image
  timestamp: number
  frameId: string
}

interface ProcessingResult {
  frameId: string
  timestamp: number
  objects: Array<{
    label: string
    confidence: number
    bbox: [number, number, number, number]
  }>
}

self.onmessage = async (e: MessageEvent) => {
  const { type, frame, timestamp, frameId } = e.data as ProcessFrameMessage

  if (type === "PROCESS_FRAME") {
    try {
      const result = await analyzeFrame(frame)

      const processingResult: ProcessingResult = {
        frameId,
        timestamp,
        objects: result.objects,
      }

      self.postMessage({
        type: "FRAME_PROCESSED",
        result: processingResult,
      })
    } catch (error) {
      self.postMessage({
        type: "ERROR",
        error: error.message,
        frameId,
      })
    }
  }
}

