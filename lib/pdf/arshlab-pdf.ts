"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export interface PdfChoice {
  label: string
  text: string
}

export interface PdfQuestion {
  questionNumber: number
  question: string
  choices?: Array<string | PdfChoice>
  correctAnswer?: string
  explanation?: string
  topic?: string
  subtopic?: string
}

export interface PdfMetadataRow {
  label: string
  value: string | number
}

export interface RecoverySummaryRow {
  concept: string
  startingMastery: string | number
  endingMastery: string | number
}

interface QuestionPdfOptions {
  filename: string
  title: string
  subtitle: string
  metadata: PdfMetadataRow[]
  questions: PdfQuestion[]
  includeSolutions?: boolean
  recoverySummary?: RecoverySummaryRow[]
}

interface AnswerKeyPdfOptions {
  filename: string
  title?: string
  metadata?: PdfMetadataRow[]
  questions: PdfQuestion[]
}

const margin = 16
const pageWidth = 210
const pageHeight = 297
const contentWidth = pageWidth - margin * 2

function todayLabel(): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date())
}

export function generatedDateLabel(): string {
  return todayLabel()
}

function lastAutoTableY(doc: jsPDF, fallback: number): number {
  const tableDoc = doc as jsPDF & { lastAutoTable?: { finalY?: number } }
  return tableDoc.lastAutoTable?.finalY ?? fallback
}

function addHeader(doc: jsPDF, title: string, subtitle: string): number {
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(title, margin, 18)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(subtitle, margin, 26)
  doc.setLineWidth(0.2)
  doc.line(margin, 31, pageWidth - margin, 31)
  return 39
}

function addMetadata(doc: jsPDF, metadata: PdfMetadataRow[], startY: number): number {
  if (metadata.length === 0) return startY

  autoTable(doc, {
    startY,
    body: metadata.map((row) => [row.label, String(row.value)]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 1.5,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 42 },
      1: { cellWidth: contentWidth - 42 },
    },
    margin: { left: margin, right: margin },
  })

  return lastAutoTableY(doc, startY) + 8
}

function addRecoverySummary(doc: jsPDF, rows: RecoverySummaryRow[] | undefined, startY: number): number {
  if (!rows || rows.length === 0) return startY

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Weak Concepts Targeted", margin, startY)

  autoTable(doc, {
    startY: startY + 4,
    head: [["Concept", "Starting Mastery", "Ending Mastery"]],
    body: rows.map((row) => [row.concept, `${row.startingMastery}`, `${row.endingMastery}`]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    margin: { left: margin, right: margin },
  })

  return lastAutoTableY(doc, startY) + 10
}

function ensureSpace(doc: jsPDF, y: number, needed = 14): number {
  if (y + needed <= pageHeight - margin) return y
  doc.addPage()
  return margin
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 5): number {
  const lines = doc.splitTextToSize(text, width)
  let nextY = y

  for (const line of lines) {
    nextY = ensureSpace(doc, nextY, lineHeight + 1)
    doc.text(line, x, nextY)
    nextY += lineHeight
  }

  return nextY
}

function choiceText(choice: string | PdfChoice, index: number): string {
  if (typeof choice === "string") {
    const label = String.fromCharCode(65 + index)
    return /^[A-D][.)]\s*/i.test(choice) ? choice : `${label}. ${choice}`
  }
  return `${choice.label}. ${choice.text}`
}

function addQuestionBlock(doc: jsPDF, question: PdfQuestion, y: number, includeSolutions: boolean): number {
  let nextY = ensureSpace(doc, y, 24)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  nextY = addWrappedText(doc, `${question.questionNumber}. ${question.question}`, margin, nextY, contentWidth)

  if (question.choices?.length) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    nextY += 1
    question.choices.forEach((choice, index) => {
      nextY = addWrappedText(doc, choiceText(choice, index), margin + 4, nextY, contentWidth - 4, 4.8)
    })
  }

  if (includeSolutions) {
    nextY += 2
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    nextY = addWrappedText(doc, `Answer: ${question.correctAnswer ?? "Unavailable"}`, margin + 4, nextY, contentWidth - 4, 4.8)
    doc.setFont("helvetica", "normal")
    nextY = addWrappedText(doc, `Explanation: ${question.explanation ?? "Unavailable"}`, margin + 4, nextY + 1, contentWidth - 4, 4.8)
  }

  nextY = ensureSpace(doc, nextY + 4, 6)
  doc.setLineWidth(0.1)
  doc.line(margin, nextY, pageWidth - margin, nextY)
  return nextY + 8
}

function addFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.text(`ARSHLAB | Page ${page} of ${pageCount}`, margin, pageHeight - 8)
  }
}

export function downloadQuestionPdf(options: QuestionPdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  let y = addHeader(doc, "ARSHLAB", options.subtitle)
  y = addMetadata(doc, options.metadata, y)
  y = addRecoverySummary(doc, options.recoverySummary, y)

  for (const question of options.questions) {
    y = addQuestionBlock(doc, question, y, Boolean(options.includeSolutions))
  }

  addFooters(doc)
  doc.save(options.filename)
}

export function downloadAnswerKeyPdf(options: AnswerKeyPdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  let y = addHeader(doc, "ARSHLAB Answer Key", options.title ?? "Answer Key")
  y = addMetadata(doc, options.metadata ?? [], y)

  for (const question of options.questions) {
    y = ensureSpace(doc, y, 24)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(`Question ${question.questionNumber}`, margin, y)
    y += 6
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    y = addWrappedText(doc, `Answer: ${question.correctAnswer ?? "Unavailable"}`, margin, y, contentWidth)
    doc.setFont("helvetica", "normal")
    y = addWrappedText(doc, `Explanation: ${question.explanation ?? "Unavailable"}`, margin, y + 1, contentWidth, 4.8)
    y += 6
  }

  addFooters(doc)
  doc.save(options.filename)
}
