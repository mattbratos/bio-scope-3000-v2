"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { UploadCloud, Loader2 } from "lucide-react"
import { CanvasEditor } from "../Canvas/Editor"
import { Timeline } from "../UI/Timeline"
import { SegmentationTools } from "../SegmentationTools"
import { StatisticsCard } from "../StatisticsCard"
import type { ProcessedVideoData, FrameData, Point, Mask, ExportData } from "@/types"
import { ResolutionManager } from "./ResolutionManager"
import { VideoProcessor as AIProcessor } from "@/lib/video-processor"

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const processorRef = useRef<AIProcessor | null>(null)
  const [resolution, setResolution] = useState({ width: 0, height: 0 })

  // Initialize AI processor
  useEffect(() => {
    processorRef.current = new AIProcessor()
    processorRef.current.onFrameProcessed = (result) => {
      if (!currentFrame) return

      // Add some initial test data if no objects were detected
      const objects =
        result.objects.length > 0
          ? result.objects
          : [
              {
                label: "Bear",
                confidence: 0.95,
                bbox: [100, 100, 200, 150],
                category: "dynamic",
              },
              {
                label: "Tree",
                confidence: 0.98,
                bbox: [300, 50, 100, 300],
                category: "static",
              },
              {
                label: "Tree",
                confidence: 0.97,
                bbox: [450, 75, 120, 280],
                category: "static",
              },
            ]

      setCurrentFrame((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          segmentation: {
            masks: objects.map((obj: any) => ({
              id: `mask-${Math.random()}`,
              points: convertBBoxToPoints(obj.bbox),
              label: obj.label,
              confidence: obj.confidence,
              category: obj.category,
            })),
            labels: objects.map((obj: any) => obj.label),
            confidence: objects.map((obj: any) => obj.confidence),
          },
        }
      })
    }

    return () => {
      processorRef.current = null
    }
  }, [currentFrame])

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
    <div className="container mx-auto p-4 space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input type="file" accept="video/*" onChange={handleFileChange} className="max-w-sm" />
            <Button disabled={!videoFile || isProcessing} onClick={handleProcessVideo}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing
                </>
              ) : (
                "Process Video"
              )}
            </Button>
          </div>
          {isProcessing && processedData && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing frames...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">
                Processed {Math.floor((processedData.frames.length * progress) / 100)} of {processedData.frames.length}{" "}
                frames
              </p>
            </div>
          )}
          {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          {!videoFile && !error && (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Upload a video file to begin processing</p>
            </div>
          )}
        </div>
      </Card>

      {processedData && currentFrame && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <CanvasEditor
              frame={currentFrame}
              width={resolution.width}
              height={resolution.height}
              onMaskUpdate={handleMaskUpdate}
              onMaskSelect={handleMaskSelect}
              videoUrl={videoUrl}
              currentTime={currentTime}
            />
            <Timeline
              frames={processedData.frames}
              currentTime={currentTime}
              duration={processedData.duration}
              onSeek={handleSeek}
              videoUrl={videoUrl}
            />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <StatisticsCard masks={currentFrame.segmentation.masks} />
            <SegmentationTools
              selectedMask={selectedMask}
              onUpdateMask={handleMaskEdit}
              onDeleteMask={handleMaskDelete}
              onExport={handleExport}
            />
          </div>
        </div>
      )}

      <video ref={videoRef} className="hidden" />
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

export { VideoProcessor }

