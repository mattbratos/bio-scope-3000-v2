"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { UploadCloud, Loader2 } from "lucide-react"
import { CanvasEditor } from "../Canvas/Editor"
import { Timeline } from "../ui/Timeline"
import { SegmentationTools } from "../SegmentationTools"
import { StatisticsCard } from "../StatisticsCard"
import { DetectedObjectsCard } from "../DetectedObjectsCard"
import type { ProcessedVideoData, FrameData, Point, Mask, ExportData } from "@/types"
import { ResolutionManager } from "./ResolutionManager"
import { VideoProcessor as AIProcessor } from "@/lib/video-processor"
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import { ANIMAL_CLASSES } from "@/config/animals"

export function VideoProcessor() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [processedData, setProcessedData] = useState<ProcessedVideoData | null>(null)
  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedMask, setSelectedMask] = useState<Mask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detections, setDetections] = useState<Record<string, number>>({})
  const [persistentAnimals, setPersistentAnimals] = useState<Record<string, { count: number, lastConfidence: number }>>({})
  const [isModelLoading, setIsModelLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const processorRef = useRef<AIProcessor | null>(null)
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const [resolution, setResolution] = useState({ width: 0, height: 0 })

  // Initialize TensorFlow.js backend
  useEffect(() => {
    async function initTF() {
      try {
        console.log("🔄 Initializing TensorFlow.js backend...")
        await tf.ready()
        console.log("✅ TensorFlow.js backend initialized:", tf.getBackend())
      } catch (error) {
        console.error("❌ Failed to initialize TensorFlow.js backend:", error)
      }
    }
    initTF()
  }, [])

  // Load COCO-SSD model
  useEffect(() => {
    async function loadModel() {
      try {
        // Make sure TensorFlow.js is ready
        await tf.ready()
        console.log("🔄 Loading COCO-SSD model...")
        const model = await cocoSsd.load({
          base: 'mobilenet_v2'  // Use full model for better accuracy
        })
        modelRef.current = model
        setIsModelLoading(false)
        console.log("✅ COCO-SSD model loaded successfully")
      } catch (error) {
        console.error("❌ Failed to load COCO-SSD model:", error)
        setIsModelLoading(false)
      }
    }
    loadModel()
  }, [])

  // Initialize AI processor
  useEffect(() => {
    processorRef.current = new AIProcessor()
    processorRef.current.onFrameProcessed = async (result) => {
      if (!currentFrame || !modelRef.current || !videoRef.current) {
        console.log("⚠️ Missing requirements for detection:", {
          hasCurrentFrame: !!currentFrame,
          hasModel: !!modelRef.current,
          hasVideo: !!videoRef.current
        })
        return
      }

      try {
        // Run animal detection on the current frame
        console.log("🔍 Running detection on frame at time:", videoRef.current.currentTime)
        const predictions = await modelRef.current.detect(videoRef.current)
        console.log("📊 Raw predictions:", predictions)
        
        // Filter and count animal detections
        const currentFrameAnimals: Record<string, { count: number, confidence: number }> = {}
        
        // First, process current frame detections
        predictions.forEach(({ class: className, score }) => {
          console.log(`🎯 Checking detection: ${className} (confidence: ${score})`)
          if (score > 0.5 && ANIMAL_CLASSES.has(className)) {
            console.log(`✅ Found animal: ${className} with high confidence`)
            currentFrameAnimals[className] = {
              count: (currentFrameAnimals[className]?.count || 0) + 1,
              confidence: score
            }
          } else if (ANIMAL_CLASSES.has(className)) {
            console.log(`ℹ️ Animal ${className} detected with lower confidence: ${score}`)
          }
        })

        // Update persistent animals
        setPersistentAnimals(prev => {
          const newPersistentAnimals = { ...prev }

          // Add or update animals from current frame
          Object.entries(currentFrameAnimals).forEach(([animal, data]) => {
            newPersistentAnimals[animal] = {
              count: data.count,
              lastConfidence: data.confidence
            }
          })

          // Keep existing animals that weren't in current frame but had high confidence
          Object.entries(prev).forEach(([animal, data]) => {
            if (!currentFrameAnimals[animal] && data.lastConfidence > 0.5) {
              newPersistentAnimals[animal] = data
            }
          })

          return newPersistentAnimals
        })

        // Set detections combining current frame and persistent animals
        const combinedDetections: Record<string, number> = {}
        Object.entries(persistentAnimals).forEach(([animal, data]) => {
          if (data.lastConfidence > 0.5) {
            combinedDetections[animal] = data.count
          }
        })
        
        console.log("🐾 Final animal counts (including persistent):", combinedDetections)
        setDetections(combinedDetections)

        // Use all predictions for segmentation
        const objects = predictions.map(pred => ({
          label: pred.class,
          confidence: pred.score,
          bbox: [pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]] as [number, number, number, number],
          category: ANIMAL_CLASSES.has(pred.class) ? "dynamic" : "static"
        }))

        setCurrentFrame((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            segmentation: {
              masks: objects.map((obj) => ({
                id: `mask-${Math.random()}`,
                points: convertBBoxToPoints(obj.bbox),
                label: obj.label,
                confidence: obj.confidence,
                category: obj.category,
              })),
              labels: objects.map((obj) => obj.label),
              confidence: objects.map((obj) => obj.confidence),
            },
          }
        })
      } catch (error) {
        console.error("❌ Error during animal detection:", error)
      }
    }

    return () => {
      processorRef.current = null
    }
  }, [currentFrame])

  // Add debug log to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      console.log("▶️ Video started playing")
      console.log("Video properties:", {
        currentTime: video.currentTime,
        duration: video.duration,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      })
    }

    video.addEventListener('play', handlePlay)
    return () => video.removeEventListener('play', handlePlay)
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setVideoFile(file)
    setError(null)

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }

    const url = URL.createObjectURL(file)
    setVideoUrl(url)

    const video = videoRef.current
    if (!video) return

    video.src = url

    try {
      // Wait for video metadata to load
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
      })

      // Set up resolution manager
      const resManager = new ResolutionManager(video.videoWidth, video.videoHeight)
      const processRes = resManager.getProcessingResolution()
      setResolution(processRes)

      // Create frames at regular intervals (10 fps)
      const fps = 10
      const frameCount = Math.ceil(video.duration * fps)
      const interval = 1 / fps
      const frames: FrameData[] = Array.from({ length: frameCount }, (_, i) => ({
        id: `frame-${i}`,
        timestamp: i * interval,
        segmentation: {
          masks: [],
          labels: [],
          confidence: [],
        },
        thumbnail: "/placeholder.svg?height=90&width=160",
      }))

      setProcessedData({
        frames,
        duration: video.duration,
        resolution: processRes,
      })
      setCurrentFrame(frames[0])
    } catch (error) {
      console.error("Error loading video:", error)
      setError(error instanceof Error ? error.message : "Failed to load video file")
    }
  }

  const handleProcessVideo = async () => {
    if (!videoRef.current || !processorRef.current || !processedData) return

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // Process each frame
      for (let i = 0; i < processedData.frames.length; i++) {
        const frame = processedData.frames[i]
        const frameImage = await processorRef.current.extractFrame(videoRef.current, frame.timestamp)

        await processorRef.current.processFrame(frameImage, frame.timestamp, frame.id)

        const progress = ((i + 1) / processedData.frames.length) * 100
        setProgress(progress)
      }
    } catch (error) {
      console.error("Error processing video:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSeek = useCallback(
    (time: number) => {
      setCurrentTime(time)
      if (!processedData) return

      const frame = processedData.frames.find((f) => Math.abs(f.timestamp - time) < 0.1)
      if (frame) {
        setCurrentFrame(frame)
      }

      if (videoRef.current) {
        videoRef.current.currentTime = time
      }
    },
    [processedData],
  )

  const handleMaskUpdate = useCallback(
    (maskId: string, points: Point[]) => {
      if (!currentFrame) return

      setCurrentFrame((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          segmentation: {
            ...prev.segmentation,
            masks: [
              ...prev.segmentation.masks,
              {
                id: maskId,
                points,
                label: "New Object",
                confidence: 1,
                category: "static",
              },
            ],
          },
        }
      })
    },
    [currentFrame],
  )

  const handleMaskSelect = useCallback((mask: Mask) => {
    setSelectedMask(mask)
  }, [])

  const handleMaskEdit = useCallback(
    (maskId: string, updates: Partial<Mask>) => {
      if (!currentFrame) return

      setCurrentFrame((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          segmentation: {
            ...prev.segmentation,
            masks: prev.segmentation.masks.map((mask) => (mask.id === maskId ? { ...mask, ...updates } : mask)),
          },
        }
      })
    },
    [currentFrame],
  )

  const handleMaskDelete = useCallback(
    (maskId: string) => {
      if (!currentFrame) return

      setCurrentFrame((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          segmentation: {
            ...prev.segmentation,
            masks: prev.segmentation.masks.filter((mask) => mask.id !== maskId),
          },
        }
      })
      setSelectedMask(null)
    },
    [currentFrame],
  )

  const handleExport = useCallback(() => {
    if (!processedData) return

    try {
      const exportData: ExportData = {
        metadata: {
          duration: processedData.duration,
          resolution: processedData.resolution,
          processedAt: new Date().toISOString(),
        },
        frames: processedData.frames.map((frame) => ({
          timestamp: frame.timestamp,
          objects: frame.segmentation.masks.map((mask) => ({
            label: mask.label,
            category: mask.category,
            confidence: mask.confidence,
            points: mask.points,
          })),
        })),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "video-analysis.json"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting data:", error)
      setError("Failed to export analysis results")
    }
  }, [processedData])

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  return (
    <div className="container mx-auto px-4 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-4 md:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="flex-1"
                disabled={isProcessing}
              />
              <Button onClick={handleProcessVideo} disabled={!videoFile || isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Process Video
                  </>
                )}
              </Button>
            </div>

            {error && <div className="text-red-500">{error}</div>}

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">{Math.round(progress)}% complete</p>
              </div>
            )}

            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full"
                controls
                crossOrigin="anonymous"
                style={{ display: currentFrame ? "block" : "none" }}
              />
              {currentFrame && (
                <CanvasEditor
                  frame={currentFrame}
                  resolution={resolution}
                  onMaskUpdate={handleMaskUpdate}
                  onMaskSelect={handleMaskSelect}
                />
              )}
            </div>

            {processedData && (
              <Timeline
                frames={processedData.frames}
                duration={processedData.duration}
                currentTime={currentTime}
                onSeek={handleSeek}
              />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <DetectedObjectsCard detections={detections} isLoading={isModelLoading} />
          <SegmentationTools
            selectedMask={selectedMask}
            onUpdateMask={handleMaskEdit}
            onDeleteMask={handleMaskDelete}
            onExport={handleExport}
          />
          <StatisticsCard currentFrame={currentFrame} />
        </div>
      </div>
    </div>
  )
}

function convertBBoxToPoints(bbox: [number, number, number, number]): Point[] {
  const [x, y, width, height] = bbox
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

