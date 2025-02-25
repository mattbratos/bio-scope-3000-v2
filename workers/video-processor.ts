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
    category: "static" | "dynamic"
  }>
}

const ctx: Worker = self as any

ctx.addEventListener("message", async (e: MessageEvent) => {
  const { type, frame, timestamp, frameId } = e.data as ProcessFrameMessage

  if (type === "PROCESS_FRAME") {
    try {
      // Process the frame with AI
      const result = await analyzeFrame(frame)

      // Ensure all objects have proper categorization
      const processedObjects = result.objects.map((obj) => ({
        ...obj,
        category: obj.category || "static", // Fallback to static if category is missing
      }))

      const processingResult: ProcessingResult = {
        frameId,
        timestamp,
        objects: processedObjects,
      }

      ctx.postMessage({
        type: "FRAME_PROCESSED",
        result: processingResult,
      })
    } catch (error) {
      ctx.postMessage({
        type: "ERROR",
        error: error instanceof Error ? error.message : "Unknown error",
        frameId,
      })
    }
  }
})

