import React, { useRef, useState } from 'react'
import API_URL from '../config';

export default function VoiceRecorder({ onSendAudio }) {
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([]) 
  const [isRecording, setIsRecording] = useState(false)
  const streamRef = useRef(null) 

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000 
        }
      })
      
      streamRef.current = stream
      audioChunksRef.current = [] 

      // Determine best MIME type
      const options = {
        mimeType: 'audio/webm;codecs=opus',
      }

      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options.mimeType = 'audio/ogg'
        }
      }

      console.log('🎤 Using MIME type:', options.mimeType)

      mediaRecorderRef.current = new MediaRecorder(stream, options)

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`📦 Chunk: ${(event.data.size / 1024).toFixed(2)} KB`)
          audioChunksRef.current.push(event.data) // ✅ Push to ref, not state
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log(`⏹️ Recording stopped. Chunks: ${audioChunksRef.current.length}`)
        
        // ✅ Now audioChunksRef has the correct data
        if (audioChunksRef.current.length === 0) {
          onSendAudio('⚠️ No audio recorded. Please try again.')
          cleanup()
          return
        }

        const mimeType = mediaRecorderRef.current.mimeType
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        
        console.log(`🎵 Blob created: ${(audioBlob.size / 1024).toFixed(2)} KB`)

        if (audioBlob.size < 1000) {
          onSendAudio('⚠️ Recording too short. Please speak for longer.')
          cleanup()
          return
        }

        // Determine file extension
        let fileName = 'voice.webm'
        if (mimeType.includes('mp4')) fileName = 'voice.mp4'
        else if (mimeType.includes('wav')) fileName = 'voice.wav'
        else if (mimeType.includes('ogg')) fileName = 'voice.ogg'

        const audioFile = new File([audioBlob], fileName, { type: mimeType })

        try {
          const formData = new FormData()
          formData.append('file', audioFile)

          console.log(`📤 Sending: ${fileName}, ${(audioFile.size / 1024).toFixed(2)} KB`)

          const res = await fetch('${API_URL}/transcribe', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || `HTTP ${res.status}`)
          }

          const data = await res.json()
          console.log('✅ Response:', data)

          if (data.success && data.text && data.text.trim()) {
            onSendAudio(data.text.trim())
          } else if (data.success) {
            onSendAudio('⚠️ No speech detected in audio.')
          } else {
            throw new Error(data.error || 'Transcription failed')
          }
        } catch (err) {
          console.error('❌ Transcription error:', err)
          onSendAudio(`⚠️ Transcription failed: ${err.message}`)
        } finally {
          cleanup()
        }
      }

      mediaRecorderRef.current.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error)
        onSendAudio('⚠️ Recording error occurred.')
        cleanup()
      }

      // ✅ Start with timeslice to get chunks during recording
      mediaRecorderRef.current.start(1000) // Chunk every 1 second
      setIsRecording(true)
      console.log('🔴 Recording started')

    } catch (err) {
      console.error('❌ Mic access error:', err)
      let message = '⚠️ Microphone access denied.'
      
      if (err.name === 'NotAllowedError') {
        message = '⚠️ Please allow microphone access in browser settings.'
      } else if (err.name === 'NotFoundError') {
        message = '⚠️ No microphone found. Please connect one.'
      }
      
      onSendAudio(message)
      cleanup()
    }
  }

  const stopRecording = () => {
    console.log('⏸️ Stopping recording...')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    audioChunksRef.current = []
  }

  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <button
          className="voice-btn start-recording"
          onClick={startRecording}
          title="Start voice recording"
        >
          🎤 Start
        </button>
      ) : (
        <button
          className="voice-btn stop-recording"
          onClick={stopRecording}
          title="Stop recording and transcribe"
        >
          ⏹ Stop
        </button>
      )}
    </div>
  )
}