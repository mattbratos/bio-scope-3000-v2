"use client"

import { useEffect, useRef } from "react"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const particles: Particle[] = []
    const particleCount = 40 // Reduced count for better visibility

    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      opacity: number

      constructor() {
        this.x = Math.random() * canvas!.width
        this.y = Math.random() * canvas!.height
        this.size = Math.random() * 3 + 1 // Increased size
        this.speedX = Math.random() * 0.8 - 0.4 // Increased speed
        this.speedY = Math.random() * 0.8 - 0.4
        this.opacity = Math.random() * 0.7 + 0.3 // Increased opacity
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x < 0) this.x = canvas!.width
        if (this.x > canvas!.width) this.x = 0
        if (this.y < 0) this.y = canvas!.height
        if (this.y > canvas!.height) this.y = 0
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(128, 128, 128, ${this.opacity})`
        ctx.fill()
      }
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    function connectParticles() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            // Increased connection distance
            const opacity = (1 - distance / 150) * 0.4 // Increased opacity
            ctx!.beginPath()
            ctx!.strokeStyle = `rgba(128, 128, 128, ${opacity})`
            ctx!.lineWidth = 1.5 // Increased line width
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.stroke()
          }
        }
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      particles.forEach((particle) => {
        particle.update()
        particle.draw(ctx!)
      })

      connectParticles()
      requestAnimationFrame(animate)
    }

    // Handle resize
    function handleResize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    animate()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 opacity-40 dark:opacity-30" />
}

