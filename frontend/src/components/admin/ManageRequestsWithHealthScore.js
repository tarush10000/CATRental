'use client'

import { useState, useEffect } from 'react'
import {
    MessageSquare, CheckCircle, AlertTriangle, Clock, X, 
    TrendingUp, TrendingDown, User, Mail, Calendar
} from 'lucide-react'

// Import your existing health score components
import HealthScoreCard from '../HealthScore/HealthScoreCard'

export default function ManageRequestsWithHealthScore({ session }) {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [summary, setSummary] = useState(null)
    const [filters, setFilters] = useState({
        status: '',
        requestType: ''
    })

    useEffect(() => {
        fetchRequests()
    }, [filters])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            
            const params = new URLSearchParams()
            if (filters.status) params.append('status', filters.status)
            if (filters.requestType) params.append('request_type', filters.requestType)
            
            const url = `${process.env.NEXT_PUBLIC_API_URL}/api/requests/?${params.toString()}`
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch requests')
            }

            const data = await response.json()
            
            if (data.success) {
                setRequests(data.data.requests)
                setSummary(data.data.summary)
            } else {
                throw new Error(data.message || 'Failed to fetch requests')
            }
        } catch (error) {
            console.error('Error fetching requests:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCalculateScore = async (userId) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health-score/calculate/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            const data = await response.json()
            
            if (data.success) {
                alert(`Score updated: ${data.data.new_score} (${data.data.reason})`)
                fetchRequests() // Refresh the requests list
            } else {
                throw new Error(data.message)
            }
        } catch (error) {
            console.error('Error calculating score:', error)
            alert('Failed to calculate score')
        }
    }

    const handleApproveRequest = async (requestId, requestData) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/requests/requests/${requestId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    notes: 'Approved after health score review',
                    assigned_machine_id: requestData.suggested_machine_id
                })
            })

            const data = await response.json()
            
            if (data.success) {
                alert('Request approved successfully!')
                fetchRequests()
            } else {
                throw new Error(data.message)
            }
        } catch (error) {
            console.error('Error approving request:', error)
            alert('Failed to approve request')
        }
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <MessageSquare className="page-title-icon" />
                    Manage Requests with Health Scores
                </h1>
                <p className="page-subtitle">
                    Review customer service requests with health score insights
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert-modern alert-error-modern">
                    <AlertTriangle className="alert-icon" />
                    <div className="alert-content">
                        <div className="alert-message">{error}</div>
                        <button onClick={fetchRequests} className="alert-action">
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0070f3' }}>
                            {summary.total_items}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>Total Items</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                            {summary.users_excellent_score}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>Excellent Scores</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                            {summary.users_poor_score}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>Poor Scores</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filter-section" style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <select 
                    value={filters.status} 
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="form-select"
                >
                    <option value="">All Statuses</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="APPROVED">Approved</option>
                    <option value="DENIED">Denied</option>
                </select>
                
                <select 
                    value={filters.requestType} 
                    onChange={(e) => setFilters({...filters, requestType: e.target.value})}
                    className="form-select"
                >
                    <option value="">All Types</option>
                    <option value="Extension">Extension</option>
                    <option value="Support">Support</option>
                    <option value="Cancellation">Cancellation</option>
                </select>
            </div>

            {/* Requests Table */}
            <div className="requests-container" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                {requests.length === 0 ? (
                    <div className="empty-state">
                        <MessageSquare className="empty-state-icon" />
                        <h3 className="empty-state-title">No requests found</h3>
                        <p className="empty-state-description">
                            There are no requests matching your current filters.
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Customer & Health Score</th>
                                    <th>Request Details</th>
                                    <th>Machine</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((request) => (
                                    <tr key={request.requestID || request._id}>
                                        {/* Customer & Health Score Column */}
                                        <td style={{ width: '250px' }}>
                                            {request.user_details ? (
                                                <HealthScoreCard 
                                                    userDetails={request.user_details}
                                                    showActions={true}
                                                    onCalculateScore={() => handleCalculateScore(request.user_details.userID)}
                                                />
                                            ) : (
                                                <div style={{ padding: '8px', background: '#f8f9fa', borderRadius: '8px' }}>
                                                    <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>Unknown User</p>
                                                </div>
                                            )}
                                        </td>
                                        
                                        {/* Request Details */}
                                        <td>
                                            <div>
                                                <span className={`request-type-badge ${request.requestType?.toLowerCase()}`}>
                                                    {request.requestType}
                                                </span>
                                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                                                    {request.comments || 'No comments'}
                                                </p>
                                            </div>
                                        </td>
                                        
                                        {/* Machine */}
                                        <td>
                                            <div style={{ fontSize: '14px' }}>
                                                <strong>{request.machineID}</strong>
                                                {request.machine_type && (
                                                    <p style={{ margin: '4px 0 0 0', color: '#6c757d' }}>
                                                        {request.machine_type}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        
                                        {/* Date */}
                                        <td>
                                            <div style={{ fontSize: '14px' }}>
                                                {new Date(request.requestDate).toLocaleDateString()}
                                            </div>
                                        </td>
                                        
                                        {/* Status */}
                                        <td>
                                            <span className={`status-badge ${request.status?.toLowerCase().replace('-', '_')}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        
                                        {/* Actions */}
                                        <td>
                                            {request.status === 'In-Progress' && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => handleApproveRequest(request.requestID, request)}
                                                        className="btn-success-sm"
                                                        title="Approve Request"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}