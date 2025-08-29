'use client'

import { useState, useRef, useEffect } from 'react'

export const useVoiceInput = () => {
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const recognitionRef = useRef(null)

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()

            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true
            recognitionRef.current.lang = 'auto'

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = ''
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + ' ' + finalTranscript)
                }
            }

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error)
                setIsRecording(false)
            }

            recognitionRef.current.onend = () => {
                setIsRecording(false)
            }
        }
    }, [])

    const startRecording = () => {
        if (recognitionRef.current) {
            setTranscript('')
            setIsRecording(true)
            recognitionRef.current.start()
        }
    }

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop()
            setIsRecording(false)
        }
    }

    return {
        isRecording,
        transcript,
        isProcessing,
        setIsProcessing,
        startRecording,
        stopRecording,
        setTranscript
    }
}