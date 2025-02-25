interface Point {
  x: number
  y: number
}

interface Mask {
  points: Point[]
}

export class ResolutionManager {
  private originalResolution: { width: number; height: number }

  constructor(width: number, height: number) {
    this.originalResolution = { width, height }
  }

  getProcessingResolution() {
    const { width, height } = this.originalResolution
    const targetHeight = 720 // Target 720p for processing

    if (height <= targetHeight) {
      return { width, height }
    }

    const aspectRatio = width / height
    const newHeight = targetHeight
    const newWidth = Math.round(targetHeight * aspectRatio)

    return { width: newWidth, height: newHeight }
  }

  scaleSegmentationToOriginal(mask: Mask): Mask {
    const processingRes = this.getProcessingResolution()
    const scaleX = this.originalResolution.width / processingRes.width
    const scaleY = this.originalResolution.height / processingRes.height

    return {
      ...mask,
      points: mask.points.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      })),
    }
  }
}

