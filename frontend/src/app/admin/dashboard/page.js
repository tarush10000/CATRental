'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Layout from '@/components/Layout'
import {
    Truck, Plus, FileText, MessageSquare, Settings,
    TrendingUp, Wrench, Activity, Clock, CheckCircle,
    AlertTriangle, Bell, Users, BarChart3,
    RefreshCw, ArrowUp, ArrowDown, Eye, IndianRupee
} from 'lucide-react'

export default function AdminDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    
    // Updated state to match new API response structure
    const [stats, setStats] = useState({
        total_machines: 0,
        active_orders: 0,
        revenue: 0.0,
        notifications: []
    })
    const [recentMachines, setRecentMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        fetchDashboardData()
    }, [session, status, router])

    const fetchDashboardData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true)
            } else {
                setLoading(true)
            }

            // Fetch from the new unified dashboard endpoint
            const dashboardResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (dashboardResponse.ok) {
                const dashboardData = await dashboardResponse.json()
                if (dashboardData.success) {
                    setStats(dashboardData.data)
                }
            }

            // Fetch recent machines (this endpoint remains the same)
            const machinesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/machines/recent`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (machinesResponse.ok) {
                const machinesData = await machinesResponse.json()
                if (machinesData.success) {
                    setRecentMachines(machinesData.data || [])
                }
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleRefresh = () => {
        fetchDashboardData(true)
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Ready': { class: 'badge-ready-modern', icon: CheckCircle },
            'Occupied': { class: 'badge-occupied-modern', icon: Activity },
            'Maintenance': { class: 'badge-maintenance-modern', icon: Wrench },
            'In-transit': { class: 'badge-in-transit-modern', icon: Truck }
        }

        const config = statusConfig[status] || { class: 'badge-pending-modern', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`badge-modern ${config.class}`}>
                <IconComponent size={12} />
                {status}
            </span>
        )
    }

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading dashboard...</p>
                </div>
            </Layout>
        )
    }

    return (
        <>
            <Head>
                <title>Admin Dashboard - Caterpillar Machine Tracker</title>
                <meta name="description" content="Admin dashboard for managing Caterpillar machine rentals and tracking" />
            </Head>

            <Layout>
                <div className="dashboard-container">
                    {/* Dashboard Header */}
                    <div className="dashboard-header">
                        <div className="header-content">
                            <div className="header-text">
                                <h1 className="dashboard-title">
                                    Welcome back, {session?.user?.name}
                                </h1>
                                <p className="dashboard-subtitle">
                                    {session?.user?.dealership_name} - Admin Dashboard
                                </p>
                            </div>
                            <div className="header-actions">
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="btn-modern btn-secondary-modern"
                                >
                                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="stats-grid">
                        <div className="stat-card-modern stat-primary">
                            <div className="stat-icon">
                                <Truck size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.total_machines}</div>
                                <div className="stat-label">Total Machines</div>
                                <div className="stat-trend positive">
                                    <ArrowUp size={12} />
                                    <span>+2 this week</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card-modern stat-success">
                            <div className="stat-icon">
                                <Activity size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.active_orders}</div>
                                <div className="stat-label">Active Orders</div>
                                <div className="stat-trend positive">
                                    <ArrowUp size={12} />
                                    <span>+12% from last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card-modern stat-info">
                            <div className="stat-icon">
                                <IndianRupee size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">₹{stats.revenue.toFixed(2)}</div>
                                <div className="stat-label">Revenue (30d)</div>
                                <div className="stat-trend positive">
                                    <ArrowUp size={12} />
                                    <span>+8.2% from last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-card-modern stat-warning">
                            <div className="stat-icon">
                                <Bell size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{stats.notifications.length}</div>
                                <div className="stat-label">Active Alerts</div>
                                {stats.notifications.length > 0 && (
                                    <div className="stat-trend negative">
                                        <AlertTriangle size={12} />
                                        <span>Needs attention</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="dashboard-grid">
                        {/* Recent Machines */}
                        <div className="dashboard-card">
                            <div className="card-header-modern">
                                <h3 className="card-title-modern">Recent Machines</h3>
                                <button 
                                    onClick={() => router.push('/admin/machines')}
                                    className="btn-modern btn-sm btn-secondary-modern"
                                >
                                    <Eye size={14} />
                                    View All
                                </button>
                            </div>
                            <div className="card-content">
                                {recentMachines.length > 0 ? (
                                    <div className="machine-list">
                                        {recentMachines.map((machine) => (
                                            <div key={machine._id} className="machine-item">
                                                <div className="machine-icon">
                                                    <Truck size={20} />
                                                </div>
                                                <div className="machine-details">
                                                    <div className="machine-id">{machine.machineID}</div>
                                                    <div className="machine-type">{machine.machineType}</div>
                                                    <div className="machine-location">{machine.location || 'No location specified'}</div>
                                                </div>
                                                <div className="machine-status">
                                                    {getStatusBadge(machine.status)}
                                                    <div className="machine-updated">
                                                        {new Date(machine.updatedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state-small">
                                        <Truck size={32} className="empty-icon" />
                                        <p className="empty-text">No recent machines</p>
                                        <button 
                                            onClick={() => router.push('/admin/add-machine')}
                                            className="btn-modern btn-sm btn-primary-modern"
                                        >
                                            <Plus size={14} />
                                            Add Machine
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notifications Panel */}
                        <div className="dashboard-card">
                            <div className="card-header-modern">
                                <h3 className="card-title-modern">System Notifications</h3>
                                {stats.notifications.length > 0 && (
                                    <span className="notification-count">
                                        {stats.notifications.length} active
                                    </span>
                                )}
                            </div>
                            <div className="card-content">
                                {stats.notifications.length > 0 ? (
                                    <div className="notification-list">
                                        {stats.notifications.map((notification, index) => (
                                            <div key={index} className="notification-item">
                                                <div className="notification-icon">
                                                    <AlertTriangle size={16} />
                                                </div>
                                                <div className="notification-content">
                                                    <p className="notification-text">{notification}</p>
                                                </div>
                                                <button className="notification-dismiss">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state-small">
                                        <CheckCircle size={32} className="empty-icon success" />
                                        <p className="empty-text">All systems running smoothly</p>
                                        <p className="empty-subtext">No active notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="dashboard-card full-width">
                            <div className="card-header-modern">
                                <h3 className="card-title-modern">Quick Actions</h3>
                                <p className="card-subtitle">Frequently used operations</p>
                            </div>
                            <div className="card-content">
                                <div className="quick-actions-grid">
                                    <button
                                        onClick={() => router.push('/admin/add-machine')}
                                        className="quick-action-btn primary"
                                    >
                                        <div className="action-icon">
                                            <Plus size={20} />
                                        </div>
                                        <div className="action-content">
                                            <h4 className="action-title">Add New Machine</h4>
                                            <p className="action-description">Register new equipment to your fleet</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => router.push('/admin/add-order')}
                                        className="quick-action-btn secondary"
                                    >
                                        <div className="action-icon">
                                            <FileText size={20} />
                                        </div>
                                        <div className="action-content">
                                            <h4 className="action-title">Assign Machine</h4>
                                            <p className="action-description">Assign equipment to customers</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => router.push('/admin/requests')}
                                        className="quick-action-btn info"
                                    >
                                        <div className="action-icon">
                                            <MessageSquare size={20} />
                                        </div>
                                        <div className="action-content">
                                            <h4 className="action-title">Manage Requests</h4>
                                            <p className="action-description">Handle customer service requests</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => router.push('/admin/machines')}
                                        className="quick-action-btn success"
                                    >
                                        <div className="action-icon">
                                            <Settings size={20} />
                                        </div>
                                        <div className="action-content">
                                            <h4 className="action-title">View All Machines</h4>
                                            <p className="action-description">Complete fleet overview and management</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Performance Overview */}
                        <div className="dashboard-card full-width">
                            <div className="card-header-modern">
                                <h3 className="card-title-modern">Performance Overview</h3>
                                <div className="card-actions">
                                    <select className="period-select">
                                        <option value="7d">Last 7 days</option>
                                        <option value="30d" selected>Last 30 days</option>
                                        <option value="90d">Last 3 months</option>
                                    </select>
                                </div>
                            </div>
                            <div className="card-content">
                                <div className="performance-metrics">
                                    <div className="metric-item">
                                        <div className="metric-label">Machine Utilization</div>
                                        <div className="metric-value">78.5%</div>
                                        <div className="metric-progress">
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: '78.5%' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="metric-item">
                                        <div className="metric-label">Average Order Duration</div>
                                        <div className="metric-value">12.3 days</div>
                                        <div className="metric-change positive">
                                            <ArrowUp size={12} />
                                            2.1 days from last month
                                        </div>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-label">Customer Satisfaction</div>
                                        <div className="metric-value">4.7/5.0</div>
                                        <div className="metric-stars">
                                            ★★★★★
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    )
}