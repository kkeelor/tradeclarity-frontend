'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui'
import Footer from '../components/Footer'
import { useAuth } from '@/lib/AuthContext'

function DemoPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [fromPage, setFromPage] = useState('/')
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Get the referrer page from query params
  useEffect(() => {
    const from = searchParams.get('from') || '/'
    setFromPage(from)
  }, [searchParams])

  // Auto-hide controls on mobile after interaction
  useEffect(() => {
    if (!isTouchDevice) return
    
    let timeoutId
    if (showControls) {
      timeoutId = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [showControls, isTouchDevice])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && videoRef.current) {
      videoRef.current.requestFullscreen().then(() => setIsFullscreen(true))
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }

  const handleVideoClick = () => {
    togglePlay()
  }

  const handleGetStarted = () => {
    // Redirect to dashboard (always go to dashboard after demo)
    router.push('/dashboard')
  }

  const handleBack = () => {
    // Redirect back to the page they came from
    router.push(fromPage)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 h-14 sm:h-16 flex justify-between items-center">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 active:opacity-60 transition-opacity group min-h-[44px] min-w-[44px] -ml-2 pl-2 pr-1"
          >
            <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
            <span className="text-xs sm:text-sm text-white/60 group-hover:text-white transition-colors hidden min-[360px]:inline">
              {fromPage === '/' ? 'Back to Home' : fromPage === '/dashboard' ? 'Back to Dashboard' : fromPage === '/vega' ? 'Back to Vega AI' : 'Back'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 sm:pt-24 pb-8 sm:pb-12 px-3 sm:px-4 md:px-6 relative">
        <div className="max-w-5xl w-full space-y-6 sm:space-y-8">
          {/* Title Section */}
          <div className="text-center space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight px-2">
              See Vega AI in Action
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto px-2">
              Watch how Vega analyzes your trading patterns and provides actionable insights
            </p>
          </div>

          {/* Video Container */}
          <div className="relative w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div 
              className="relative w-full aspect-video bg-zinc-900 cursor-pointer group"
              onClick={(e) => {
                if (isTouchDevice) {
                  setShowControls(!showControls)
                }
                handleVideoClick()
              }}
              onMouseEnter={() => !isTouchDevice && setShowControls(true)}
              onMouseLeave={() => !isTouchDevice && setShowControls(false)}
              onTouchStart={() => isTouchDevice && setShowControls(true)}
            >
              <video
                ref={videoRef}
                src="/trade-clarity-demo-1080p-final.mp4"
                poster="/trade-clarity-demo-poster.jpg"
                className="w-full h-full object-contain"
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = isMuted
                  }
                }}
              />

              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 active:scale-95 transition-transform min-h-[64px] min-w-[64px] sm:min-h-[80px] sm:min-w-[80px]">
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-0.5 sm:ml-1" fill="white" />
                  </div>
                </div>
              )}

              {/* Custom Controls */}
              {showControls && (
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 transition-opacity ${
                  isTouchDevice ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePlay()
                        }}
                        className="p-2.5 sm:p-2 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 sm:w-5 sm:h-5 text-white" fill="white" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleMute()
                        }}
                        className="p-2.5 sm:p-2 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <VolumeX className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                        ) : (
                          <Volume2 className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFullscreen()
                      }}
                      className="p-2.5 sm:p-2 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                      ) : (
                        <Maximize className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 w-full px-2">
            <Button
              variant="primary"
              size="xl"
              onClick={handleGetStarted}
              className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 text-sm sm:text-base font-semibold bg-emerald-500 text-black hover:bg-emerald-400 active:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full border-none shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
            >
              Get Started
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 ml-2 rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => router.push('/pricing')}
              className="w-full sm:w-auto sm:min-w-[200px] h-12 sm:h-14 text-sm sm:text-base font-medium bg-transparent border-white/20 text-white hover:bg-white/5 active:bg-white/10 hover:border-white/40 active:border-white/30 rounded-full"
            >
              View Pricing
            </Button>
          </div>

          {/* Info Section */}
          <div className="pt-6 sm:pt-8 text-center space-y-3 sm:space-y-4 px-2">
            <p className="text-xs sm:text-sm text-white/50">
              Ready to connect your brokerage and get personalized insights?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-white/40">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="whitespace-nowrap">Secure read-only access</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="whitespace-nowrap">50+ behavioral patterns analyzed</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="whitespace-nowrap">AI-powered trading coach</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function DemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    }>
      <DemoPageContent />
    </Suspense>
  )
}
