"use client"

import { useEffect, useRef, useState } from "react"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import { DetectedObjectsCard } from "./DetectedObjectsCard"
import { ANIMAL_CLASSES } from "@/config/animals"

interface VideoObjectDetectionProps {
  videoUrl: string
}

export function VideoObjectDetection({ videoUrl }: VideoObjectDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [detections, setDetections] = useState<Record<string, number>>({})
  const animationFrameId = useRef<number>()

  // Initialize TensorFlow.js
  useEffect(() => {
    async function initTF() {
      try {
        console.log("🔄 Initializing TensorFlow.js...")
        await tf.ready()
        const backend = tf.getBackend()
        console.log(`✅ TensorFlow.js initialized with backend: ${backend}`)
      } catch (error) {
        console.error("❌ Failed to initialize TensorFlow.js:", error)
      }
    }
    initTF()
  }, [])

  // Load the COCO-SSD model
  useEffect(() => {
    async function loadModel() {
      try {
        console.log("🔄 Loading COCO-SSD model...")
        // Try different model configurations if needed
        const modelConfig = {
          base: 'mobilenet_v2', // Try this instead of lite_mobilenet_v2
          modelUrl: undefined // Let it use the default URL
        }
        const loadedModel = await cocoSsd.load(modelConfig)
        console.log("✅ COCO-SSD model loaded successfully")
        setModel(loadedModel)
        setIsLoading(false)
      } catch (error) {
        console.error("❌ Failed to load COCO-SSD model:", error)
        setIsLoading(false)
      }
    }
    loadModel()
  }, [])

  // Handle video detection
  useEffect(() => {
    if (!model || !videoRef.current) {
      console.log("⚠️ Missing requirements:", { hasModel: !!model, hasVideo: !!videoRef.current })
      return
    }

    const detectFrame = async () => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) {
        console.log("⚠️ Video not ready:", {
          exists: !!video,
          paused: video?.paused,
          ended: video?.ended,
          readyState: video?.readyState
        })
        return
      }

      try {
        console.log("🔍 Running detection on frame at time:", video.currentTime, {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState
        })

        const predictions = await model.detect(video)
        console.log("📊 Raw predictions:", predictions)
        
        // Filter for animals and count occurrences
        const counts: Record<string, number> = {}
        predictions.forEach(({ class: className, score }) => {
          console.log(`🎯 Checking detection: ${className} (confidence: ${score})`)
          // Only include animal predictions with confidence > 0.5
          if (score > 0.5 && ANIMAL_CLASSES.has(className)) {
            console.log(`✅ Found animal: ${className}`)
            counts[className] = (counts[className] || 0) + 1
          } else if (ANIMAL_CLASSES.has(className)) {
            console.log(`❌ Animal ${className} detected but confidence too low: ${score}`)
          }
        })
        
        console.log("🐾 Final animal counts:", counts)
        setDetections(counts)
      } catch (error) {
        console.error("❌ Detection error:", error)
      }
      
      // Schedule next frame
      animationFrameId.current = requestAnimationFrame(detectFrame)
    }

    // Start detection when video plays
    const onPlay = () => {
      console.log("▶️ Video started playing")
      animationFrameId.current = requestAnimationFrame(detectFrame)
    }

    const onLoadedData = () => {
      console.log("📼 Video data loaded:", {
        duration: videoRef.current?.duration,
        size: `${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}`,
        readyState: videoRef.current?.readyState
      })
    }

    video.addEventListener("play", onPlay)
    video.addEventListener("loadeddata", onLoadedData)

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
      video.removeEventListener("play", onPlay)
      video.removeEventListener("loadeddata", onLoadedData)
    }
  }, [model])

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full rounded-lg"
        controls
        crossOrigin="anonymous"
        playsInline // Add this to ensure better compatibility
      />
      <DetectedObjectsCard detections={detections} isLoading={isLoading} />
    </div>
  )
} 