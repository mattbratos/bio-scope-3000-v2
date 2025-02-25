"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { FrameData } from "@/types";

interface TimelineProps {
  frames: FrameData[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  videoUrl?: string;
}

export function Timeline({
  frames,
  currentTime,
  duration,
  onSeek,
  videoUrl,
}: TimelineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Function to capture a single frame
  const captureFrame = useCallback(
    async (video: HTMLVideoElement, time: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas) return reject("No canvas");

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("No context");

        const handleSeeked = () => {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
            video.removeEventListener("seeked", handleSeeked);
            resolve(thumbnail);
          } catch (error) {
            reject(error);
          }
        };

        video.addEventListener("seeked", handleSeeked);
        video.currentTime = time;
      });
    },
    [],
  );

  // Generate thumbnails when video is loaded
  useEffect(() => {
    if (!videoUrl) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const generateThumbnails = async () => {
      setIsGenerating(true);
      const newThumbnails: { [key: string]: string } = {};

      try {
        // Set up video and canvas
        video.src = videoUrl;
        await new Promise((resolve) => {
          video.addEventListener("loadedmetadata", resolve, { once: true });
        });

        // Set canvas size for thumbnails
        canvas.width = 160;
        canvas.height = 90;

        // Generate thumbnails sequentially
        for (const frame of frames) {
          try {
            const thumbnail = await captureFrame(video, frame.timestamp);
            newThumbnails[frame.id] = thumbnail;
            // Update thumbnails gradually
            setThumbnails((prev) => ({ ...prev, [frame.id]: thumbnail }));
          } catch (error) {
            console.error(
              `Error generating thumbnail for frame ${frame.id}:`,
              error,
            );
          }
        }
      } catch (error) {
        console.error("Error setting up video:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateThumbnails();

    return () => {
      video.src = "";
    };
  }, [videoUrl, frames, captureFrame]);

  return (
    <Card className="p-4 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/80">
      <div className="space-y-4">
        <div className="flex overflow-x-auto gap-1 pb-2 px-1 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {frames.map((frame) => (
            <div
              key={frame.id}
              className="relative flex-shrink-0 w-40 h-[90px] rounded-sm overflow-hidden border border-gray-800 cursor-pointer hover:border-green-500 transition-colors group"
              onClick={() => onSeek(frame.timestamp)}
            >
              {thumbnails[frame.id] ? (
                <img
                  src={thumbnails[frame.id] || "/placeholder.svg"}
                  alt={`Frame at ${frame.timestamp}s`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/50">
                  <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                </div>
              )}
              {frame.segmentation.masks.length > 0 && (
                <div className="absolute top-1 right-1 bg-green-500/80 backdrop-blur-sm text-white text-xs px-1 rounded">
                  {frame.segmentation.masks.length}
                </div>
              )}
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 transition-all ${
                  Math.abs(currentTime - frame.timestamp) < 0.1
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-1 left-1 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                {formatTime(frame.timestamp)}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={(value) => onSeek(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      <video ref={videoRef} className="hidden" crossOrigin="anonymous" />
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
