"use client";

import type React from "react";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { UploadCloud, Loader2 } from "lucide-react";
import { CanvasEditor } from "../Canvas/Editor";
import { Timeline } from "../ui/Timeline";
import { SegmentationTools } from "../SegmentationTools";
import { StatisticsCard } from "../StatisticsCard";
import { DetectedObjectsCard } from "../DetectedObjectsCard";
import type {
  ProcessedVideoData,
  FrameData,
  Point,
  Mask,
  ExportData,
} from "@/types";
import { ResolutionManager } from "./ResolutionManager";
import { VideoProcessor as AIProcessor } from "@/lib/video-processor";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { ANIMAL_CLASSES } from "@/config/animals";

interface ProcessingStatus {
  frameId: string;
  timestamp: number;
  status: "started" | "completed" | "error";
  progress: number;
}

export function VideoProcessor() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [processedData, setProcessedData] = useState<ProcessedVideoData | null>(
    null,
  );
  const [currentFrame, setCurrentFrame] = useState<FrameData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus | null>(null);
  const [selectedMask, setSelectedMask] = useState<Mask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<
    Record<
      string,
      {
        count: number;
        confidence: number;
        timestamps: number[];
      }
    >
  >({});
  const [persistentAnimals, setPersistentAnimals] = useState<
    Record<string, { count: number; lastConfidence: number }>
  >({});
  const [isModelLoading, setIsModelLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const processorRef = useRef<AIProcessor | null>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });

  // Constants
  const PREVIEW_FPS = 2;
  const ANALYSIS_FPS = 10; // Higher FPS for analysis

  // Initialize TensorFlow.js backend
  useEffect(() => {
    async function initTF() {
      try {
        console.log("🔄 Initializing TensorFlow.js backend...");
        await tf.ready();
        console.log("✅ TensorFlow.js backend initialized:", tf.getBackend());
      } catch (error) {
        console.error("❌ Failed to initialize TensorFlow.js backend:", error);
      }
    }
    initTF();
  }, []);

  // Load COCO-SSD model
  useEffect(() => {
    async function loadModel() {
      try {
        // Make sure TensorFlow.js is ready
        await tf.ready();
        console.log("🔄 Loading COCO-SSD model...");
        const model = await cocoSsd.load({
          base: "mobilenet_v2", // Use full model for better accuracy
        });
        modelRef.current = model;
        setIsModelLoading(false);
        console.log("✅ COCO-SSD model loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load COCO-SSD model:", error);
        setIsModelLoading(false);
      }
    }
    loadModel();
  }, []);

  // Initialize AI processor
  useEffect(() => {
    processorRef.current = new AIProcessor();
  }, []);

  // Initialize AI processor
  useEffect(() => {
    processorRef.current = new AIProcessor();
    processorRef.current.onFrameProcessed = async (result) => {
      if (!currentFrame || !modelRef.current || !videoRef.current) {
        console.log("⚠️ Missing requirements for detection:", {
          hasCurrentFrame: !!currentFrame,
          hasModel: !!modelRef.current,
          hasVideo: !!videoRef.current,
        });
        return;
      }

      try {
        // Update current frame with processing results
        setCurrentFrame((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            segmentation: {
              masks: result.objects.map((obj: any) => ({
                id: `mask-${Math.random()}`,
                points: convertBBoxToPoints(obj.bbox),
                label: obj.label,
                confidence: obj.confidence,
                category: obj.category,
              })),
              labels: result.objects.map((obj: any) => obj.label),
              confidence: result.objects.map((obj: any) => obj.confidence),
            },
          };
        });

        // Update processing status
        if (result.type === "PROCESSING_STATUS") {
          setProcessingStatus(result);
          setProgress(result.progress);

          // Update video preview to show current frame being processed
          if (videoRef.current && result.status === "started") {
            videoRef.current.currentTime = result.timestamp;
          }
        }

        // Update detections for the current frame
        const currentFrameAnimals: Record<
          string,
          { count: number; confidence: number }
        > = {};
        result.objects.forEach((obj: any) => {
          if (obj.confidence > 0.5 && ANIMAL_CLASSES.has(obj.label)) {
            currentFrameAnimals[obj.label] = {
              count: (currentFrameAnimals[obj.label]?.count || 0) + 1,
              confidence: obj.confidence,
            };
          }
        });

        // Update persistent animals state
        setPersistentAnimals((prev) => {
          const newPersistentAnimals = { ...prev };
          Object.entries(currentFrameAnimals).forEach(([animal, data]) => {
            newPersistentAnimals[animal] = {
              count: data.count,
              lastConfidence: data.confidence,
            };
          });
          return newPersistentAnimals;
        });
      } catch (error) {
        console.error("❌ Error during frame processing:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      }
    };

    return () => {
      processorRef.current = null;
    };
  }, [currentFrame]);

  // Add debug log to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      console.log("▶️ Video started playing");
      console.log("Video properties:", {
        currentTime: video.currentTime,
        duration: video.duration,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    };

    video.addEventListener("play", handlePlay);
    return () => video.removeEventListener("play", handlePlay);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("📁 Loading video file:", file.name);
    setVideoFile(file);
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Reset states
    setProcessedData(null);
    setCurrentFrame(null);
    setPersistentAnimals({});
    setDetections({});

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    const video = videoRef.current;
    if (!video) return;

    try {
      // Simulate upload progress
      const totalSize = file.size;
      let loadedSize = 0;
      const chunkSize = Math.ceil(totalSize / 100); // Split into 100 chunks for smooth progress

      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      };

      reader.onload = async () => {
        try {
          video.src = url;

          // Wait for video metadata to load
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
          });

          console.log("📼 Video metadata loaded:", {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
          });

          // Set up resolution manager
          const resManager = new ResolutionManager(
            video.videoWidth,
            video.videoHeight,
          );
          const processRes = resManager.getProcessingResolution();
          setResolution(processRes);

          // Create frames at lower rate for preview
          const frameCount = Math.ceil(video.duration * PREVIEW_FPS);
          const interval = 1 / PREVIEW_FPS;
          const frames: FrameData[] = [];

          console.log("🎞️ Generating preview frames:", {
            frameCount,
            interval,
            fps: PREVIEW_FPS,
          });

          // Generate frame previews
          const canvas = document.createElement("canvas");
          canvas.width = 160; // thumbnail width
          canvas.height = 90; // thumbnail height
          const ctx = canvas.getContext("2d");

          for (let i = 0; i < frameCount; i++) {
            video.currentTime = i * interval;
            await new Promise((resolve) =>
              video.addEventListener("seeked", resolve, { once: true }),
            );

            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnail = canvas.toDataURL("image/jpeg", 0.7);

              frames.push({
                id: `frame-${i}`,
                timestamp: i * interval,
                segmentation: {
                  masks: [],
                  labels: [],
                  confidence: [],
                },
                thumbnail: thumbnail,
              });
            }
          }

          // Reset video time
          video.currentTime = 0;

          const initialData = {
            frames,
            duration: video.duration,
            resolution: processRes,
          };

          console.log("✅ Initial data prepared:", {
            frameCount: frames.length,
            duration: video.duration,
            resolution: processRes,
          });

          setProcessedData(initialData);
          setCurrentFrame(frames[0]);
          setIsUploading(false);
          setUploadProgress(100);
        } catch (error) {
          console.error("❌ Error loading video:", error);
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load video file",
          );
          setIsUploading(false);
          setUploadProgress(0);
        }
      };

      reader.onerror = () => {
        setError("Failed to read video file");
        setIsUploading(false);
        setUploadProgress(0);
      };

      // Start reading the file
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("❌ Error loading video:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load video file",
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleProcessVideo = async () => {
    // Add debug logging for initial state
    console.log("🔍 Checking initial state:", {
      videoRef: !!videoRef.current,
      processorRef: !!processorRef.current,
      processedData: !!processedData,
      modelRef: !!modelRef.current,
      videoFile: !!videoFile,
    });

    if (
      !videoRef.current ||
      !processorRef.current ||
      !processedData ||
      !modelRef.current
    ) {
      console.error("❌ Missing required refs:", {
        hasVideo: !!videoRef.current,
        hasProcessor: !!processorRef.current,
        hasProcessedData: !!processedData,
        hasModel: !!modelRef.current,
      });
      setError("Please ensure video is loaded before processing");
      return;
    }

    console.log("🎬 Starting video processing...");
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const video = videoRef.current;
      video.pause(); // Ensure video is paused initially
      console.log("📹 Video info:", {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });

      // Create a map to store analysis results
      const analysisResults = new Map<
        number,
        {
          masks: Mask[];
          labels: string[];
          confidence: number[];
        }
      >();

      // Process each frame at regular intervals
      const frameInterval = 1 / ANALYSIS_FPS;
      let currentTime = 0;
      let totalDetections = 0;

      console.log("⚙️ Processing configuration:", {
        frameInterval,
        totalFrames: Math.ceil(video.duration * ANALYSIS_FPS),
        fps: ANALYSIS_FPS,
      });

      while (currentTime <= video.duration) {
        // Set video to current time
        video.currentTime = currentTime;
        console.log(`\n🎯 Processing frame at ${currentTime.toFixed(2)}s`);

        // Wait for the video to seek to the specified time
        await new Promise((resolve) =>
          video.addEventListener("seeked", resolve, { once: true }),
        );

        try {
          // Run detection on the current frame
          console.log("🔍 Running detection...");
          const predictions = await modelRef.current.detect(video);
          console.log("📊 Raw predictions:", predictions);

          // Convert predictions to masks and store results
          const objects = predictions
            .filter((pred) => pred.score > 0.5) // Only keep predictions with confidence > 50%
            .map((pred) => ({
              label: pred.class,
              confidence: pred.score,
              bbox: [
                pred.bbox[0],
                pred.bbox[1],
                pred.bbox[2],
                pred.bbox[3],
              ] as [number, number, number, number],
              category: ANIMAL_CLASSES.has(pred.class) ? "dynamic" : "static",
            }));

          console.log(
            "🎯 Filtered objects:",
            objects.map((obj) => ({
              label: obj.label,
              confidence: obj.confidence.toFixed(2),
              category: obj.category,
            })),
          );

          const masks = objects.map((obj) => ({
            id: `mask-${Math.random()}`,
            points: convertBBoxToPoints(obj.bbox),
            label: obj.label,
            confidence: obj.confidence,
            category: obj.category,
          }));

          // Update detections with timestamps
          objects.forEach((obj) => {
            if (ANIMAL_CLASSES.has(obj.label)) {
              console.log(
                `🦁 Found animal: ${obj.label} with confidence ${obj.confidence.toFixed(2)} at ${currentTime.toFixed(2)}s`,
              );
              setDetections((prev) => ({
                ...prev,
                [obj.label]: {
                  count: (prev[obj.label]?.count || 0) + 1,
                  confidence: Math.max(
                    obj.confidence,
                    prev[obj.label]?.confidence || 0,
                  ),
                  timestamps: [
                    ...(prev[obj.label]?.timestamps || []),
                    currentTime,
                  ],
                },
              }));

              setPersistentAnimals((prev) => ({
                ...prev,
                [obj.label]: {
                  count: (prev[obj.label]?.count || 0) + 1,
                  lastConfidence: obj.confidence,
                },
              }));
            }
          });

          totalDetections += objects.length;
          console.log(`📈 Total detections so far: ${totalDetections}`);

          // Store results for this frame
          const frameIndex = Math.round(currentTime * ANALYSIS_FPS);
          analysisResults.set(frameIndex, {
            masks,
            labels: objects.map((obj) => obj.label),
            confidence: objects.map((obj) => obj.confidence),
          });

          // Update current frame for display
          setCurrentFrame((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              segmentation: {
                masks,
                labels: objects.map((obj) => obj.label),
                confidence: objects.map((obj) => obj.confidence),
              },
            };
          });

          // Update progress
          const progress = (currentTime / video.duration) * 100;
          setProgress(progress);
          console.log(`✨ Frame processed - Progress: ${progress.toFixed(1)}%`);
        } catch (error) {
          console.error(`❌ Error processing frame at ${currentTime}:`, error);
        }

        // Move to next frame
        currentTime += frameInterval;
      }

      console.log("\n🎉 Processing complete!");
      console.log("📊 Final statistics:", {
        totalFramesProcessed: Math.ceil(video.duration * ANALYSIS_FPS),
        totalDetections,
        uniqueAnimals: Object.keys(persistentAnimals).length,
      });

      // Update processedData with all analysis results
      setProcessedData((prev) => {
        if (!prev) return prev;
        const updatedData = {
          ...prev,
          frames: prev.frames.map((frame) => {
            const frameIndex = Math.round(frame.timestamp * ANALYSIS_FPS);
            const analysis = analysisResults.get(frameIndex);
            return analysis
              ? {
                  ...frame,
                  segmentation: analysis,
                }
              : frame;
          }),
        };
        console.log("💾 Final processed data:", {
          totalFrames: updatedData.frames.length,
          framesWithDetections: updatedData.frames.filter(
            (f) => f.segmentation.masks.length > 0,
          ).length,
        });
        return updatedData;
      });
    } catch (error) {
      console.error("❌ Error processing video:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsProcessing(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      console.log("🏁 Processing finished");
    }
  };

  const handleSeek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (!processedData) return;

      const frame = processedData.frames.find(
        (f) => Math.abs(f.timestamp - time) < 0.1,
      );
      if (frame) {
        setCurrentFrame(frame);
      }

      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    [processedData],
  );

  const handleMaskUpdate = useCallback(
    (maskId: string, points: Point[]) => {
      if (!currentFrame) return;

      setCurrentFrame((prev) => {
        if (!prev) return prev;
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
        };
      });
    },
    [currentFrame],
  );

  const handleMaskSelect = useCallback((mask: Mask) => {
    setSelectedMask(mask);
  }, []);

  const handleMaskEdit = useCallback(
    (maskId: string, updates: Partial<Mask>) => {
      if (!currentFrame) return;

      setCurrentFrame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          segmentation: {
            ...prev.segmentation,
            masks: prev.segmentation.masks.map((mask) =>
              mask.id === maskId ? { ...mask, ...updates } : mask,
            ),
          },
        };
      });
    },
    [currentFrame],
  );

  const handleMaskDelete = useCallback(
    (maskId: string) => {
      if (!currentFrame) return;

      setCurrentFrame((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          segmentation: {
            ...prev.segmentation,
            masks: prev.segmentation.masks.filter((mask) => mask.id !== maskId),
          },
        };
      });
      setSelectedMask(null);
    },
    [currentFrame],
  );

  const handleExport = useCallback(() => {
    if (!processedData) return;

    try {
      const exportData: ExportData = {
        metadata: {
          duration: processedData.duration,
          resolution: processedData.resolution,
          processedAt: new Date().toISOString(),
          totalFrames: processedData.frames.length,
          detectedObjects: Object.fromEntries(
            Object.entries(persistentAnimals).filter(
              ([_, data]) => data.lastConfidence > 0.5,
            ),
          ),
        },
        frames: processedData.frames.map((frame) => ({
          timestamp: frame.timestamp,
          objects: frame.segmentation.masks.map((mask) => ({
            label: mask.label,
            category: mask.category,
            confidence: mask.confidence,
            points: mask.points,
            boundingBox: {
              x: Math.min(...mask.points.map((p) => p.x)),
              y: Math.min(...mask.points.map((p) => p.y)),
              width:
                Math.max(...mask.points.map((p) => p.x)) -
                Math.min(...mask.points.map((p) => p.x)),
              height:
                Math.max(...mask.points.map((p) => p.y)) -
                Math.min(...mask.points.map((p) => p.y)),
            },
          })),
        })),
        summary: {
          uniqueObjects: Array.from(
            new Set(
              processedData.frames.flatMap((f) =>
                f.segmentation.masks.map((m) => m.label),
              ),
            ),
          ),
          averageConfidence:
            processedData.frames.reduce(
              (acc, frame) =>
                acc +
                frame.segmentation.confidence.reduce((sum, c) => sum + c, 0) /
                  (frame.segmentation.confidence.length || 1),
              0,
            ) / processedData.frames.length,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-analysis-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Failed to export analysis results");
    }
  }, [processedData, persistentAnimals]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-4 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="flex-1"
                disabled={isProcessing || isUploading}
              />
              <Button
                onClick={handleProcessVideo}
                disabled={
                  !videoFile || isProcessing || isUploading || !processedData
                }
                variant={isUploading ? "outline" : "default"}
                className="min-w-[140px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : !processedData && videoFile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing...
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
                <p className="text-sm text-muted-foreground text-center">
                  Processing video... {Math.round(progress)}%
                </p>
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
                  readOnly={true}
                  showDetections={true}
                />
              )}
              {processingStatus && processingStatus.status === "started" && (
                <div className="absolute top-2 right-2 bg-black/80 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing frame {processingStatus.timestamp.toFixed(2)}s
                </div>
              )}
            </div>

            {processedData && (
              <Timeline
                frames={processedData.frames}
                duration={processedData.duration}
                currentTime={currentTime}
                onSeek={handleSeek}
                videoUrl={videoUrl}
              />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <DetectedObjectsCard
            detections={detections}
            isLoading={isModelLoading}
            onTimestampClick={(time) => handleSeek(time)}
            onExport={handleExport}
          />
        </div>
      </div>
    </div>
  );
}

function convertBBoxToPoints(bbox: [number, number, number, number]): Point[] {
  const [x, y, width, height] = bbox;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}
