'use client'

import { useState, useEffect } from 'react'
import { BarChart, TrendingUp, AlertTriangle, CheckCircle, Clock, Sparkles, DollarSign, Target, ChevronRight, Lightbulb } from 'lucide-react'

export default function UsageOptimization({ token }) {
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecommendations()
        
        // Listen for refresh events
        const handleRefresh = () => fetchRecommendations()
        window.addEventListener('refreshRecommendations', handleRefresh)
        
        return () => {
            window.removeEventListener('refreshRecommendations', handleRefresh)
        }
    }, [])

    const fetchRecommendations = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/recommendations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    // Filter for usage optimization recommendations
                    const usageRecs = data.data?.recommendations?.filter(rec => 
                        rec.type === 'usage_optimization'
                    ) || []
                    
                    console.log('Raw usage recommendations:', usageRecs)
                    
                    // Process and parse JSON recommendations
                    const processedRecs = usageRecs.map(rec => {
                        // Try to parse the recommendation if it's a JSON string
                        let parsedRecommendations = []
                        
                        if (rec.recommendation) {
                            try {
                                // Check if recommendation contains JSON array
                                if (rec.recommendation.includes('[') && rec.recommendation.includes(']')) {
                                    // Extract JSON part from the text
                                    const jsonMatch = rec.recommendation.match(/\[[\s\S]*\]/);
                                    if (jsonMatch) {
                                        parsedRecommendations = JSON.parse(jsonMatch[0])
                                    }
                                }
                            } catch (error) {
                                console.log('Failed to parse JSON, using as text:', error)
                                // If parsing fails, treat as regular text recommendation
                                parsedRecommendations = [{
                                    recommendation: rec.recommendation,
                                    priority: rec.priority || 'Medium',
                                    potential_savings: rec.potential_savings || 'Not specified',
                                    action_steps: rec.action_steps || []
                                }]
                            }
                        }
                        
                        return {
                            ...rec,
                            parsedRecommendations: parsedRecommendations
                        }
                    })
                    
                    console.log('Processed recommendations:', processedRecs)
                    setRecommendations(processedRecs)
                }
            }
        } catch (error) {
            console.error('Error fetching usage recommendations:', error)
        } finally {
            setLoading(false)
        }
    }

    const getPriorityIcon = (priority) => {
        switch(priority?.toLowerCase()) {
            case 'high': return <AlertTriangle size={16} style={{ color: '#dc2626' }} />
            case 'medium': return <Clock size={16} style={{ color: '#d97706' }} />
            case 'low': return <CheckCircle size={16} style={{ color: '#059669' }} />
            default: return <TrendingUp size={16} style={{ color: '#0284c7' }} />
        }
    }

    const getPriorityStyle = (priority) => {
        const styles = {
            'high': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
            'medium': { bg: '#fff7ed', color: '#d97706', border: '#fed7aa' },
            'low': { bg: '#f0fdf4', color: '#059669', border: '#bbf7d0' },
        }
        return styles[priority?.toLowerCase()] || { bg: '#eff6ff', color: '#0284c7', border: '#bfdbfe' }
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ 
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #667eea',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ marginTop: '20px', color: '#666', fontSize: '16px' }}>
                    Loading AI-powered usage recommendations...
                </p>
            </div>
        )
    }

    // Flatten all parsed recommendations
    const allRecommendations = recommendations.flatMap(rec => 
        rec.parsedRecommendations.map(parsed => ({
            ...parsed,
            originalRec: rec,
            ai_generated: rec.ai_generated,
            createdAt: rec.createdAt
        }))
    )

    return (
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ 
                padding: '24px 28px', 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Sparkles size={24} />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                        AI Usage Optimization
                    </h3>
                </div>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                    Intelligent insights to maximize machine utilization and reduce operational costs
                </p>
            </div>

            {/* Content */}
            <div style={{ padding: '28px' }}>
                {allRecommendations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            opacity: 0.1
                        }}>
                            <BarChart size={36} style={{ color: 'white' }} />
                        </div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#4a5568', fontWeight: '600' }}>
                            No AI recommendations yet
                        </h4>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#718096', lineHeight: '1.5' }}>
                            Click "Generate AI Recommendations" to analyze your fleet data and get personalized optimization insights
                        </p>
                        <div style={{
                            padding: '16px 20px',
                            background: '#f7fafc',
                            borderRadius: '12px',
                            border: '1px dashed #cbd5e0'
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#4a5568', fontStyle: 'italic' }}>
                                💡 Our AI analyzes machine utilization, idle time, and operational patterns to suggest actionable improvements
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {allRecommendations.map((rec, index) => {
                            const priorityStyle = getPriorityStyle(rec.priority)
                            const isAIGenerated = rec.originalRec?.ai_generated || rec.ai_generated
                            
                            return (
                                <div
                                    key={`${rec.originalRec?.recommendationID || rec.originalRec?._id || index}`}
                                    style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        background: 'white'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                    }}
                                >
                                    {/* Header */}
                                    <div style={{ 
                                        padding: '20px 24px 16px',
                                        background: priorityStyle.bg,
                                        borderBottom: `1px solid ${priorityStyle.border}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                {getPriorityIcon(rec.priority)}
                                                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1a202c' }}>
                                                    {rec.recommendation || 'Usage Optimization Insight'}
                                                </h4>
                                                {isAIGenerated && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '600'
                                                    }}>
                                                        <Sparkles size={10} />
                                                        AI POWERED
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: priorityStyle.color,
                                                backgroundColor: 'white',
                                                border: `1px solid ${priorityStyle.border}`,
                                                textTransform: 'uppercase',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {rec.priority || 'Medium'} Priority
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: '24px' }}>
                                        {/* Potential Savings */}
                                        {rec.potential_savings && rec.potential_savings !== 'Not specified' && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '12px',
                                                padding: '16px',
                                                background: '#f0f9ff',
                                                borderRadius: '12px',
                                                border: '1px solid #bae6fd',
                                                marginBottom: '20px'
                                            }}>
                                                <DollarSign size={20} style={{ color: '#0284c7', marginTop: '2px' }} />
                                                <div>
                                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                                                        Potential Savings
                                                    </h5>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#0284c7', lineHeight: '1.5' }}>
                                                        {rec.potential_savings}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Steps */}
                                        {rec.action_steps && rec.action_steps.length > 0 && (
                                            <div style={{ marginTop: '20px' }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    marginBottom: '16px' 
                                                }}>
                                                    <Target size={18} style={{ color: '#059669' }} />
                                                    <h5 style={{ 
                                                        margin: 0, 
                                                        fontSize: '16px', 
                                                        fontWeight: '600', 
                                                        color: '#1f2937' 
                                                    }}>
                                                        Action Steps ({rec.action_steps.length})
                                                    </h5>
                                                </div>
                                                <div style={{ 
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px'
                                                }}>
                                                    {rec.action_steps.map((step, stepIndex) => (
                                                        <div
                                                            key={stepIndex}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                gap: '12px',
                                                                padding: '12px 16px',
                                                                background: '#f8fafc',
                                                                borderRadius: '8px',
                                                                border: '1px solid #e2e8f0'
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '24px',
                                                                height: '24px',
                                                                background: '#059669',
                                                                color: 'white',
                                                                borderRadius: '50%',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                minWidth: '24px'
                                                            }}>
                                                                {stepIndex + 1}
                                                            </div>
                                                            <p style={{ 
                                                                margin: 0, 
                                                                fontSize: '14px', 
                                                                color: '#374151',
                                                                lineHeight: '1.5',
                                                                flex: 1
                                                            }}>
                                                                {step}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Timestamp and AI attribution */}
                                        <div style={{ 
                                            marginTop: '24px',
                                            paddingTop: '16px',
                                            borderTop: '1px solid #f1f5f9',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                Generated: {new Date(rec.originalRec?.createdAt || rec.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            {isAIGenerated && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '11px',
                                                    color: '#6366f1',
                                                    fontWeight: '500'
                                                }}>
                                                    <Sparkles size={12} />
                                                    Powered by Gemini AI
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}