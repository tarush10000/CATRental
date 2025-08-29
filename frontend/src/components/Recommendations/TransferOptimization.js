'use client'

import { useState, useEffect } from 'react'
import { 
    Truck, CheckCircle, XCircle, Clock, User, Calendar, 
    MapPin, DollarSign, AlertTriangle 
} from 'lucide-react'

export default function TransferOptimization({ token }) {
    const [transfers, setTransfers] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        fetchTransfers()
        
        // Listen for refresh events
        const handleRefresh = () => fetchTransfers()
        window.addEventListener('refreshRecommendations', handleRefresh)
        
        return () => {
            window.removeEventListener('refreshRecommendations', handleRefresh)
        }
    }, [statusFilter])

    const fetchTransfers = async () => {
        try {
            setLoading(true)
            const url = statusFilter !== 'all' 
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/transfers?status=${statusFilter}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/transfers`
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setTransfers(data.data?.transfers || [])
                }
            }
        } catch (error) {
            console.error('Error fetching transfers:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleTransferAction = async (transferId, status, comments = '') => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommendations/transfers/${transferId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: status,
                    admin_comments: comments
                })
            })

            if (response.ok) {
                fetchTransfers() // Refresh data
            }
        } catch (error) {
            console.error('Error updating transfer:', error)
        }
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending': { color: '#ffc107', bgColor: '#fff3cd', icon: Clock },
            'approved': { color: '#28a745', bgColor: '#d4edda', icon: CheckCircle },
            'declined': { color: '#dc3545', bgColor: '#f8d7da', icon: XCircle },
        }
        
        const config = statusConfig[status.toLowerCase()] || statusConfig.pending
        const Icon = config.icon
        
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                color: config.color,
                backgroundColor: config.bgColor,
            }}>
                <Icon size={12} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        )
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ 
                    display: 'inline-block',
                    width: '32px',
                    height: '32px',
                    border: '3px solid #f3f3f3',
                    borderTop: '3px solid #0070f3',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ marginTop: '16px', color: '#666' }}>Loading transfer recommendations...</p>
            </div>
        )
    }

    return (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {/* Header */}
            <div style={{ 
                padding: '20px 24px', 
                borderBottom: '1px solid #edf2f7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#1a202c' }}>
                        Transfer Recommendations
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
                        Optimize machine allocation to reduce costs and improve efficiency
                    </p>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        border: '1px solid #d2d6dc',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#374151',
                        background: 'white'
                    }}
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                </select>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                {transfers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Truck size={48} style={{ color: '#cbd5e0', margin: '0 auto 16px' }} />
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#4a5568' }}>
                            No transfer recommendations
                        </h4>
                        <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
                            Check back later for optimization opportunities
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {transfers.map((transfer) => (
                            <div
                                key={transfer.transferID}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    transition: 'all 0.2s',
                                    cursor: 'default'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                                    e.target.style.borderColor = '#cbd5e0'
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.boxShadow = 'none'
                                    e.target.style.borderColor = '#e2e8f0'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                                        Machine Transfer: {transfer.machineID}
                                    </h4>
                                    {getStatusBadge(transfer.status)}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={16} style={{ color: '#718096' }} />
                                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                                            From: <strong>{transfer.user1_name}</strong>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={16} style={{ color: '#718096' }} />
                                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                                            To: <strong>{transfer.user2_name}</strong>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Truck size={16} style={{ color: '#718096' }} />
                                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                                            Type: <strong>{transfer.machine_type}</strong>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} style={{ color: '#718096' }} />
                                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                                            Created: {new Date(transfer.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {transfer.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                        <button
                                            onClick={() => handleTransferAction(transfer.transferID, 'approved')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                background: '#28a745',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = '#218838'}
                                            onMouseLeave={(e) => e.target.style.background = '#28a745'}
                                        >
                                            <CheckCircle size={14} />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleTransferAction(transfer.transferID, 'declined')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                background: 'white',
                                                color: '#dc3545',
                                                border: '1px solid #dc3545',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#dc3545'
                                                e.target.style.color = 'white'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'white'
                                                e.target.style.color = '#dc3545'
                                            }}
                                        >
                                            <XCircle size={14} />
                                            Decline
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}