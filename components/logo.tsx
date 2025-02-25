"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function Logo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelSize = 3; // Increased pixel size
    const text = "BIO SCOPE 3000";
    ctx.font = "bold 32px 'GeistMono'"; // Increased font size

    // Set canvas size based on text
    const textMetrics = ctx.measureText(text);
    canvas.width = textMetrics.width + 40;
    canvas.height = 60;

    function drawPixelatedText() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Create gradient for base text
      const gradient = ctx!.createLinearGradient(0, 0, canvas!.width, 0);
      if (theme === "dark") {
        gradient.addColorStop(0, "#00ff00"); // Bright green
        gradient.addColorStop(0.5, "#00dd00"); // Slightly darker
        gradient.addColorStop(1, "#00bb00"); // Even darker
      } else {
        gradient.addColorStop(0, "#008000"); // Dark green
        gradient.addColorStop(0.5, "#00a000"); // Medium green
        gradient.addColorStop(1, "#00c000"); // Lighter green
      }

      // Draw base text
      ctx!.fillStyle = gradient;
      ctx!.font = "bold 32px 'GeistMono'";
      ctx!.fillText(text, 20, 40);

      // Get image data
      const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height);
      const data = imageData.data;

      // Clear canvas
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      // Draw pixelated version
      for (let y = 0; y < canvas!.height; y += pixelSize) {
        for (let x = 0; x < canvas!.width; x += pixelSize) {
          const index = (y * canvas!.width + x) * 4;
          if (data[index + 3] > 128) {
            // If pixel is visible
            const brightness = Math.random() * 0.4 + 0.6; // Random brightness
            const color =
              theme === "dark"
                ? `rgba(0, 255, 0, ${brightness})` // Bright green in dark mode
                : `rgba(0, 160, 0, ${brightness})`; // Darker green in light mode
            ctx!.fillStyle = color;
            ctx!.fillRect(x, y, pixelSize, pixelSize);
          }
        }
      }

      // Add subtle glow effect
      ctx!.shadowColor = theme === "dark" ? "#00ff0033" : "#00800033";
      ctx!.shadowBlur = 8;
      ctx!.shadowOffsetX = 0;
      ctx!.shadowOffsetY = 0;
    }

    // Initial draw
    drawPixelatedText();

    // Animate every 400ms (slightly faster)
    const interval = setInterval(drawPixelatedText, 400);

    return () => clearInterval(interval);
  }, [theme]);

  return (
    <div className="relative group">
      <canvas
        ref={canvasRef}
        className="h-12" // Increased height
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-foreground to-transparent opacity-20 group-hover:opacity-30 transition-opacity" />
    </div>
  );
}
