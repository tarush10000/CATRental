'use client'

import { Mic, Square, Loader2, Send } from 'lucide-react'
import { useVoiceInput } from '@/hooks/useVoiceInput'

export default function VoiceInput({ onProcessVoice, className = '' }) {
    const {
        isRecording,
        transcript,
        isProcessing,
        setIsProcessing,
        startRecording,
        stopRecording,
        setTranscript
    } = useVoiceInput()

    const handleProcess = async () => {
        if (transcript && onProcessVoice) {
            setIsProcessing(true)
            try {
                await onProcessVoice(transcript)
            } finally {
                setIsProcessing(false)
            }
        }
    }

    return (
        <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200 ${className}`}>
            <div className="flex items-center justify-center mb-3">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                        <>
                            <Square className="h-4 w-4" />
                            Stop
                        </>
                    ) : (
                        <>
                            <Mic className="h-4 w-4" />
                            Voice Input
                        </>
                    )}
                </button>
            </div>

            {transcript && (
                <div className="bg-white rounded-lg p-3 mb-3 border">
                    <p className="text-sm text-gray-600 italic">"{transcript}"</p>
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="mt-2 flex items-center gap-2 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 text-sm"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Send className="h-3 w-3" />
                                Fill Form
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="text-xs text-gray-600 text-center">
                Speak in any language - AI will translate to English
            </div>
        </div>
    )
}