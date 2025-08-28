'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import {
    Lightbulb, AlertTriangle, TrendingUp, Clock, CheckCircle,
    RefreshCw, Calendar, Filter, Zap, DollarSign, Activity,
    Target, Award, MessageSquare
} from 'lucide-react'

export default function CustomerRecommendations() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)
    const [severityFilter, setSeverityFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')

    useEffect(() => {
        if (status === 'loading') return
        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }
        
        fetchRecommendations()
    }, [session, status, router])

    const fetchRecommendations = async () => {
        try {
            setLoading(true)
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/recommendations?user_type=customer`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })
            
            if (response.ok) {
                const data = await response.json()
                setRecommendations(data.data?.recommendations || [])
            }
            
        } catch (error) {
            console.error('Error fetching recommendations:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRecommendationIcon = (type) => {
        const iconMap = {
            'efficiency': Activity,
            'cost_saving': DollarSign,
            'usage_pattern': TrendingUp,
            'maintenance': AlertTriangle,
            'transfer_optimization': Target
        }
        return iconMap[type] || Lightbulb
    }

    const getSeverityConfig = (severity) => {
        const config = {
            low: { class: 'badge-secondary', color: '#6c757d' },
            medium: { class: 'badge-warning', color: '#fd7e14' },
            high: { class: 'badge-danger', color: '#dc3545' },
            critical: { class: 'badge-danger', color: '#dc3545' }
        }
        return config[severity] || config.low
    }

    const getSeverityBadge = (severity) => {
        const config = getSeverityConfig(severity)
        return (
            <span className={`status-badge ${config.class}`}>
                <AlertTriangle size={12} />
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </span>
        )
    }

    const getTypeColor = (type) => {
        const colors = {
            'efficiency': '#28a745',
            'cost_saving': '#17a2b8',
            'usage_pattern': '#ffc107',
            'maintenance': '#dc3545',
            'transfer_optimization': '#6f42c1'
        }
        return colors[type] || '#6c757d'
    }

    const filteredRecommendations = recommendations.filter(rec => {
        const severityMatch = severityFilter === 'all' || rec.severity === severityFilter
        const typeMatch = typeFilter === 'all' || rec.recommendationType === typeFilter
        return severityMatch && typeMatch
    })

    // Group recommendations by type
    const groupedRecommendations = filteredRecommendations.reduce((acc, rec) => {
        const type = rec.recommendationType
        if (!acc[type]) {
            acc[type] = []
        }
        acc[type].push(rec)
        return acc
    }, {})

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-96">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="animate-spin" size={24} />
                        <span>Loading recommendations...</span>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="modern-page-header">
                <div className="page-header-content">
                    <Lightbulb className="page-title-icon" />
                    <div>
                        <h1 className="page-title">Smart Recommendations</h1>
                        <p className="page-subtitle">Personalized insights to optimize your machine usage</p>
                    </div>
                </div>
                <button 
                    onClick={fetchRecommendations}
                    className="btn-modern btn-secondary-modern"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="card-filters">
                <div className="filters-row">
                    <div className="filters-left">
                        <h3 className="filter-title">Filter Recommendations</h3>
                    </div>
                    <div className="filters-right">
                        <select 
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Priorities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        
                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Categories</option>
                            <option value="efficiency">Efficiency</option>
                            <option value="cost_saving">Cost Saving</option>
                            <option value="usage_pattern">Usage Pattern</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="transfer_optimization">Transfer</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="dashboard-grid">
                <div className="dashboard-card stats-card">
                    <div className="stats-icon stats-primary">
                        <Lightbulb size={24} />
                    </div>
                    <div className="stats-content">
                        <h3 className="stats-number">{recommendations.length}</h3>
                        <p className="stats-label">Total Recommendations</p>
                    </div>
                </div>
                
                <div className="dashboard-card stats-card">
                    <div className="stats-icon stats-warning">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stats-content">
                        <h3 className="stats-number">
                            {recommendations.filter(r => ['high', 'critical'].includes(r.severity)).length}
                        </h3>
                        <p className="stats-label">High Priority</p>
                    </div>
                </div>
                
                <div className="dashboard-card stats-card">
                    <div className="stats-icon stats-success">
                        <DollarSign size={24} />
                    </div>
                    <div className="stats-content">
                        <h3 className="stats-number">
                            {recommendations.filter(r => r.recommendationType === 'cost_saving').length}
                        </h3>
                        <p className="stats-label">Cost Savings</p>
                    </div>
                </div>
                
                <div className="dashboard-card stats-card">
                    <div className="stats-icon stats-info">
                        <Activity size={24} />
                    </div>
                    <div className="stats-content">
                        <h3 className="stats-number">
                            {recommendations.filter(r => r.recommendationType === 'efficiency').length}
                        </h3>
                        <p className="stats-label">Efficiency Tips</p>
                    </div>
                </div>
            </div>

            {/* Recommendations Content */}
            {filteredRecommendations.length === 0 ? (
                <div className="modern-card">
                    <div className="card-content">
                        <div className="empty-state">
                            <Lightbulb className="empty-state-icon" />
                            <h3 className="empty-state-title">No recommendations available</h3>
                            <p className="empty-state-description">
                                {recommendations.length === 0 
                                    ? 'Personalized recommendations will appear here based on your machine usage patterns.'
                                    : 'No recommendations match your current filters. Try adjusting your filter criteria.'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="recommendations-container">
                    {Object.entries(groupedRecommendations).map(([type, recs]) => {
                        const TypeIcon = getRecommendationIcon(type)
                        const typeColor = getTypeColor(type)
                        
                        return (
                            <div key={type} className="modern-card recommendation-category">
                                <div className="card-header-modern">
                                    <div className="recommendation-category-header">
                                        <TypeIcon size={20} style={{ color: typeColor }} />
                                        <h3 className="card-title-modern">
                                            {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                                            <span className="recommendation-count">({recs.length})</span>
                                        </h3>
                                    </div>
                                </div>
                                
                                <div className="card-content">
                                    <div className="recommendations-list">
                                        {recs.map((rec) => (
                                            <div key={rec.recommendationID} className="recommendation-item">
                                                <div className="recommendation-item-header">
                                                    {getSeverityBadge(rec.severity)}
                                                    <div className="recommendation-date">
                                                        <Calendar size={14} />
                                                        <span>{new Date(rec.dateTime).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="recommendation-item-content">
                                                    <p className="recommendation-text">{rec.recommendation}</p>
                                                    
                                                    {rec.severity === 'critical' && (
                                                        <div className="recommendation-urgency">
                                                            <Zap size={16} />
                                                            <span>Immediate attention required</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="recommendation-actions">
                                                    <button className="btn-modern btn-primary-modern btn-sm">
                                                        <CheckCircle size={14} />
                                                        Mark as Reviewed
                                                    </button>
                                                    <button className="btn-modern btn-secondary-modern btn-sm">
                                                        <MessageSquare size={14} />
                                                        Contact Support
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </Layout>
    )
}