"use client"

import { motion } from "framer-motion"
import { PlayCircle, Clock, ExternalLink, Youtube } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  VIDEO_SOLUTIONS,
  VIDEO_CATEGORIES,
  YOUTUBE_CHANNEL_URL,
  getVideosBySubject,
  type VideoSubject,
} from "@/data/videoSolutions"

const difficultyColors = {
  Introductory: "bg-green-500/10 text-green-600 border-green-500/20",
  Intermediate: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Advanced: "bg-red-500/10 text-red-600 border-red-500/20",
}

export default function VideoSolutionsPage() {
  const [activeCategory, setActiveCategory] = useState<VideoSubject>("Chemistry")

  const categoryVideos = getVideosBySubject(activeCategory)

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Video Solutions</h1>
              <p className="text-muted-foreground max-w-2xl">
                Step-by-step walkthroughs focused on reasoning, derivations, visualization, and
                transferable problem-solving.
              </p>
            </div>
          </div>
        </motion.div>

        {/* YouTube Channel CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="rounded-2xl mb-6 bg-primary text-primary-foreground">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                <Youtube className="h-8 w-8" />
                <div>
                  <p className="font-semibold">YouTube Channel</p>
                  <p className="text-sm opacity-80">Educational walkthroughs and solutions</p>
                </div>
              </div>
              <Button variant="secondary" className="rounded-xl gap-2" asChild>
                <Link href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                  Visit Channel
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {VIDEO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Video Cards */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {categoryVideos.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Card className="h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:shadow-lg hover:border-accent/30">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{video.title}</h3>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                    >
                      Coming Soon
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{video.topic}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary">{video.subject}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        difficultyColors[video.difficulty as keyof typeof difficultyColors]
                      }
                    >
                      {video.difficulty}
                    </Badge>
                  </div>

                  {video.relatedPaper && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Related: {video.relatedPaper}
                    </p>
                  )}

                  {video.duration && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3.5 w-3.5" />
                      {video.duration}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-lg gap-1.5"
                      asChild
                    >
                      <Link href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
                        <Youtube className="h-3.5 w-3.5" />
                        YouTube
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Summary by category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Coming Soon Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                {VIDEO_CATEGORIES.map((cat) => {
                  const videos = getVideosBySubject(cat)
                  return (
                    <div key={cat}>
                      <h4 className="font-medium text-foreground mb-2">{cat}</h4>
                      <ul className="space-y-1">
                        {videos.map((v) => (
                          <li
                            key={v.id}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            {v.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {VIDEO_SOLUTIONS.length} video solutions planned · Content in development
        </p>
      </div>
    </div>
  )
}
