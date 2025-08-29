'use client'

import { useState, useEffect } from 'react'
import { 
    TrendingUp, TrendingDown, BarChart, Activity, Clock, 
    Award, AlertTriangle, CheckCircle, RefreshCw, Target,
    Truck, Calendar, Eye, ArrowUp, ArrowDown, Minus
} from 'lucide-react'

export default function CustomerHealthScore({ session }) {
    const [healthData, setHealthData] = useState(null)
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchHealthData()
    }, [])

    const fetchHealthData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true)
            } else {
                setLoading(true)
            }

            // Fetch health score
            const scoreResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health-score/${session.user.id}`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            // Fetch user machines
            const machinesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machines`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            const [scoreData, machinesData] = await Promise.all([
                scoreResponse.json(),
                machinesResponse.json()
            ])

            if (scoreData.success) {
                setHealthData(scoreData.data)
            }

            if (machinesData.success) {
                setMachines(machinesData.data?.machines || [])
            }
        } catch (error) {
            console.error('Error fetching health data:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const getScoreColor = (score) => {
        if (score >= 750) return '#059669'      // Green - Excellent
        if (score >= 650) return '#2563eb'      // Blue - Good  
        if (score >= 550) return '#d97706'      // Orange - Fair
        return '#dc2626'                        // Red - Poor
    }

    const getScoreGradient = (score) => {
        if (score >= 750) return 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
        if (score >= 650) return 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
        if (score >= 550) return 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
        return 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
    }

    const getCategoryIcon = (category) => {
        switch(category?.toLowerCase()) {
            case 'excellent': return <Award size={24} style={{ color: 'white' }} />
            case 'good': return <CheckCircle size={24} style={{ color: 'white' }} />
            case 'fair': return <Clock size={24} style={{ color: 'white' }} />
            case 'poor': return <AlertTriangle size={24} style={{ color: 'white' }} />
            default: return <BarChart size={24} style={{ color: 'white' }} />
        }
    }

    const calculateUtilizationStats = () => {
        if (!machines.length) return { avgUtilization: 0, activeCount: 0, totalCount: 0 }
        
        const activeMachines = machines.filter(m => m.status === 'Occupied')
        const utilizations = activeMachines
            .filter(m => m.engineHoursPerDay && m.operatingDays)
            .map(m => (m.engineHoursPerDay / 8) * 100) // Assuming 8-hour workday
        
        const avgUtilization = utilizations.length > 0 
            ? utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length 
            : 0

        return {
            avgUtilization: Math.round(avgUtilization * 10) / 10,
            activeCount: activeMachines.length,
            totalCount: machines.length
        }
    }

    const getScoreChangeIndicator = (score) => {
        // This would typically compare with previous score
        // For now, we'll use a simple heuristic based on score range
        if (score >= 750) return { icon: ArrowUp, color: '#059669', text: 'Trending up' }
        if (score >= 650) return { icon: Minus, color: '#6b7280', text: 'Stable' }
        return { icon: ArrowDown, color: '#dc2626', text: 'Needs attention' }
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
                    Loading your health score...
                </p>
            </div>
        )
    }

    const score = healthData?.current_score || 700
    const category = healthData?.category || 'Good'
    const utilizationStats = calculateUtilizationStats()
    const changeIndicator = getScoreChangeIndicator(score)
    const ChangeIcon = changeIndicator.icon

    return (
        <div>
            {/* Main Health Score Card */}
            <div style={{
                background: getScoreGradient(score),
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background decoration */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    zIndex: 0
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-30px',
                    width: '150px',
                    height: '150px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '50%',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                {getCategoryIcon(category)}
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                                    Machine Health Score
                                </h2>
                            </div>
                            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
                                Based on your machine utilization and usage patterns
                            </p>
                        </div>
                        <button
                            onClick={() => fetchHealthData(true)}
                            disabled={refreshing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px',
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            {refreshing ? 'Updating...' : 'Refresh'}
                        </button>
                    </div>

                    {/* Score Display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', fontWeight: '900', marginBottom: '4px' }}>
                                {score}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9 }}>
                                {category}
                            </div>
                        </div>
                        
                        <div style={{ flex: 1 }}>
                            {/* Score Bar */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ 
                                    width: '100%', 
                                    height: '8px', 
                                    background: 'rgba(255,255,255,0.2)', 
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        width: `${(score / 850) * 100}%`, 
                                        height: '100%', 
                                        background: 'white',
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', opacity: 0.8 }}>
                                    <span>300</span>
                                    <span>850</span>
                                </div>
                            </div>

                            {/* Trend Indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ChangeIcon size={16} style={{ color: changeIndicator.color }} />
                                <span style={{ fontSize: '14px', opacity: 0.9 }}>
                                    {changeIndicator.text}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Last Updated */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', opacity: 0.8 }}>
                        <Calendar size={14} />
                        <span>
                            Last updated: {healthData?.last_updated 
                                ? new Date(healthData.last_updated).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                                : 'Not available'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <BarChart size={20} style={{ color: 'white' }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                            Average Utilization
                        </h3>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
                        {utilizationStats.avgUtilization}%
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        Across {utilizationStats.activeCount} active machines
                    </p>
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Truck size={20} style={{ color: 'white' }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                            Fleet Status
                        </h3>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
                        {utilizationStats.activeCount} / {utilizationStats.totalCount}
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        Machines currently active
                    </p>
                </div>
            </div> */}

            {/* Recommendations Section */}
            {/* {healthData?.recommendations && healthData.recommendations.length > 0 && (
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: '#f59e0b',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Target size={16} style={{ color: 'white' }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                            Score Improvement Tips
                        </h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {healthData.recommendations.map((rec, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    background: getScoreColor(score),
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '20px',
                                    marginTop: '2px'
                                }}>
                                    <span style={{ color: 'white', fontSize: '10px', fontWeight: '700' }}>
                                        {index + 1}
                                    </span>
                                </div>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '14px', 
                                    color: '#374151',
                                    lineHeight: '1.5',
                                    flex: 1
                                }}>
                                    {rec}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )} */}

            {/* Machine Details */}
            {/* {machines.length > 0 && (
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    marginTop: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: '#6366f1',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Eye size={16} style={{ color: 'white' }} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                            Your Machines ({machines.length})
                        </h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                        {machines.slice(0, 6).map((machine) => {
                            const utilization = machine.engineHoursPerDay 
                                ? (machine.engineHoursPerDay / 8) * 100 
                                : 0
                            
                            const getStatusStyle = (status) => {
                                const styles = {
                                    'Occupied': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
                                    'Ready': { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
                                    'Maintenance': { bg: '#fed7d7', color: '#991b1b', border: '#fecaca' },
                                    'In-transit': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
                                }
                                return styles[status] || styles['Ready']
                            }

                            const statusStyle = getStatusStyle(machine.status)

                            return (
                                <div
                                    key={machine.machineID}
                                    style={{
                                        padding: '16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        background: '#fafafa',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f5f5f5'
                                        e.currentTarget.style.borderColor = '#cbd5e1'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#fafafa'
                                        e.currentTarget.style.borderColor = '#e2e8f0'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                                {machine.machineID}
                                            </h4>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
                                                {machine.machineType}
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.color,
                                            border: `1px solid ${statusStyle.border}`
                                        }}>
                                            {machine.status}
                                        </span>
                                    </div>

                                    {machine.status === 'Occupied' && utilization > 0 && (
                                        <div style={{ marginTop: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Utilization</span>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>
                                                    {Math.round(utilization)}%
                                                </span>
                                            </div>
                                            <div style={{ 
                                                width: '100%', 
                                                height: '4px', 
                                                background: '#e5e7eb', 
                                                borderRadius: '2px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{ 
                                                    width: `${Math.min(utilization, 100)}%`, 
                                                    height: '100%', 
                                                    background: getScoreColor(score),
                                                    borderRadius: '2px',
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {machines.length > 6 && (
                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <button style={{
                                padding: '8px 16px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}>
                                View All Machines ({machines.length})
                            </button>
                        </div>
                    )}
                </div>
            )} */}
        </div>
    )
}