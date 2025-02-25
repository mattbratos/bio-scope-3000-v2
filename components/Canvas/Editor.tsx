"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import type { FrameData, Point, Mask } from "@/types"
import { useTheme } from "next-themes"

interface CanvasEditorProps {
  frame?: FrameData
  width: number
  height: number
  onMaskUpdate?: (maskId: string, points: Point[]) => void
  onMaskSelect?: (mask: Mask) => void
  videoUrl?: string
  currentTime?: number
}

export function CanvasEditor({ frame, width, height, onMaskUpdate, onMaskSelect, videoUrl, currentTime = 0 }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const { theme } = useTheme()

  // Draw everything on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw video frame
    ctx.drawImage(video, 0, 0, width, height)

    // Draw existing masks
    if (frame) {
      const maskColor = theme === "dark" ? "#00ff00" : "#008000"

      frame.segmentation.masks.forEach((mask) => {
        // Draw mask
        ctx.beginPath()
        mask.points.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })
        ctx.closePath()
        ctx.strokeStyle = maskColor
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = maskColor + "20"
        ctx.fill()

        // Draw label
        ctx.fillStyle = maskColor
        ctx.font = "12px GeistMono"
        const firstPoint = mask.points[0]
        ctx.fillText(`${mask.label} (${Math.round(mask.confidence * 100)}%)`, firstPoint.x, firstPoint.y - 20)
      })
    }

    // Draw current drawing
    if (currentPoints.length > 0) {
      ctx.beginPath()
      currentPoints.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })
      ctx.strokeStyle = "#ff0000"
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [frame, currentPoints, width, height, theme])

  // Handle video frame updates
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    video.src = videoUrl
    video.currentTime = currentTime

    const handleSeeked = () => {
      drawCanvas()
    }

    video.addEventListener("seeked", handleSeeked)

    // Initial load
    if (video.readyState >= 2) {
      drawCanvas()
    }

    return () => {
      video.removeEventListener("seeked", handleSeeked)
    }
  }, [videoUrl, currentTime, drawCanvas])

  // Convert canvas coordinates to points
  const getCanvasPoint = useCallback((e: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    return { x, y }
  }, [])

  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const point = getCanvasPoint(e)
      if (!point) return

      setIsDrawing(true)
      setCurrentPoints([point])
    },
    [getCanvasPoint],
  )

  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!isDrawing) return

      const point = getCanvasPoint(e)
      if (!point) return

      setCurrentPoints((prev) => {
        const newPoints = [...prev, point]
        drawCanvas()
        return newPoints
      })
    },
    [isDrawing, getCanvasPoint, drawCanvas],
  )

  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!isDrawing) return

      setIsDrawing(false)
      if (currentPoints.length > 2) {
        const firstPoint = currentPoints[0]
        const points = [...currentPoints, firstPoint]
        onMaskUpdate?.("new", points)
      }
      setCurrentPoints([])
      drawCanvas()
    },
    [currentPoints, isDrawing, onMaskUpdate, drawCanvas],
  )

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseDown = (e: MouseEvent) => handleStart(e)
    const handleMouseMove = (e: MouseEvent) => handleMove(e)
    const handleMouseUp = (e: MouseEvent) => handleEnd(e)
    const handleTouchStart = (e: TouchEvent) => handleStart(e)
    const handleTouchMove = (e: TouchEvent) => handleMove(e)
    const handleTouchEnd = (e: TouchEvent) => handleEnd(e)

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseleave", handleMouseUp)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseleave", handleMouseUp)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleStart, handleMove, handleEnd])

  return (
    <Card className="relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="touch-none"
        style={{
          width: "100%",
          height: "auto",
          cursor: isDrawing ? "crosshair" : "default",
        }}
      />
      <video ref={videoRef} className="hidden" crossOrigin="anonymous" />
    </Card>
  )
}

