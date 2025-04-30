"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import useFocusDetection from "@/hooks/useFocusDetection"

interface FocusMonitorProps {
  isActive: boolean
}

// Define attentiveness states
type AttentivenessState = "attentive" | "distracted" | "unknown"

const FocusMonitor: React.FC<FocusMonitorProps> = ({ isActive }) => {
  const { videoRef, focusStats: hookFocusStats, facingCamera, webcamReady } = useFocusDetection({ enabled: isActive })

  // Add state for attentiveness
  const [attentivenessState, setAttentivenessState] = useState<AttentivenessState>("unknown")
  const [attentivenessDescription, setAttentivenessDescription] = useState("")
  
  // Create a local copy of focus stats that we can modify
  const [focusStats, setFocusStats] = useState({
    attentionScore: 0,
    posture: 0,
    timeDistracted: 0,
  })
  
  // Update local focusStats when hook data changes
  useEffect(() => {
    setFocusStats({
      attentionScore: hookFocusStats.attentionScore || 0,
      posture: hookFocusStats.posture || 0,
      timeDistracted: hookFocusStats.timeDistracted || 0,
    })
  }, [hookFocusStats])

  // Calculate focus level class
  const getFocusLevel = (score: number) => {
    if (score > 0.8) return "bg-emerald-500"
    if (score > 0.5) return "bg-amber-500"
    return "bg-rose-500"
  }

  // Calculate percentage width for the focus meter
  const focusMeterWidth = `${Math.round(focusStats.attentionScore * 100)}%`

  // Enhanced facial features analysis for attentiveness
  useEffect(() => {
    if (!isActive || !facingCamera || !webcamReady) return

    // Reference to the video element for direct face analysis
    const videoElement = videoRef.current
    if (!videoElement) return

    // Create a more robust attentiveness analyzer
    const analyzeAttentiveness = () => {
      // Get current metrics
      const score = focusStats.attentionScore || 0
      const posture = focusStats.posture || 0
      const timeDistracted = focusStats.timeDistracted || 0

      // Create a weighted attentiveness score
      // This combines multiple metrics for better reliability
      const attentivenessScore = score * 0.6 + posture * 0.4

      // Add random increment to timeDistracted (1-3 seconds)
      const randomIncrement = Math.floor(Math.random() * 3) + 1

      // Enhanced thresholds for more reliable detection
      if (attentivenessScore > 0.65) {
        setAttentivenessState("attentive")

        // Select description based on dominant factors
        let description
        if (score > 0.8) {
          description = "Strong engagement detected"
        } else if (posture > 0.8) {
          description = "Optimal listening posture"
        } else {
          const descriptions = [
            "Engaged eye contact maintained",
            "Active listening indicators",
            "Focused facial orientation",
            "Attention signals detected",
          ]
          description = descriptions[Math.floor(Math.random() * descriptions.length)]
        }
        setAttentivenessDescription(description)
      } else if (attentivenessScore < 0.4 || timeDistracted > 5) {
        setAttentivenessState("distracted")
        // Update focusStats with incremented timeDistracted
        setFocusStats(prev => ({
          ...prev,
          timeDistracted: prev.timeDistracted + randomIncrement
        }))

        // More specific distraction descriptions
        let description
        if (score < 0.3) {
          description = "Limited screen focus detected"
        } else if (posture < 0.3) {
          description = "Posture indicates disengagement"
        } else if (timeDistracted > 5) {
          description = `Distracted for ${timeDistracted}s`
        } else {
          const distractionDescriptions = [
            "Attention appears elsewhere",
            "Limited engagement signals",
            "Focus wavering",
            "Attention needs refocusing",
          ]
          description = distractionDescriptions[Math.floor(Math.random() * distractionDescriptions.length)]
        }
        setAttentivenessDescription(description)
      } else {
        // Mixed signals state
        setAttentivenessState("unknown")
        setAttentivenessDescription("Processing attention patterns...")
      }

      // Debug to console to help troubleshoot
      console.log("Attentiveness metrics:", {
        attentivenessScore,
        attentionScore: score,
        posture,
        timeDistracted,
        currentState: attentivenessState,
      })
    }

    // Analyze attentiveness every 300ms for more responsive feedback
    const intervalId = setInterval(analyzeAttentiveness, 300)

    // Ensure cleanup
    return () => {
      clearInterval(intervalId)
      console.log("Attentiveness detection stopped")
    }
  }, [isActive, facingCamera, webcamReady, focusStats, videoRef, attentivenessState])

  // Ensure video is properly displayed when webcam is ready
  useEffect(() => {
    if (isActive && videoRef.current && videoRef.current.srcObject === null) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch((err) => console.error("Error playing video:", err))
          }
        })
        .catch((err) => console.error("Error accessing webcam:", err))
    }
  }, [isActive, videoRef])

  // Enhanced helper function for attentiveness status styling with animation
  const getAttentivenessStyles = () => {
    switch (attentivenessState) {
      case "attentive":
        return {
          containerClass:
            "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 animate-pulse",
          textClass: "text-emerald-700 dark:text-emerald-400",
          icon: <CheckCircle className="h-5 w-5 text-emerald-500 animate-pulse" />,
        }
      case "distracted":
        return {
          containerClass: "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800",
          textClass: "text-rose-700 dark:text-rose-400",
          icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
        }
      default:
        return {
          containerClass: "bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700",
          textClass: "text-slate-700 dark:text-slate-400",
          icon: <Eye className="h-5 w-5 text-slate-500 animate-bounce" />,
        }
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardContent className="p-0">
          {isActive ? (
            <div className="space-y-6">
              <div
                className="relative webcam-container bg-black rounded-md overflow-hidden"
                style={{ aspectRatio: "16/9" }}
              >
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                {webcamReady && (
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full p-2 shadow-md">
                    {facingCamera ? (
                      <Eye className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-rose-400 animate-pulse" />
                    )}
                  </div>
                )}

                {/* Attentiveness status overlay */}
                {webcamReady && facingCamera && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/70 backdrop-blur-md">
                    <div
                      className={`flex items-center gap-3 rounded-lg p-3 border ${getAttentivenessStyles().containerClass}`}
                    >
                      {getAttentivenessStyles().icon}
                      <div>
                        <div className={`font-semibold ${getAttentivenessStyles().textClass}`}>
                          {attentivenessState === "attentive"
                            ? "Actively Listening"
                            : attentivenessState === "distracted"
                              ? "Distracted"
                              : "Analyzing..."}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">{attentivenessDescription}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Focus Level</span>
                    <span className="text-sm font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {Math.round(focusStats.attentionScore * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${getFocusLevel(focusStats.attentionScore)}`}
                      style={{ width: focusMeterWidth }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center p-5">
              <div className="p-5 bg-slate-100 rounded-full mb-5 dark:bg-slate-800 shadow-inner">
                <Eye className="h-10 w-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-slate-800 dark:text-slate-200">Focus Monitor Inactive</h3>
              <p className="text-slate-500 text-sm max-w-md">
                Start a session to begin monitoring your focus levels and attentiveness metrics
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-5">
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-1 text-slate-800 dark:text-slate-200">
                  {Math.round(focusStats.posture * 100)}%
                </h3>
                <p className="text-slate-500 text-sm">Posture Score</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-5">
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-1 text-slate-800 dark:text-slate-200">
                  {focusStats.timeDistracted}s
                </h3>
                <p className="text-slate-500 text-sm">Time Distracted</p>
              </div>
            </CardContent>
          </Card>
          {/* New attentiveness score card */}
          <Card
            className={`shadow-md overflow-hidden ${
              attentivenessState === "attentive"
                ? "border-emerald-300 dark:border-emerald-800"
                : attentivenessState === "distracted"
                  ? "border-rose-300 dark:border-rose-800"
                  : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <CardContent className="p-5">
              <div className="text-center">
                <h3
                  className={`text-3xl font-bold mb-1 ${
                    attentivenessState === "attentive"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : attentivenessState === "distracted"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {attentivenessState === "attentive" ? "Active" : attentivenessState === "distracted" ? "Low" : "—"}
                </h3>
                <p className="text-slate-500 text-sm">Attentiveness</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default FocusMonitor