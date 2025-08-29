'use client'

import { useState, useEffect } from 'react'
import { Truck, Activity, Clock, TrendingUp } from 'lucide-react'
import HealthScoreCard from '../HealthScore/HealthScoreCard'

export default function CustomerMachinesWithScore({ session }) {
    const [machines, setMachines] = useState([])
    const [healthScore, setHealthScore] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMachinesAndScore()
    }, [])

    const fetchMachinesAndScore = async () => {
        try {
            // Fetch machines
            const machinesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machines`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            // Fetch health score
            const scoreResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health-score/${session.user.id}`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            const [machinesData, scoreData] = await Promise.all([
                machinesResponse.json(),
                scoreResponse.json()
            ])

            if (machinesData.success) {
                setMachines(machinesData.data.machines || [])
            }

            if (scoreData.success) {
                setHealthScore(scoreData.data)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
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
                    <Truck className="page-title-icon" />
                    My Machines & Health Score
                </h1>
                <p className="page-subtitle">
                    View your assigned equipment and performance score
                </p>
            </div>

            {/* Health Score Card */}
            {healthScore && (
                <div style={{ marginBottom: '24px' }}>
                    <HealthScoreCard userDetails={healthScore} />
                </div>
            )}

            {/* Usage Recommendations for Customer */}
            <div className="usage-tips" style={{ background: 'white', padding: '20px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Usage Tips
                </h3>
                <div className="tips-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#28a745' }}>Optimal Usage (40-70%)</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                            Maintain steady utilization for best efficiency and health score
                        </p>
                    </div>
                    <div style={{ padding: '16px', background: '#fff3cd', borderRadius: '12px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>Avoid Underuse (&lt;20%)</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                            Consider returning unused machines to save costs
                        </p>
                    </div>
                    <div style={{ padding: '16px', background: '#f8d7da', borderRadius: '12px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#721c24' }}>Prevent Overuse (&gt;85%)</h4>
                        <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                            Request additional machines to avoid equipment damage
                        </p>
                    </div>
                </div>
            </div>

            {/* Machines List */}
            <div className="machines-container" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                {machines.length === 0 ? (
                    <div className="empty-state">
                        <Truck className="empty-state-icon" />
                        <h3 className="empty-state-title">No machines assigned</h3>
                        <p className="empty-state-description">
                            Contact your admin to get machines assigned to your projects.
                        </p>
                    </div>
                ) : (
                    <div className="machines-grid" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {machines.map((machine) => (
                            <div key={machine.machineID} className="machine-card" style={{ 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '12px', 
                                padding: '20px',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontWeight: '600' }}>{machine.machineType}</h4>
                                        <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>{machine.machineID}</p>
                                    </div>
                                    <span className={`status-badge ${machine.status?.toLowerCase()}`}>
                                        {machine.status}
                                    </span>
                                </div>
                                
                                <div className="utilization-info" style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Activity size={16} className="text-blue-600" />
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                            Daily Usage: {machine.engineHoursPerDay || 0}h
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} className="text-yellow-600" />
                                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                                            Idle Time: {machine.idleHours || 0}h
                                        </span>
                                    </div>
                                </div>

                                {/* Utilization Bar */}
                                {(() => {
                                    const totalHours = (machine.engineHoursPerDay || 0) + (machine.idleHours || 0)
                                    const utilization = totalHours > 0 ? ((machine.engineHoursPerDay || 0) / totalHours) * 100 : 0
                                    const utilizationColor = 
                                        utilization >= 40 && utilization <= 70 ? '#28a745' :
                                        utilization < 20 ? '#ffc107' : '#dc3545'
                                    
                                    return (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '14px', color: '#6c757d' }}>Utilization</span>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: utilizationColor }}>
                                                    {utilization.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div style={{ 
                                                width: '100%', 
                                                height: '8px', 
                                                background: '#e9ecef', 
                                                borderRadius: '4px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{ 
                                                    width: `${utilization}%`, 
                                                    height: '100%', 
                                                    background: utilizationColor,
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}