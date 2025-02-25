export class VideoProcessor {
  private worker: Worker | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private frameBuffer: Map<string, string>
  private processingQueue: string[]
  private isProcessing: boolean
  private onFrameProcessedCallback?: (result: any) => void

  constructor() {
    this.canvas = document.createElement("canvas")
    this.ctx = this.canvas.getContext("2d")!
    this.frameBuffer = new Map()
    this.processingQueue = []
    this.isProcessing = false

    // Initialize worker
    if (typeof Worker !== "undefined") {
      this.worker = new Worker(new URL("../workers/video-processor.ts", import.meta.url), { type: "module" })
      this.worker.onmessage = this.handleWorkerMessage.bind(this)
    }
  }

  async extractFrame(video: HTMLVideoElement, timestamp: number): Promise<string> {
    return new Promise((resolve) => {
      video.currentTime = timestamp
      video.addEventListener(
        "seeked",
        () => {
          this.canvas.width = video.videoWidth
          this.canvas.height = video.videoHeight
          this.ctx.drawImage(video, 0, 0)
          const frameData = this.canvas.toDataURL("image/jpeg")
          this.frameBuffer.set(String(timestamp), frameData)
          resolve(frameData)
        },
        { once: true },
      )
    })
  }

  async processFrame(frameData: string, timestamp: number, frameId: string): Promise<void> {
    if (!this.worker) {
      console.error("Web Workers not supported")
      return
    }

    this.processingQueue.push(frameId)
    this.frameBuffer.set(frameId, frameData)

    if (!this.isProcessing) {
      this.processNextFrame()
    }
  }

  private async processNextFrame() {
    if (!this.worker || this.processingQueue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const frameId = this.processingQueue[0]
    const frameData = this.frameBuffer.get(frameId)

    if (frameData) {
      this.worker.postMessage({
        type: "PROCESS_FRAME",
        frame: frameData,
        timestamp: Date.now(),
        frameId,
      })
    } else {
      this.processingQueue.shift()
      this.processNextFrame()
    }
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { type, result, error } = e.data

    if (type === "FRAME_PROCESSED") {
      // Remove from queue and process next
      this.processingQueue.shift()
      this.processNextFrame()

      // Clear frame data from buffer
      this.frameBuffer.delete(result.frameId)

      // Emit result
      if (this.onFrameProcessedCallback) {
        this.onFrameProcessedCallback(result)
      }
    } else if (type === "ERROR") {
      console.error("Error processing frame:", error)
      this.processingQueue.shift()
      this.processNextFrame()
    }
  }

  set onFrameProcessed(callback: (result: any) => void) {
    this.onFrameProcessedCallback = callback
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.frameBuffer.clear()
    this.processingQueue = []
  }
}

