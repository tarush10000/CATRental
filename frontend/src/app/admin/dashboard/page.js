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
    RefreshCw, ArrowUp, ArrowDown, Eye, IndianRupee, X
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

            if (!dashboardResponse.ok) {
                throw new Error('Failed to fetch dashboard data')
            }

            const dashboardData = await dashboardResponse.json()
            
            if (dashboardData.success) {
                setStats(dashboardData.data)
            } else {
                console.error('Dashboard API returned error:', dashboardData.message)
            }

            // Fetch recent machines
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
        const statusClasses = {
            'Ready': 'badge-success',
            'Occupied': 'badge-primary',
            'In-transit': 'badge-warning',
            'Maintenance': 'badge-danger'
        }
        
        return (
            <span className={`status-badge ${statusClasses[status] || 'badge-secondary'}`}>
                {status}
            </span>
        )
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'maintenance':
                return <Wrench size={16} />
            case 'request':
                return <MessageSquare size={16} />
            default:
                return <AlertTriangle size={16} />
        }
    }

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'high':
                return 'notification-high'
            case 'medium':
                return 'notification-medium'
            case 'low':
                return 'notification-low'
            default:
                return 'notification-medium'
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            return new Date(dateString).toLocaleDateString()
        } catch {
            return 'N/A'
        }
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
                                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                                    {refreshing ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button 
                                    onClick={() => router.push('/admin/add-machine')}
                                    className="btn-modern btn-primary-modern"
                                >
                                    <Plus size={16} />
                                    Add Machine
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="dashboard-grid">
                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-primary">
                                <Truck size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">{stats.total_machines}</h3>
                                <p className="stats-label">Total Machines</p>
                                <div className="stats-trend positive">
                                    <ArrowUp size={12} />
                                    <span>+5% from last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-success">
                                <Activity size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">{stats.active_orders}</h3>
                                <p className="stats-label">Active Orders</p>
                                <div className="stats-trend positive">
                                    <ArrowUp size={12} />
                                    <span>+12% this week</span>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-warning">
                                <IndianRupee size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">₹{stats.revenue?.toLocaleString() || 0}</h3>
                                <p className="stats-label">Monthly Revenue</p>
                                <div className="stats-trend positive">
                                    <ArrowUp size={12} />
                                    <span>+8% from last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-info">
                                <Bell size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">{stats.notifications?.length || 0}</h3>
                                <p className="stats-label">Notifications</p>
                                <div className="stats-trend neutral">
                                    <Clock size={12} />
                                    <span>Requires attention</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="dashboard-content-grid">
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
                                        {recentMachines.slice(0, 5).map((machine, index) => (
                                            <div key={machine._id || index} className="machine-item">
                                                <div className="machine-info">
                                                    <h4 className="machine-name">
                                                        {machine.machineType || 'Unknown Type'}
                                                    </h4>
                                                    <p className="machine-id">
                                                        ID: {machine.machineID || 'N/A'}
                                                    </p>
                                                    <p className="machine-location">
                                                        📍 {machine.location || 'Unknown Location'}
                                                    </p>
                                                </div>
                                                <div className="machine-meta">
                                                    {getStatusBadge(machine.status)}
                                                    <div className="machine-updated">
                                                        {formatDate(machine.updatedAt)}
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
                        <div className="dashboard-card" id="notifications-section">
                            <div className="card-header-modern">
                                <h3 className="card-title-modern">System Notifications</h3>
                                {stats.notifications && stats.notifications.length > 0 && (
                                    <span className="notification-count">
                                        {stats.notifications.length} active
                                    </span>
                                )}
                            </div>
                            <div className="card-content">
                                {stats.notifications && stats.notifications.length > 0 ? (
                                    <div className="notification-list">
                                        {stats.notifications.slice(0, 5).map((notification, index) => (
                                            <div key={index} className={`notification-item ${getPriorityClass(notification.priority)}`}>
                                                <div className="notification-icon">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="notification-content">
                                                    <h5 className="notification-title">
                                                        {notification.title || 'Notification'}
                                                    </h5>
                                                    <p className="notification-text">
                                                        {notification.message || 'No message available'}
                                                    </p>
                                                    <span className="notification-time">
                                                        {formatDate(notification.timestamp)}
                                                    </span>
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
                                        className="quick-action-card"
                                    >
                                        <div className="action-icon">
                                            <Plus size={24} />
                                        </div>
                                        <h4 className="action-title">Add New Machine</h4>
                                        <p className="action-description">Register a new machine in the system</p>
                                    </button>

                                    <button 
                                        onClick={() => router.push('/admin/add-order')}
                                        className="quick-action-card"
                                    >
                                        <div className="action-icon">
                                            <FileText size={24} />
                                        </div>
                                        <h4 className="action-title">Assign Machine</h4>
                                        <p className="action-description">Create new machine assignment</p>
                                    </button>

                                    <button 
                                        onClick={() => router.push('/admin/requests')}
                                        className="quick-action-card"
                                    >
                                        <div className="action-icon">
                                            <MessageSquare size={24} />
                                        </div>
                                        <h4 className="action-title">Manage Requests</h4>
                                        <p className="action-description">Review and process customer requests</p>
                                    </button>

                                    <button 
                                        onClick={() => router.push('/admin/machines')}
                                        className="quick-action-card"
                                    >
                                        <div className="action-icon">
                                            <Truck size={24} />
                                        </div>
                                        <h4 className="action-title">View All Machines</h4>
                                        <p className="action-description">Browse complete machine inventory</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    )
}