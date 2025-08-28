'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import {
    Brain, CheckCircle, XCircle, Clock, AlertTriangle,
    TrendingUp, MapPin, Truck, User, DollarSign, 
    RefreshCw, Filter, Calendar, MessageSquare
} from 'lucide-react'

export default function AdminRecommendations() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [transfers, setTransfers] = useState([])
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('transfers')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        if (status === 'loading') return
        if (!session || session.user.role !== 'admin') {
            router.push('/auth/signin')
            return
        }
        
        fetchData()
    }, [session, status, router])

    const fetchData = async () => {
        try {
            setLoading(true)
            
            // Fetch transfer recommendations
            const transfersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/transfers`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })
            
            if (transfersResponse.ok) {
                const transfersData = await transfersResponse.json()
                setTransfers(transfersData.data?.transfers || [])
            }

            // Fetch text recommendations
            const recResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/recommendations?user_type=admin`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })
            
            if (recResponse.ok) {
                const recData = await recResponse.json()
                setRecommendations(recData.data?.recommendations || [])
            }
            
        } catch (error) {
            console.error('Error fetching recommendations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleTransferAction = async (transferId, status, comments = '') => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/transfers/${transferId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: status,
                    admin_comments: comments
                })
            })

            if (response.ok) {
                fetchData() // Refresh data
            }
        } catch (error) {
            console.error('Error updating transfer:', error)
        }
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { class: 'badge-warning', icon: Clock },
            approved: { class: 'badge-success', icon: CheckCircle },
            declined: { class: 'badge-danger', icon: XCircle }
        }
        
        const config = statusConfig[status] || statusConfig.pending
        const Icon = config.icon
        
        return (
            <span className={`status-badge ${config.class}`}>
                <Icon size={14} className="mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        )
    }

    const getSeverityBadge = (severity) => {
        const severityConfig = {
            low: { class: 'badge-secondary', color: '#6c757d' },
            medium: { class: 'badge-warning', color: '#fd7e14' },
            high: { class: 'badge-danger', color: '#dc3545' },
            critical: { class: 'badge-danger', color: '#dc3545' }
        }
        
        const config = severityConfig[severity] || severityConfig.low
        
        return (
            <span className={`status-badge ${config.class}`}>
                <AlertTriangle size={14} className="mr-1" />
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </span>
        )
    }

    const filteredTransfers = transfers.filter(transfer => 
        statusFilter === 'all' || transfer.status === statusFilter
    )

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
                    <Brain className="page-title-icon" />
                    <div>
                        <h1 className="page-title">Smart Recommendations</h1>
                        <p className="page-subtitle">AI-powered insights and optimization suggestions</p>
                    </div>
                </div>
                <button 
                    onClick={fetchData}
                    className="btn-modern btn-secondary-modern"
                    disabled={loading}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="card-filters">
                <div className="filters-row">
                    <div className="tab-navigation">
                        <button 
                            className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
                            onClick={() => setActiveTab('transfers')}
                        >
                            <Truck size={16} />
                            Transfer Optimizations ({transfers.length})
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
                            onClick={() => setActiveTab('insights')}
                        >
                            <TrendingUp size={16} />
                            Smart Insights ({recommendations.length})
                        </button>
                    </div>
                    
                    {activeTab === 'transfers' && (
                        <div className="filters-right">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="declined">Declined</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Transfer Recommendations Tab */}
            {activeTab === 'transfers' && (
                <div className="modern-card">
                    <div className="card-header-modern">
                        <h3 className="card-title-modern">Transfer Optimization Recommendations</h3>
                        <p className="card-subtitle">Smart routing suggestions to reduce costs and improve efficiency</p>
                    </div>
                    
                    <div className="card-content">
                        {filteredTransfers.length === 0 ? (
                            <div className="empty-state">
                                <Truck className="empty-state-icon" />
                                <h3 className="empty-state-title">No transfer recommendations</h3>
                                <p className="empty-state-description">
                                    Transfer optimization suggestions will appear here when opportunities are identified.
                                </p>
                            </div>
                        ) : (
                            <div className="recommendations-grid">
                                {filteredTransfers.map((transfer) => (
                                    <div key={transfer.transferID} className="recommendation-card transfer-card">
                                        <div className="recommendation-header">
                                            <div className="recommendation-title">
                                                <MapPin size={18} className="recommendation-icon" />
                                                <h4>Direct Transfer Opportunity</h4>
                                            </div>
                                            {getStatusBadge(transfer.status)}
                                        </div>
                                        
                                        <div className="recommendation-content">
                                            <div className="transfer-details">
                                                <div className="transfer-users">
                                                    <div className="user-info">
                                                        <User size={16} />
                                                        <span>From: {transfer.user1_name}</span>
                                                        <span className="location">{transfer.location1}</span>
                                                    </div>
                                                    <div className="transfer-arrow">→</div>
                                                    <div className="user-info">
                                                        <User size={16} />
                                                        <span>To: {transfer.user2_name}</span>
                                                        <span className="location">{transfer.location2}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="machine-details">
                                                    <Truck size={16} />
                                                    <span>{transfer.machine_type} - {transfer.machineID}</span>
                                                </div>
                                                
                                                {transfer.estimatedSavings && (
                                                    <div className="savings-highlight">
                                                        <DollarSign size={16} />
                                                        <span>Estimated Savings: ${transfer.estimatedSavings.toFixed(0)}</span>
                                                    </div>
                                                )}
                                                
                                                <p className="recommendation-reason">
                                                    {transfer.recommendationReason}
                                                </p>
                                            </div>
                                            
                                            {transfer.status === 'pending' && (
                                                <div className="recommendation-actions">
                                                    <button 
                                                        className="btn-modern btn-primary-modern"
                                                        onClick={() => handleTransferAction(transfer.transferID, 'approved')}
                                                    >
                                                        <CheckCircle size={16} />
                                                        Approve Transfer
                                                    </button>
                                                    <button 
                                                        className="btn-modern btn-danger-modern"
                                                        onClick={() => handleTransferAction(transfer.transferID, 'declined')}
                                                    >
                                                        <XCircle size={16} />
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {transfer.adminComments && (
                                                <div className="admin-comments">
                                                    <MessageSquare size={16} />
                                                    <span>{transfer.adminComments}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Smart Insights Tab */}
            {activeTab === 'insights' && (
                <div className="modern-card">
                    <div className="card-header-modern">
                        <h3 className="card-title-modern">Smart Business Insights</h3>
                        <p className="card-subtitle">Actionable recommendations to optimize your operations</p>
                    </div>
                    
                    <div className="card-content">
                        {recommendations.length === 0 ? (
                            <div className="empty-state">
                                <TrendingUp className="empty-state-icon" />
                                <h3 className="empty-state-title">No insights available</h3>
                                <p className="empty-state-description">
                                    Smart business insights will appear here as your data grows.
                                </p>
                            </div>
                        ) : (
                            <div className="recommendations-grid">
                                {recommendations.map((rec) => (
                                    <div key={rec.recommendationID} className="recommendation-card insight-card">
                                        <div className="recommendation-header">
                                            <div className="recommendation-title">
                                                <AlertTriangle size={18} className="recommendation-icon" />
                                                <h4>{rec.recommendationType.replace('_', ' ').toUpperCase()}</h4>
                                            </div>
                                            {getSeverityBadge(rec.severity)}
                                        </div>
                                        
                                        <div className="recommendation-content">
                                            <p className="recommendation-text">{rec.recommendation}</p>
                                            <div className="recommendation-meta">
                                                <Calendar size={14} />
                                                <span>{new Date(rec.dateTime).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    )
}