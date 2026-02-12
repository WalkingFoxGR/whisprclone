// Hidden recorder window - captures audio from microphone
// This runs in a hidden BrowserWindow with its own preload (recorder.ts)

declare global {
  interface Window {
    recorderApi: {
      onStartRecording: (callback: () => void) => void
      onStopRecording: (callback: () => void) => void
      sendAudioData: (data: ArrayBuffer) => void
      sendRecordingComplete: (audioData: ArrayBuffer) => void
      sendAudioLevel: (level: number) => void
      sendAudioBins: (bins: number[]) => void
    }
  }
}

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let levelInterval: ReturnType<typeof setInterval> | null = null

// Pre-warmed mic stream — kept alive so recording starts instantly
let warmStream: MediaStream | null = null
let warmAudioContext: AudioContext | null = null
let warmAnalyser: AnalyserNode | null = null
let warmSource: MediaStreamAudioSourceNode | null = null

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000,
}

/**
 * Pre-warm the microphone: acquire the stream and set up the AudioContext
 * so that when startRecording() is called, there's zero delay.
 */
async function warmUpMic(): Promise<void> {
  try {
    warmStream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS })
    warmAudioContext = new AudioContext()
    if (warmAudioContext.state === 'suspended') {
      await warmAudioContext.resume()
    }
    warmSource = warmAudioContext.createMediaStreamSource(warmStream)
    warmAnalyser = warmAudioContext.createAnalyser()
    warmAnalyser.fftSize = 256
    warmAnalyser.smoothingTimeConstant = 0.1
    warmSource.connect(warmAnalyser)
    console.log('[recorder] Mic pre-warmed and ready')
  } catch (err) {
    console.warn('[recorder] Could not pre-warm mic:', err)
  }
}

async function startRecording(): Promise<void> {
  try {
    let stream: MediaStream

    // Use pre-warmed stream if available, otherwise acquire fresh
    if (warmStream && warmStream.getAudioTracks().length > 0 && warmStream.getAudioTracks()[0].readyState === 'live') {
      stream = warmStream
      audioContext = warmAudioContext
      analyser = warmAnalyser
      // Clear warm references so they aren't reused/closed prematurely
      warmStream = null
      warmAudioContext = null
      warmAnalyser = null
      warmSource = null
      console.log('[recorder] Using pre-warmed mic stream (instant start)')
    } else {
      // Fallback: acquire fresh stream
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS })
      audioContext = new AudioContext()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      const source = audioContext.createMediaStreamSource(stream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.1
      source.connect(analyser)
      console.log('[recorder] Using fresh mic stream (cold start)')
    }

    // Ensure AudioContext is running
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    // Monitor audio levels for UI feedback — send waveform bins
    const timeData = new Uint8Array(analyser!.fftSize)
    levelInterval = setInterval(() => {
      if (analyser) {
        // Use time-domain data — responds instantly (no FFT ramp-up delay)
        analyser.getByteTimeDomainData(timeData)

        // Calculate audio level from time-domain (RMS of deviation from 128 center)
        let sumSq = 0
        for (let i = 0; i < timeData.length; i++) {
          const deviation = (timeData[i] - 128) / 128
          sumSq += deviation * deviation
        }
        const rms = Math.sqrt(sumSq / timeData.length)
        window.recorderApi.sendAudioLevel(Math.min(rms * 2, 1))

        // Build 32 bins from time-domain data for waveform visualization
        // Group samples into 32 buckets, take peak amplitude of each
        const bins: number[] = []
        const samplesPerBin = Math.floor(timeData.length / 32)
        for (let i = 0; i < 32; i++) {
          let peak = 0
          for (let j = 0; j < samplesPerBin; j++) {
            const amp = Math.abs(timeData[i * samplesPerBin + j] - 128) / 128
            if (amp > peak) peak = amp
          }
          bins.push(Math.min(peak * 2, 1))
        }
        window.recorderApi.sendAudioBins(bins)
      }
    }, 50)

    // Create MediaRecorder with WebM/Opus codec
    audioChunks = []
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 64000,
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = async () => {
      // Combine all chunks into a single blob
      const audioBlob = new Blob(audioChunks, { type: mimeType })
      const arrayBuffer = await audioBlob.arrayBuffer()

      // Send complete audio to main process
      window.recorderApi.sendRecordingComplete(arrayBuffer)

      // Clean up recording state
      if (levelInterval) {
        clearInterval(levelInterval)
        levelInterval = null
      }

      // Don't close the stream — re-warm it for the next recording instead
      reWarmMic(stream)

      mediaRecorder = null
      audioChunks = []
    }

    // Record in 100ms chunks (smaller = less audio lost at boundaries)
    mediaRecorder.start(100)
    console.log('[recorder] Recording started')
  } catch (error) {
    console.error('[recorder] Failed to start recording:', error)
    // Try to re-warm for next attempt
    warmUpMic()
  }
}

/**
 * After a recording ends, re-warm the mic with the existing stream
 * so the next recording starts instantly too.
 */
async function reWarmMic(stream: MediaStream): Promise<void> {
  try {
    // Close previous audio context if still open
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    analyser = null

    // Check if the stream is still usable
    const tracks = stream.getAudioTracks()
    if (tracks.length > 0 && tracks[0].readyState === 'live') {
      warmStream = stream
      warmAudioContext = new AudioContext()
      if (warmAudioContext.state === 'suspended') {
        await warmAudioContext.resume()
      }
      warmSource = warmAudioContext.createMediaStreamSource(warmStream)
      warmAnalyser = warmAudioContext.createAnalyser()
      warmAnalyser.fftSize = 256
      warmAnalyser.smoothingTimeConstant = 0.1
      warmSource.connect(warmAnalyser)
      console.log('[recorder] Mic re-warmed for next recording')
    } else {
      // Stream died, get a fresh one
      stream.getTracks().forEach((t) => t.stop())
      warmUpMic()
    }
  } catch {
    warmUpMic()
  }
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    console.log('[recorder] Recording stopped')
  }
}

// Listen for commands from main process
window.recorderApi.onStartRecording(() => {
  startRecording()
})

window.recorderApi.onStopRecording(() => {
  stopRecording()
})

// Pre-warm mic on startup so first recording is instant
warmUpMic()

console.log('[recorder] Recorder window initialized')
