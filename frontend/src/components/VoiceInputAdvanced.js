'use client'

import { Mic, Square, Loader2, Send } from 'lucide-react'
import { useVoiceInputAdvanced } from '@/hooks/useVoiceInputAdvanced'

export default function VoiceInputAdvanced({
    formFields,
    currentFormData,
    onFormUpdate,
    className = '',
    placeholder = "Speak your requirements in any language..."
}) {
    const {
        isRecording,
        transcript,
        isProcessing,
        startRecording,
        stopRecording,
        processWithAI
    } = useVoiceInputAdvanced()

    const handleProcess = () => {
        if (transcript && onFormUpdate) {
            processWithAI(formFields, currentFormData, onFormUpdate)
        }
    }

    return (
        <div className={`voice-input-container ${className}`}>
            <div className="voice-input-card">
                <div className="voice-header">
                    <div className="voice-title">
                        <Mic className="h-5 w-5 text-blue-500" />
                        Voice Input Assistant
                    </div>
                    <div className="voice-subtitle">
                        {placeholder}
                    </div>
                </div>

                <div className="voice-controls">
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing}
                        className={`voice-btn ${isRecording
                                ? 'voice-btn-recording'
                                : 'voice-btn-ready'
                            } ${isProcessing ? 'voice-btn-disabled' : ''}`}
                    >
                        {isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : isRecording ? (
                            <>
                                <Square className="h-5 w-5" />
                                Stop Recording
                            </>
                        ) : (
                            <>
                                <Mic className="h-5 w-5" />
                                Start Voice Input
                            </>
                        )}
                    </button>
                </div>

                {transcript && (
                    <div className="voice-transcript">
                        <div className="transcript-content">
                            <p>"{transcript}"</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleProcess}
                            disabled={isProcessing}
                            className="transcript-process-btn"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing with AI...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Fill Form with AI
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
        .voice-input-container {
          margin-bottom: 2rem;
        }
        
        .voice-input-card {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: 2px solid #cbd5e1;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .voice-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        
        .voice-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 1.1rem;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }
        
        .voice-subtitle {
          color: #64748b;
          font-size: 0.875rem;
        }
        
        .voice-controls {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }
        
        .voice-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 50px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .voice-btn-ready {
          background: #3b82f6;
          color: white;
        }
        
        .voice-btn-ready:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .voice-btn-recording {
          background: #ef4444;
          color: white;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .voice-btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .voice-transcript {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1rem;
        }
        
        .transcript-content {
          margin-bottom: 1rem;
        }
        
        .transcript-content p {
          font-style: italic;
          color: #374151;
          margin: 0;
          padding: 0.75rem;
          background: #f8fafc;
          border-left: 4px solid #3b82f6;
          border-radius: 6px;
        }
        
        .transcript-process-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .transcript-process-btn:hover {
          background: #059669;
        }
        
        .transcript-process-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .8;
          }
        }
      `}</style>
        </div>
    )
}