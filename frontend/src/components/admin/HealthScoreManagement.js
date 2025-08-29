'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Calculator, History } from 'lucide-react'

export default function HealthScoreManagement({ session }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })
            
            const data = await response.json()
            if (data.success) {
                setUsers(data.data.users || [])
            }
        } catch (error) {
            console.error('Error fetching users:', error)
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
                fetchUsers() // Refresh the list
            } else {
                alert('Failed to calculate score: ' + data.message)
            }
        } catch (error) {
            console.error('Error calculating score:', error)
            alert('Failed to calculate score')
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
                    <TrendingUp className="page-title-icon" />
                    Health Score Management
                </h1>
                <p className="page-subtitle">
                    Monitor and manage customer health scores based on machine utilization
                </p>
            </div>

            {/* Users List */}
            <div className="users-container" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                {users.length === 0 ? (
                    <div className="empty-state">
                        <Users className="empty-state-icon" />
                        <h3 className="empty-state-title">No users found</h3>
                        <p className="empty-state-description">
                            No customer users found for score management.
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>User Details</th>
                                    <th>Health Score</th>
                                    <th>Last Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.filter(user => user.role === 'customer').map((user) => (
                                    <tr key={user.userID}>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{user.name}</div>
                                                <div style={{ fontSize: '14px', color: '#6c757d' }}>{user.emailID}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '18px', fontWeight: '600' }}>
                                                    {user.health_score || 700}
                                                </span>
                                                <span className={`score-badge ${getScoreClass(user.health_score || 700)}`}>
                                                    {getScoreCategory(user.health_score || 700)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '14px' }}>
                                                {user.score_last_updated ? 
                                                    new Date(user.score_last_updated).toLocaleDateString() : 
                                                    'Never'
                                                }
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleCalculateScore(user.userID)}
                                                className="btn-primary-sm"
                                                style={{ 
                                                    padding: '8px 16px',
                                                    backgroundColor: '#0070f3',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Calculator size={16} />
                                                Calculate Score
                                            </button>
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

    function getScoreCategory(score) {
        if (score >= 750) return "Excellent"
        if (score >= 650) return "Good"  
        if (score >= 550) return "Fair"
        return "Poor"
    }

    function getScoreClass(score) {
        if (score >= 750) return "excellent"
        if (score >= 650) return "good"
        if (score >= 550) return "fair"
        return "poor"
    }
}