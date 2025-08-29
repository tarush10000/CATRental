'use client'

import { useState, useRef, useEffect } from 'react'

export const useVoiceInputAdvanced = () => {
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

    const processWithAI = async (formFields, currentFormData, onFormUpdate) => {
        console.log('processWithAI called with:', { formFields, currentFormData, transcript })
        setIsProcessing(true)

        try {
            console.log('Sending to API...')
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    formFields,
                    currentFormData
                })
            })

            console.log('API response status:', response.status)
            const result = await response.json()
            console.log('API result:', result)

            if (result.success && onFormUpdate) {
                console.log('Calling onFormUpdate with:', result.data)
                onFormUpdate(result.data)

                // Update transcript to show success
                setTranscript(`✅ Form updated! Filled: ${Object.keys(result.data).join(', ')}`)
            } else {
                console.error('API call failed:', result)
                setTranscript('❌ Failed to process. Please try again.')
            }
        } catch (error) {
            console.error('Error processing voice input:', error)
            setTranscript('❌ Error occurred. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    return {
        isRecording,
        transcript,
        isProcessing,
        startRecording,
        stopRecording,
        processWithAI,
        setTranscript
    }
}