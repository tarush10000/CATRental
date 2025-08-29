'use client'

import { useState, useEffect } from 'react'
import { 
    Lightbulb, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, 
    Sparkles, RefreshCw, Target, DollarSign, BarChart, Clock,
    Zap, ChevronRight, Users, Truck
} from 'lucide-react'

export default function CustomerRecommendations({ session }) {
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)

    useEffect(() => {
        fetchRecommendations()
    }, [])

    const fetchRecommendations = async () => {
        try {
            setLoading(true)
            // Get customer-specific recommendations
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/recommendations`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            const data = await response.json()
            
            if (data.success) {
                // Filter for customer recommendations
                const customerRecs = data.data?.recommendations?.filter(rec => 
                    rec.type?.includes('customer') || 
                    rec.targetUserType === 'customer' ||
                    rec.userID === session.user.id
                ) || []
                
                console.log('Customer recommendations:', customerRecs)
                setRecommendations(customerRecs)
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateCustomerRecommendations = async () => {
        try {
            setGenerating(true)
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/generate-customer-recommendations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
            })
            
            const result = await response.json()
            
            if (result.success) {
                alert(`✨ Generated personalized AI recommendations based on your machine usage patterns!`)
                fetchRecommendations()
            } else {
                alert('❌ Failed to generate recommendations: ' + result.message)
            }
        } catch (error) {
            console.error('Error generating recommendations:', error)
            alert('❌ Error generating recommendations. Please try again.')
        } finally {
            setGenerating(false)
        }
    }

    const parseRecommendationContent = (rec) => {
        // Try to parse JSON if the recommendation contains it
        if (rec.recommendation && rec.recommendation.includes('[')) {
            try {
                const jsonMatch = rec.recommendation.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0])
                }
            } catch (error) {
                console.log('Failed to parse JSON, using as text')
            }
        }
        
        // Return as single recommendation if not JSON array
        return [{
            recommendation: rec.recommendation || 'Optimize your machine usage',
            priority: rec.priority || 'Medium',
            potential_savings: rec.potential_savings || 'Monitor usage patterns',
            action_steps: rec.action_steps || []
        }]
    }

    const getRecommendationIcon = (type, priority) => {
        if (type?.includes('reduce')) return <TrendingDown size={20} style={{ color: '#dc2626' }} />
        if (type?.includes('increase')) return <TrendingUp size={20} style={{ color: '#2563eb' }} />
        if (priority?.toLowerCase() === 'high') return <AlertTriangle size={20} style={{ color: '#dc2626' }} />
        return <Lightbulb size={20} style={{ color: '#059669' }} />
    }

    const getPriorityStyle = (priority) => {
        const styles = {
            'high': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', bgDark: '#dc2626' },
            'medium': { bg: '#fff7ed', color: '#d97706', border: '#fed7aa', bgDark: '#d97706' },
            'low': { bg: '#f0fdf4', color: '#059669', border: '#bbf7d0', bgDark: '#059669' },
        }
        return styles[priority?.toLowerCase()] || { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', bgDark: '#2563eb' }
    }

    // Process all recommendations
    const allRecommendations = recommendations.flatMap(rec => 
        parseRecommendationContent(rec).map((parsed, index) => ({
            ...parsed,
            originalRec: rec,
            uniqueId: `${rec.recommendationID || rec._id}-${index}`,
            ai_generated: rec.ai_generated,
            createdAt: rec.createdAt
        }))
    )

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
                    Loading your personalized recommendations...
                </p>
            </div>
        )
    }

    return (
        <div>
            {/* Page Header with Generation Button */}
            <div style={{ 
                padding: '24px 28px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                color: 'white',
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        fontSize: '24px', 
                        fontWeight: '700',
                        color: 'white',
                        margin: '0 0 8px 0'
                    }}>
                        <Lightbulb size={28} style={{ color: '#ffd700' }} />
                        My Smart Recommendations
                    </h1>
                    <p style={{ 
                        fontSize: '15px', 
                        color: 'rgba(255,255,255,0.9)', 
                        margin: 0 
                    }}>
                        Personalized AI insights to optimize your machine usage and reduce costs
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={generateCustomerRecommendations}
                        disabled={generating}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            background: generating ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)',
                            color: generating ? 'rgba(255,255,255,0.7)' : '#667eea',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: generating ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    >
                        {generating ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Get AI Recommendations
                            </>
                        )}
                    </button>
                    <button
                        onClick={fetchRecommendations}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Recommendations Content */}
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {allRecommendations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 40px' }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            opacity: 0.1
                        }}>
                            <Lightbulb size={48} style={{ color: 'white' }} />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#4a5568', fontWeight: '600' }}>
                            No recommendations yet
                        </h3>
                        <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#718096', lineHeight: '1.5', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                            Click "Get AI Recommendations" to analyze your machine usage patterns and receive personalized optimization insights
                        </p>
                        <div style={{
                            padding: '20px 24px',
                            background: '#f7fafc',
                            borderRadius: '12px',
                            border: '1px dashed #cbd5e0',
                            maxWidth: '500px',
                            margin: '0 auto'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <Sparkles size={20} style={{ color: '#667eea' }} />
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#4a5568' }}>
                                    AI-Powered Insights
                                </h4>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
                                Our AI analyzes your machine utilization, operating patterns, and costs to provide personalized recommendations for maximum efficiency
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '28px' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ 
                                margin: '0 0 8px 0', 
                                fontSize: '20px', 
                                fontWeight: '700', 
                                color: '#1a202c',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <Sparkles size={20} style={{ color: '#667eea' }} />
                                Personalized Recommendations ({allRecommendations.length})
                            </h2>
                            <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
                                AI-analyzed insights based on your machine usage patterns
                            </p>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {allRecommendations.map((rec) => {
                                const priorityStyle = getPriorityStyle(rec.priority)
                                const isAIGenerated = rec.originalRec?.ai_generated || rec.ai_generated
                                
                                return (
                                    <div
                                        key={rec.uniqueId}
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
                                            padding: '20px 24px',
                                            background: `linear-gradient(135deg, ${priorityStyle.bgDark}15 0%, ${priorityStyle.bgDark}25 100%)`,
                                            borderBottom: `1px solid ${priorityStyle.border}`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                    {getRecommendationIcon(rec.recommendation, rec.priority)}
                                                    <div style={{ flex: 1 }}>
                                                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#1a202c', lineHeight: '1.3' }}>
                                                            {rec.recommendation}
                                                        </h3>
                                                        {isAIGenerated && (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                padding: '4px 10px',
                                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                color: 'white',
                                                                borderRadius: '16px',
                                                                fontSize: '11px',
                                                                fontWeight: '600'
                                                            }}>
                                                                <Sparkles size={12} />
                                                                AI POWERED
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '8px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    color: priorityStyle.color,
                                                    backgroundColor: 'white',
                                                    border: `2px solid ${priorityStyle.border}`,
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                }}>
                                                    {rec.priority === 'high' && <Zap size={12} />}
                                                    {rec.priority === 'medium' && <Clock size={12} />}
                                                    {rec.priority === 'low' && <CheckCircle size={12} />}
                                                    {rec.priority || 'Medium'} Priority
                                                </span>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div style={{ padding: '28px' }}>
                                            {/* Potential Savings */}
                                            {rec.potential_savings && rec.potential_savings !== 'Not specified' && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '16px',
                                                    padding: '20px',
                                                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                                    borderRadius: '12px',
                                                    border: '1px solid #bae6fd',
                                                    marginBottom: '24px'
                                                }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        background: '#0284c7',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        minWidth: '40px'
                                                    }}>
                                                        <DollarSign size={20} style={{ color: 'white' }} />
                                                    </div>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#0369a1' }}>
                                                            Potential Impact
                                                        </h4>
                                                        <p style={{ margin: 0, fontSize: '15px', color: '#0284c7', lineHeight: '1.5', fontWeight: '500' }}>
                                                            {rec.potential_savings}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Steps */}
                                            {rec.action_steps && rec.action_steps.length > 0 && (
                                                <div style={{ marginTop: '24px' }}>
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '10px', 
                                                        marginBottom: '20px' 
                                                    }}>
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            background: '#059669',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Target size={16} style={{ color: 'white' }} />
                                                        </div>
                                                        <h4 style={{ 
                                                            margin: 0, 
                                                            fontSize: '17px', 
                                                            fontWeight: '600', 
                                                            color: '#1f2937' 
                                                        }}>
                                                            Action Steps ({rec.action_steps.length})
                                                        </h4>
                                                    </div>
                                                    
                                                    <div style={{ 
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '16px'
                                                    }}>
                                                        {rec.action_steps.map((step, stepIndex) => (
                                                            <div
                                                                key={stepIndex}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'flex-start',
                                                                    gap: '16px',
                                                                    padding: '16px 20px',
                                                                    background: '#f8fafc',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid #e2e8f0',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = '#f1f5f9'
                                                                    e.currentTarget.style.borderColor = '#cbd5e1'
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = '#f8fafc'
                                                                    e.currentTarget.style.borderColor = '#e2e8f0'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    background: priorityStyle.bgDark,
                                                                    color: 'white',
                                                                    borderRadius: '50%',
                                                                    fontSize: '13px',
                                                                    fontWeight: '700',
                                                                    minWidth: '28px'
                                                                }}>
                                                                    {stepIndex + 1}
                                                                </div>
                                                                <p style={{ 
                                                                    margin: 0, 
                                                                    fontSize: '15px', 
                                                                    color: '#374151',
                                                                    lineHeight: '1.6',
                                                                    flex: 1,
                                                                    fontWeight: '400'
                                                                }}>
                                                                    {step}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Footer with timestamp and actions */}
                                            <div style={{ 
                                                marginTop: '28px',
                                                paddingTop: '20px',
                                                borderTop: '1px solid #f1f5f9',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>
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
                                                            fontWeight: '600'
                                                        }}>
                                                            <Sparkles size={12} />
                                                            Powered by Gemini AI
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '8px 14px',
                                                        background: '#f0fdf4',
                                                        color: '#059669',
                                                        border: '1px solid #bbf7d0',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <CheckCircle size={14} />
                                                        Mark as Reviewed
                                                    </button>
                                                    <button style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '8px 14px',
                                                        background: '#fffbeb',
                                                        color: '#d97706',
                                                        border: '1px solid #fed7aa',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <Users size={14} />
                                                        Contact Admin
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}