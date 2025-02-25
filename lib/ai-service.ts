import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import { NATURE_CATEGORIES } from "@/config/animals"

interface DetectedObject {
  label: string
  confidence: number
  bbox: [number, number, number, number] // [x, y, width, height]
  category: "static" | "dynamic"
}

interface AnalyzeFrameResult {
  objects: DetectedObject[]
}

let model: cocoSsd.ObjectDetection | null = null

async function ensureModel() {
  if (!model) {
    await tf.ready()
    model = await cocoSsd.load({
      base: 'lite_mobilenet_v2'
    })
  }
  return model
}

export async function analyzeFrame(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<AnalyzeFrameResult> {
  try {
    const detector = await ensureModel()
    const predictions = await detector.detect(imageElement)

    // Convert predictions to our format
    const objects = predictions.map(pred => {
      const label = pred.class.toLowerCase()
      const category = NATURE_CATEGORIES.static.some((item) => label.includes(item))
        ? "static"
        : NATURE_CATEGORIES.dynamic.some((item) => label.includes(item))
          ? "dynamic"
          : "static" // Default to static if uncertain

      return {
        label: pred.class,
        confidence: pred.score,
        bbox: [pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]] as [number, number, number, number],
        category
      }
    })

    return { objects }
  } catch (error) {
    console.error("Error analyzing frame:", error)
    throw error
  }
}

