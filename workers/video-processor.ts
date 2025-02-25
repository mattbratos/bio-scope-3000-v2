import { analyzeFrame } from "../lib/ai-service"

interface ProcessFrameMessage {
  type: "PROCESS_FRAME"
  frame: HTMLVideoElement | HTMLCanvasElement // Changed from string to HTML element
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

// Create an offscreen canvas for processing
const canvas = new OffscreenCanvas(1, 1)
const context = canvas.getContext('2d')!

ctx.addEventListener("message", async (e: MessageEvent) => {
  const { type, frame, timestamp, frameId } = e.data as ProcessFrameMessage

  if (type === "PROCESS_FRAME") {
    try {
      // Resize canvas if needed
      if (canvas.width !== frame.width || canvas.height !== frame.height) {
        canvas.width = frame.width
        canvas.height = frame.height
      }

      // Draw the frame onto the canvas
      context.drawImage(frame, 0, 0)

      // Process the frame with AI
      const result = await analyzeFrame(canvas)

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

