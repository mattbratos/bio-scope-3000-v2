export interface ProcessedVideoData {
  frames: FrameData[];
  duration: number;
  resolution: {
    width: number;
    height: number;
  };
}

export interface FrameData {
  id: string;
  timestamp: number;
  segmentation: {
    masks: Mask[];
    labels: string[];
    confidence: number[];
  };
  thumbnail: string;
}

export interface Mask {
  id: string;
  points: Point[];
  label: string;
  confidence: number;
  category: "static" | "dynamic";
}

export interface Point {
  x: number;
  y: number;
}

export interface SegmentationUpdate {
  maskId: string;
  points?: Point[];
  label?: string;
  category?: "static" | "dynamic";
  confidence?: number;
}

export interface ExportData {
  metadata: {
    duration: number;
    resolution: {
      width: number;
      height: number;
    };
    processedAt: string;
  };
  frames: Array<{
    timestamp: number;
    objects: Array<{
      label: string;
      category: "static" | "dynamic";
      confidence: number;
      points: Point[];
    }>;
  }>;
}
