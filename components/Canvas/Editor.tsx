"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import type { FrameData, Point, Mask } from "@/types";
import { useTheme } from "next-themes";

interface CanvasEditorProps {
  frame: FrameData;
  resolution: { width: number; height: number };
  onMaskUpdate?: (maskId: string, points: Point[]) => void;
  onMaskSelect?: (mask: Mask) => void;
  videoUrl?: string;
  currentTime?: number;
  readOnly?: boolean;
  showDetections?: boolean;
}

export function CanvasEditor({
  frame,
  resolution,
  onMaskUpdate,
  onMaskSelect,
  videoUrl,
  currentTime = 0,
  readOnly = false,
  showDetections = true,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const { theme } = useTheme();

  // Draw function to show detections and masks
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Draw existing masks if showing detections
    if (showDetections && frame.segmentation.masks.length > 0) {
      frame.segmentation.masks.forEach((mask) => {
        ctx.beginPath();
        ctx.moveTo(mask.points[0].x, mask.points[0].y);
        mask.points.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();

        // Style based on category
        if (mask.category === "dynamic") {
          ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
          ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
        } else {
          ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
          ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        }

        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fill();

        // Draw label
        const centerX =
          mask.points.reduce((sum, p) => sum + p.x, 0) / mask.points.length;
        const centerY =
          mask.points.reduce((sum, p) => sum + p.y, 0) / mask.points.length;

        ctx.font = "12px Arial";
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(
          `${mask.label} (${(mask.confidence * 100).toFixed(0)}%)`,
          centerX,
          centerY,
        );
        ctx.fillText(
          `${mask.label} (${(mask.confidence * 100).toFixed(0)}%)`,
          centerX,
          centerY,
        );
      });
    }

    // Draw current points only if not in read-only mode
    if (!readOnly && isDrawing && currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.slice(1).forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [frame, isDrawing, currentPoints, showDetections, readOnly]);

  // Handle video frame updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;
    video.currentTime = currentTime;

    const handleSeeked = () => {
      drawCanvas();
    };

    video.addEventListener("seeked", handleSeeked);

    // Initial load
    if (video.readyState >= 2) {
      drawCanvas();
    }

    return () => {
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [videoUrl, currentTime, drawCanvas]);

  // Convert canvas coordinates to points
  const getCanvasPoint = useCallback(
    (e: MouseEvent | TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x =
        "touches" in e
          ? e.touches[0].clientX - rect.left
          : e.clientX - rect.left;
      const y =
        "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

      return { x, y };
    },
    [],
  );

  // Only attach mouse/touch handlers if not in read-only mode
  useEffect(() => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const point = getCanvasPoint(e);
      if (!point) return;

      setIsDrawing(true);
      setCurrentPoints([point]);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const point = getCanvasPoint(e);
      if (!point) return;

      setCurrentPoints((prev) => {
        const newPoints = [...prev, point];
        drawCanvas();
        return newPoints;
      });
    };

    const handleEnd = () => {
      if (!isDrawing) return;

      setIsDrawing(false);
      if (currentPoints.length > 2 && onMaskUpdate) {
        const maskId = `mask-${Date.now()}`;
        onMaskUpdate(maskId, currentPoints);
      }
      setCurrentPoints([]);
    };

    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("mouseleave", handleEnd);
    canvas.addEventListener("touchstart", handleStart);
    canvas.addEventListener("touchmove", handleMove);
    canvas.addEventListener("touchend", handleEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("mouseleave", handleEnd);
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, [readOnly, isDrawing, currentPoints, onMaskUpdate, drawCanvas]);

  return (
    <Card className="relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={resolution.width}
        height={resolution.height}
        className="absolute inset-0 w-full h-full"
      />
      <video ref={videoRef} className="hidden" crossOrigin="anonymous" />
    </Card>
  );
}
