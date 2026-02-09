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
    }
  }
}

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let levelInterval: ReturnType<typeof setInterval> | null = null

async function startRecording(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      },
    })

    // Set up audio level monitoring
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    // Monitor audio levels for UI feedback
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    levelInterval = setInterval(() => {
      if (analyser) {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalized = Math.min(average / 128, 1)
        window.recorderApi.sendAudioLevel(normalized)
      }
    }, 100)

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

      // Clean up
      stream.getTracks().forEach((track) => track.stop())
      if (levelInterval) {
        clearInterval(levelInterval)
        levelInterval = null
      }
      if (audioContext) {
        audioContext.close()
        audioContext = null
      }
      analyser = null
      audioChunks = []
    }

    // Record in 250ms chunks
    mediaRecorder.start(250)
    console.log('Recording started')
  } catch (error) {
    console.error('Failed to start recording:', error)
  }
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    console.log('Recording stopped')
  }
}

// Listen for commands from main process
window.recorderApi.onStartRecording(() => {
  startRecording()
})

window.recorderApi.onStopRecording(() => {
  stopRecording()
})

console.log('Recorder window initialized')
