import { VideoProcessor } from "@/components/VideoProcessor"
import { AnimatedBackground } from "@/components/animated-background"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"
import { VideoObjectDetection } from "@/components/VideoObjectDetection"


export default function Home() {
  return (
    <div className="min-h-screen">
      <AnimatedBackground />
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      <main className="py-8">
        <VideoProcessor />
      </main>
    </div>
  )
}

