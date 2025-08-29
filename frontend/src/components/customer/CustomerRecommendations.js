'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react'

export default function CustomerRecommendations({ session }) {
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRecommendations()
    }, [])

    const fetchRecommendations = async () => {
        try {
            // Get usage recommendations specifically for this customer
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/usage-optimization?user_id=${session.user.id}`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            const data = await response.json()
            
            if (data.success) {
                setRecommendations(data.data.recommendations)
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRecommendationIcon = (type) => {
        switch (type) {
            case 'reduce_machines': return <TrendingDown className="w-6 h-6 text-orange-600" />
            case 'increase_machines': return <TrendingUp className="w-6 h-6 text-blue-600" />
            case 'optimize_usage': return <CheckCircle className="w-6 h-6 text-green-600" />
            default: return <Lightbulb className="w-6 h-6 text-gray-600" />
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#dc3545'
            case 'medium': return '#ffc107'
            case 'low': return '#28a745'
            default: return '#6c757d'
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    // Filter to show only recommendations for this user
    const userRecommendations = recommendations.filter(rec => rec.user_id === session.user.id)

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <Lightbulb className="page-title-icon" />
                    My Recommendations
                </h1>
                <p className="page-subtitle">
                    Personalized suggestions to optimize your machine usage
                </p>
            </div>

            {/* Recommendations */}
            <div className="recommendations-container">
                {userRecommendations.length === 0 ? (
                    <div className="empty-state" style={{ background: 'white', borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
                        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: '#28a745' }}>All Good!</h3>
                        <p style={{ margin: '0', color: '#6c757d' }}>
                            Your machine usage is optimal. No recommendations at this time.
                        </p>
                    </div>
                ) : (
                    <div className="recommendations-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {userRecommendations.map((rec, index) => (
                            <div key={index} style={{ 
                                background: 'white', 
                                borderRadius: '16px', 
                                padding: '24px',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                                borderLeft: `4px solid ${getPriorityColor(rec.priority)}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    {getRecommendationIcon(rec.recommendation_type)}
                                    
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#2d3748' }}>
                                                {rec.recommendation_type === 'reduce_machines' && 'Consider Reducing Machines'}
                                                {rec.recommendation_type === 'increase_machines' && 'Consider Additional Machines'}
                                                {rec.recommendation_type === 'optimize_usage' && 'Excellent Usage!'}
                                            </h3>
                                            <span style={{ 
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: getPriorityColor(rec.priority) + '20',
                                                color: getPriorityColor(rec.priority),
                                                textTransform: 'uppercase'
                                            }}>
                                                {rec.priority} Priority
                                            </span>
                                        </div>
                                        
                                        <p style={{ margin: '0 0 16px 0', color: '#4a5568', fontSize: '16px' }}>
                                            {rec.recommended_action}
                                        </p>
                                        
                                        <div style={{ 
                                            background: '#f7fafc', 
                                            padding: '16px', 
                                            borderRadius: '12px',
                                            marginBottom: '16px'
                                        }}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                                                Analysis
                                            </h4>
                                            <p style={{ margin: '0', fontSize: '14px', color: '#4a5568' }}>
                                                {rec.reason}
                                            </p>
                                            <div style={{ marginTop: '12px' }}>
                                                <span style={{ fontSize: '14px', color: '#4a5568' }}>
                                                    Current utilization: 
                                                    <strong style={{ 
                                                        marginLeft: '8px',
                                                        color: rec.current_utilization >= 40 && rec.current_utilization <= 70 ? '#28a745' :
                                                               rec.current_utilization < 20 ? '#ffc107' : '#dc3545'
                                                    }}>
                                                        {rec.current_utilization}%
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>

                                        {rec.potential_savings && (
                                            <div style={{ 
                                                background: '#e6fffa', 
                                                border: '1px solid #38b2ac',
                                                padding: '12px', 
                                                borderRadius: '8px',
                                                marginBottom: '16px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TrendingUp className="w-4 h-4 text-teal-600" />
                                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                                                        Potential Savings: ${rec.potential_savings}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {rec.details && rec.details.length > 0 && (
                                            <div>
                                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                                                    Affected Machines
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {rec.details.map((machine, idx) => (
                                                        <div key={idx} style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            padding: '8px 12px',
                                                            background: '#f8f9fa',
                                                            borderRadius: '8px',
                                                            fontSize: '14px'
                                                        }}>
                                                            <span style={{ fontWeight: '500' }}>
                                                                {machine.machine_type} ({machine.machine_id})
                                                            </span>
                                                            <span style={{ 
                                                                fontWeight: '600',
                                                                color: machine.utilization >= 40 && machine.utilization <= 70 ? '#28a745' :
                                                                       machine.utilization < 20 ? '#ffc107' : '#dc3545'
                                                            }}>
                                                                {machine.utilization}% utilization
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {rec.recommendation_type === 'reduce_machines' && (
                                            <div style={{ 
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: '#fff3cd',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                                <span style={{ fontSize: '14px', color: '#856404' }}>
                                                    Consider contacting your admin to discuss returning underused machines
                                                </span>
                                            </div>
                                        )}

                                        {rec.recommendation_type === 'increase_machines' && (
                                            <div style={{ 
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: '#cce5ff',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                                <span style={{ fontSize: '14px', color: '#0056b3' }}>
                                                    Request additional machines to prevent overutilization and equipment damage
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}