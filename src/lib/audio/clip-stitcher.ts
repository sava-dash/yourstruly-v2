/**
 * Audio Clip Stitcher
 *
 * Extracts individual audio clips from a stereo recording
 * where left channel = AI voice and right channel = user voice.
 * Uses transcript timestamps to split the recording into per-exchange clips.
 */

import type { TranscriptEntry } from '@/types/voice'

export interface AudioClip {
  /** Which exchange this clip belongs to (0-indexed) */
  exchangeIndex: number
  /** Whether this is the question (AI) or answer (user) */
  part: 'question' | 'answer'
  /** The audio blob for this clip */
  blob: Blob
  /** Duration in seconds */
  duration: number
  /** The transcript text for this clip */
  text: string
}

export interface StitchedConversation {
  /** Individual clips in playback order: Q1, A1, Q2, A2, ... */
  clips: AudioClip[]
  /** The full stitched audio blob (all clips concatenated with brief pauses) */
  fullBlob: Blob
  /** Total duration in seconds */
  totalDuration: number
}

/**
 * Decode a webm/opus blob into an AudioBuffer
 */
async function decodeBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new OfflineAudioContext(2, 1, 24000) // temp context for decoding
  return audioContext.decodeAudioData(arrayBuffer)
}

/**
 * Extract a mono channel segment from an AudioBuffer as Float32Array
 */
function extractChannelSegment(
  buffer: AudioBuffer,
  channel: number,
  startSample: number,
  endSample: number
): Float32Array {
  const channelData = buffer.getChannelData(channel)
  const clampedStart = Math.max(0, Math.min(startSample, channelData.length))
  const clampedEnd = Math.max(clampedStart, Math.min(endSample, channelData.length))
  return channelData.slice(clampedStart, clampedEnd)
}

/**
 * Encode a Float32Array as a WAV blob (mono)
 */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true)  // PCM format
  view.setUint16(22, 1, true)  // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)  // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // Convert float32 to int16
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/**
 * Generate silence as Float32Array
 */
function generateSilence(durationSeconds: number, sampleRate: number): Float32Array {
  return new Float32Array(Math.round(durationSeconds * sampleRate))
}

/**
 * Pair transcript entries into exchanges (assistant question + user answer)
 */
function pairExchanges(transcript: TranscriptEntry[]): Array<{
  question: TranscriptEntry
  answer: TranscriptEntry | null
}> {
  const exchanges: Array<{ question: TranscriptEntry; answer: TranscriptEntry | null }> = []
  
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i]
    if (entry.role === 'assistant') {
      // Find the next user message
      const nextUser = transcript.slice(i + 1).find(e => e.role === 'user')
      exchanges.push({ question: entry, answer: nextUser || null })
    }
  }
  
  return exchanges
}

/**
 * Calculate time boundaries for a transcript entry within the recording.
 * Returns [startSeconds, endSeconds] relative to recording start.
 * 
 * We estimate end time as the start of the next entry (or +duration estimate).
 */
function getTimeBounds(
  entry: TranscriptEntry,
  allEntries: TranscriptEntry[],
  recordingStartMs: number
): [number, number] {
  const startMs = entry.timestamp - recordingStartMs
  const startSec = Math.max(0, startMs / 1000)
  
  // Find the next entry in the transcript
  const idx = allEntries.indexOf(entry)
  let endSec: number
  
  if (idx < allEntries.length - 1) {
    const nextEntry = allEntries[idx + 1]
    endSec = Math.max(startSec, (nextEntry.timestamp - recordingStartMs) / 1000)
  } else {
    // Last entry — estimate duration based on text length (~150 words/min for speech)
    const wordCount = entry.text.split(/\s+/).length
    const estimatedDuration = Math.max(2, (wordCount / 150) * 60)
    endSec = startSec + estimatedDuration
  }
  
  return [startSec, endSec]
}

/**
 * Extract clips from a stereo recording using transcript timestamps.
 * 
 * @param recordingBlob - Stereo webm blob (left=AI, right=user)
 * @param transcript - Array of transcript entries with timestamps
 * @param recordingStartMs - The Date.now() value when recording started
 * @returns Array of audio clips and a full stitched blob
 */
export async function extractConversationClips(
  recordingBlob: Blob,
  transcript: TranscriptEntry[],
  recordingStartMs: number
): Promise<StitchedConversation> {
  // Decode the stereo recording
  const audioBuffer = await decodeBlob(recordingBlob)
  const sampleRate = audioBuffer.sampleRate
  const pauseDuration = 0.4 // seconds between clips
  
  // Pair into exchanges
  const exchanges = pairExchanges(transcript)
  
  const clips: AudioClip[] = []
  const allSegments: Float32Array[] = [] // for building the full stitched blob
  
  for (let i = 0; i < exchanges.length; i++) {
    const { question, answer } = exchanges[i]
    
    // Extract AI question from left channel (channel 0)
    const [qStart, qEnd] = getTimeBounds(question, transcript, recordingStartMs)
    const qStartSample = Math.round(qStart * sampleRate)
    const qEndSample = Math.round(qEnd * sampleRate)
    const questionSamples = extractChannelSegment(audioBuffer, 0, qStartSample, qEndSample)
    
    if (questionSamples.length > 0) {
      const questionBlob = encodeWav(questionSamples, sampleRate)
      clips.push({
        exchangeIndex: i,
        part: 'question',
        blob: questionBlob,
        duration: questionSamples.length / sampleRate,
        text: question.text,
      })
      allSegments.push(questionSamples)
      allSegments.push(generateSilence(pauseDuration, sampleRate))
    }
    
    // Extract user answer from right channel (channel 1)
    if (answer) {
      const [aStart, aEnd] = getTimeBounds(answer, transcript, recordingStartMs)
      const aStartSample = Math.round(aStart * sampleRate)
      const aEndSample = Math.round(aEnd * sampleRate)
      const answerSamples = extractChannelSegment(audioBuffer, 1, aStartSample, aEndSample)
      
      if (answerSamples.length > 0) {
        const answerBlob = encodeWav(answerSamples, sampleRate)
        clips.push({
          exchangeIndex: i,
          part: 'answer',
          blob: answerBlob,
          duration: answerSamples.length / sampleRate,
          text: answer.text,
        })
        allSegments.push(answerSamples)
        
        // Add pause between exchanges (but not after the last one)
        if (i < exchanges.length - 1) {
          allSegments.push(generateSilence(pauseDuration * 1.5, sampleRate))
        }
      }
    }
  }
  
  // Build the full stitched blob
  const totalLength = allSegments.reduce((sum, seg) => sum + seg.length, 0)
  const fullSamples = new Float32Array(totalLength)
  let offset = 0
  for (const segment of allSegments) {
    fullSamples.set(segment, offset)
    offset += segment.length
  }
  
  const fullBlob = encodeWav(fullSamples, sampleRate)
  
  return {
    clips,
    fullBlob,
    totalDuration: totalLength / sampleRate,
  }
}
