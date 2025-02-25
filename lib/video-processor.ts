export class VideoProcessor {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private onFrameProcessedCallback?: (result: any) => void

  constructor() {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")!
  }

  async extractFrame(video: HTMLVideoElement, timestamp: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      video.currentTime = timestamp
      video.addEventListener(
        "seeked",
        () => {
          this.canvas.width = video.videoWidth
          this.canvas.height = video.videoHeight
          this.ctx.drawImage(video, 0, 0)
          resolve(this.canvas)
        },
        { once: true },
      )
    })
  }

  async processFrame(frame: HTMLCanvasElement, timestamp: number, frameId: string): Promise<void> {
    try {
      const { analyzeFrame } = await import("./ai-service")
      const result = await analyzeFrame(frame)
      
      if (this.onFrameProcessedCallback) {
        this.onFrameProcessedCallback({
          frameId,
          timestamp,
          ...result
        })
      }
    } catch (error) {
      console.error("Error processing frame:", error)
    }
  }

  set onFrameProcessed(callback: (result: any) => void) {
    this.onFrameProcessedCallback = callback
  }

  destroy() {
    // Cleanup if needed
  }
}

