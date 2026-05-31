export type VideoSubject = "Chemistry" | "Mathematics" | "Physics" | "Engineering"

export type VideoDifficulty = "Introductory" | "Intermediate" | "Advanced"

export type VideoStatus = "available" | "coming-soon"

export interface VideoSolution {
  id: string
  title: string
  topic: string
  subject: VideoSubject
  relatedPaper?: string
  difficulty: VideoDifficulty
  duration?: string
  youtubeUrl: string
  status: VideoStatus
}

export const VIDEO_CATEGORIES: VideoSubject[] = [
  "Chemistry",
  "Mathematics",
  "Physics",
  "Engineering",
]

export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@arshyiamehran9113"

/** Coming soon entries — metadata only */
export const VIDEO_SOLUTIONS: VideoSolution[] = [
  // Chemistry — Coming Soon
  {
    id: "vid-chem-121",
    title: "UBC CHEM 121",
    topic: "First Year Chemistry",
    subject: "Chemistry",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-chem-123",
    title: "UBC CHEM 123",
    topic: "First Year Chemistry",
    subject: "Chemistry",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-chem-154",
    title: "CHEM 154",
    topic: "First Year Chemistry",
    subject: "Chemistry",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-structure-bonding",
    title: "Structure and Bonding",
    topic: "Atomic Structure & Bonding",
    subject: "Chemistry",
    relatedPaper: "Structure and Bonding Practice Set",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-spectroscopy",
    title: "Spectroscopy",
    topic: "IR, NMR & Mass Spectrometry",
    subject: "Chemistry",
    relatedPaper: "Spectroscopy Practice Set",
    difficulty: "Advanced",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-organic-chemistry",
    title: "Organic Chemistry",
    topic: "Functional Groups & Mechanisms",
    subject: "Chemistry",
    relatedPaper: "Organic Chemistry Practice Set",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  // Mathematics — Coming Soon
  {
    id: "vid-calculus",
    title: "Calculus",
    topic: "Limits, Derivatives & Integrals",
    subject: "Mathematics",
    relatedPaper: "Calculus Practice Set",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-differentiation",
    title: "Differentiation",
    topic: "Rules & Applications",
    subject: "Mathematics",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-integration",
    title: "Integration",
    topic: "Techniques & Applications",
    subject: "Mathematics",
    relatedPaper: "Integration Techniques Practice Set",
    difficulty: "Advanced",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-differential-equations",
    title: "Differential Equations",
    topic: "First & Second Order DEs",
    subject: "Mathematics",
    relatedPaper: "Differential Equations Practice Set",
    difficulty: "Advanced",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-laplace",
    title: "Laplace Transforms",
    topic: "Transform Methods",
    subject: "Mathematics",
    difficulty: "Advanced",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-fourier",
    title: "Fourier Series",
    topic: "Periodic Functions & Series",
    subject: "Mathematics",
    difficulty: "Advanced",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-linear-algebra",
    title: "Linear Algebra",
    topic: "Matrices, Vectors & Systems",
    subject: "Mathematics",
    relatedPaper: "Linear Algebra Practice Set",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-probability",
    title: "Probability",
    topic: "Probability Theory",
    subject: "Mathematics",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
  {
    id: "vid-statistics",
    title: "Statistics",
    topic: "Statistical Analysis",
    subject: "Mathematics",
    relatedPaper: "Probability and Statistics Practice Set",
    difficulty: "Intermediate",
    youtubeUrl: YOUTUBE_CHANNEL_URL,
    status: "coming-soon",
  },
]

export function getVideosBySubject(subject: VideoSubject): VideoSolution[] {
  return VIDEO_SOLUTIONS.filter((v) => v.subject === subject)
}

export function getComingSoonVideos(): VideoSolution[] {
  return VIDEO_SOLUTIONS.filter((v) => v.status === "coming-soon")
}
