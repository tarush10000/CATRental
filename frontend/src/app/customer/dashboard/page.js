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
    RefreshCw, ArrowUp, ArrowDown, Eye, Calendar,
    XCircle, Send, Filter, Search
} from 'lucide-react'

export default function CustomerDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    
    const [stats, setStats] = useState({
        my_machines: 0,
        active_orders: 0,
        pending_requests: 0,
        completed_orders: 0
    })
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showRequestForm, setShowRequestForm] = useState(false)
    const [selectedMachine, setSelectedMachine] = useState('')
    const [requestFormData, setRequestFormData] = useState({
        machineID: '',
        requestType: 'Support',
        date: '',
        comments: ''
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
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

            // Fetch dashboard stats
            const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                if (statsData.success) {
                    setStats(statsData.data)
                }
            }

            // Fetch user's machines
            const machinesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machines`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (machinesResponse.ok) {
                const machinesData = await machinesResponse.json()
                if (machinesData.success) {
                    setMachines(machinesData.data.machines || [])
                }
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleCreateRequest = (machineId = '', requestType = 'Support') => {
        setSelectedMachine(machineId)
        setRequestFormData({
            machineID: machineId,
            requestType: requestType,
            date: requestType === 'Support' ? '' : new Date().toISOString().split('T')[0],
            comments: ''
        })
        setShowRequestForm(true)
    }

    const handleFormSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({
                    machineID: requestFormData.machineID,
                    requestType: requestFormData.requestType,
                    description: requestFormData.comments,
                    date: requestFormData.date || null
                })
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    alert('Request submitted successfully!')
                    setShowRequestForm(false)
                    setRequestFormData({ machineID: '', requestType: 'Support', date: '', comments: '' })
                    fetchDashboardData(true) // Refresh data
                }
            } else {
                throw new Error('Failed to submit request')
            }
        } catch (error) {
            console.error('Error submitting request:', error)
            alert('Error submitting request. Please try again.')
        } finally {
            setSubmitting(false)
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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            return new Date(dateString).toLocaleDateString()
        } catch {
            return 'N/A'
        }
    }

    const calculateEfficiency = (machine) => {
        if (!machine.engineHoursPerDay || !machine.operatingDays) return 0
        const totalPossibleHours = machine.operatingDays * 24
        const actualHours = machine.engineHoursPerDay * machine.operatingDays
        const idleHours = machine.idleHours || 0
        const efficiency = ((actualHours - idleHours) / actualHours) * 100
        return Math.round(efficiency) || 0
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
                <title>Customer Dashboard - Caterpillar Machine Tracker</title>
                <meta name="description" content="Customer dashboard for managing Caterpillar machine rentals and requests" />
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
                                    Customer Dashboard - Manage Your Equipment
                                </p>
                            </div>
                            <div className="header-actions">
                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="btn-modern btn-secondary-modern"
                                >
                                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                    {refreshing ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button 
                                    onClick={() => handleCreateRequest()}
                                    className="btn-modern btn-primary-modern"
                                >
                                    <Plus size={16} />
                                    Create Request
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
                                <h3 className="stats-number">{stats.my_machines}</h3>
                                <p className="stats-label">My Machines</p>
                                <div className="stats-trend positive">
                                    <ArrowUp size={12} />
                                    <span>Equipment assigned</span>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-info">
                                <Activity size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">{stats.active_orders}</h3>
                                <p className="stats-label">Active Orders</p>
                                <div className="stats-trend positive">
                                    <TrendingUp size={12} />
                                    <span>In progress</span>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-warning">
                                <Clock size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">{stats.pending_requests}</h3>
                                <p className="stats-label">Pending Requests</p>
                                <div className="stats-trend neutral">
                                    <Clock size={12} />
                                    <span>Awaiting approval</span>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card stats-card">
                            <div className="stats-icon stats-success">
                                <CheckCircle size={24} />
                            </div>
                            <div className="stats-content">
                                <h3 className="stats-number">{stats.completed_orders}</h3>
                                <p className="stats-label">Completed Orders</p>
                                <div className="stats-trend positive">
                                    <ArrowUp size={12} />
                                    <span>Total completed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="dashboard-content-grid">
                        {/* My Machines */}
                        <div className="dashboard-card full-width">
                            <div className="card-header-modern">
                                <div>
                                    <h3 className="card-title-modern">My Equipment</h3>
                                    <p className="card-subtitle">Manage your assigned machines and view usage statistics</p>
                                </div>
                                <button 
                                    onClick={() => router.push('/customer/machines')}
                                    className="btn-modern btn-sm btn-secondary-modern"
                                >
                                    <Eye size={14} />
                                    View All
                                </button>
                            </div>
                            <div className="card-content">
                                {machines.length > 0 ? (
                                    <div className="machine-grid">
                                        {machines.map((machine) => (
                                            <div key={machine.machineID} className="machine-card">
                                                <div className="machine-header">
                                                    <div className="machine-info">
                                                        <div className="machine-icon">
                                                            <Truck size={24} />
                                                        </div>
                                                        <div className="machine-details">
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
                                                    </div>
                                                    <div className="machine-status">
                                                        {getStatusBadge(machine.status)}
                                                    </div>
                                                </div>

                                                {/* Usage Statistics */}
                                                <div className="usage-stats">
                                                    <div className="stats-row">
                                                        <div className="stat-item">
                                                            <div className="stat-number">{Math.round(machine.engineHoursPerDay * machine.operatingDays * 100) / 100 || 0}</div>
                                                            <div className="stat-label">Total Hours</div>
                                                        </div>
                                                        <div className="stat-item">
                                                            <div className="stat-number">{Math.round(machine.operatingDays * 100) / 100 || 0}</div>
                                                            <div className="stat-label">Operating Days</div>
                                                        </div>
                                                        <div className="stat-item">
                                                            <div className="stat-number">{Math.round(machine.idleHours * 100) / 100 || 0}h</div>
                                                            <div className="stat-label">Idle Time</div>
                                                        </div>
                                                    </div>
                                                    <div className="efficiency-section">
                                                        <div className="efficiency-label">
                                                            Efficiency Score: {calculateEfficiency(machine)}%
                                                        </div>
                                                        <div className="efficiency-bar">
                                                            <div 
                                                                className="efficiency-fill" 
                                                                style={{width: `${calculateEfficiency(machine)}%`}}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="machine-actions">
                                                    <button 
                                                        className="action-btn btn-support"
                                                        onClick={() => handleCreateRequest(machine.machineID, 'Support')}
                                                    >
                                                        <MessageSquare size={14} />
                                                        Support
                                                    </button>
                                                    <button 
                                                        className="action-btn btn-extension"
                                                        onClick={() => handleCreateRequest(machine.machineID, 'Extension')}
                                                    >
                                                        <Calendar size={14} />
                                                        Extend
                                                    </button>
                                                    <button 
                                                        className="action-btn btn-cancellation"
                                                        onClick={() => handleCreateRequest(machine.machineID, 'Cancellation')}
                                                    >
                                                        <XCircle size={14} />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state-small">
                                        <Truck size={48} className="empty-icon" />
                                        <h4 className="empty-title">No Machines Assigned</h4>
                                        <p className="empty-text">
                                            You don't have any machines assigned yet. Contact your administrator to get started.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Form Modal */}
                {showRequestForm && (
                    <div className="modal-overlay" onClick={() => !submitting && setShowRequestForm(false)}>
                        <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">Create Service Request</h3>
                                <p className="modal-subtitle">Submit a request for your equipment</p>
                            </div>

                            <form onSubmit={handleFormSubmit} className="modal-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Machine</label>
                                        <select 
                                            className="form-select"
                                            value={requestFormData.machineID}
                                            onChange={(e) => setRequestFormData({...requestFormData, machineID: e.target.value})}
                                            required
                                            disabled={submitting}
                                        >
                                            <option value="">Select a machine</option>
                                            {machines.map(machine => (
                                                <option key={machine.machineID} value={machine.machineID}>
                                                    {machine.machineID} - {machine.machineType}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Request Type</label>
                                        <select 
                                            className="form-select"
                                            value={requestFormData.requestType}
                                            onChange={(e) => setRequestFormData({...requestFormData, requestType: e.target.value})}
                                            required
                                            disabled={submitting}
                                        >
                                            <option value="Support">Support</option>
                                            <option value="Extension">Extension</option>
                                            <option value="Cancellation">Cancellation</option>
                                        </select>
                                    </div>

                                    {(requestFormData.requestType === 'Extension' || requestFormData.requestType === 'Cancellation') && (
                                        <div className="form-group form-group-full">
                                            <label className="form-label">
                                                {requestFormData.requestType === 'Extension' ? 'Extend Until' : 'Cancellation Date'}
                                            </label>
                                            <input 
                                                type="date"
                                                className="form-input"
                                                value={requestFormData.date}
                                                onChange={(e) => setRequestFormData({...requestFormData, date: e.target.value})}
                                                required
                                                disabled={submitting}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    )}

                                    <div className="form-group form-group-full">
                                        <label className="form-label">Comments</label>
                                        <textarea 
                                            className="form-textarea"
                                            rows="4"
                                            placeholder="Please provide details about your request..."
                                            value={requestFormData.comments}
                                            onChange={(e) => setRequestFormData({...requestFormData, comments: e.target.value})}
                                            required
                                            disabled={submitting}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn-modern btn-secondary-modern"
                                        onClick={() => setShowRequestForm(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-modern btn-primary-modern"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={16} />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={16} />
                                                Submit Request
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <style jsx>{`
                    /* Machine Grid Layout */
                    .machine-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                        gap: 1.5rem;
                    }

                    .machine-card {
                        background: #f8fafc;
                        border: 2px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 1.5rem;
                        transition: all 0.3s ease;
                    }

                    .machine-card:hover {
                        border-color: var(--cat-yellow);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    }

                    .machine-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 1.5rem;
                    }

                    .machine-info {
                        display: flex;
                        gap: 1rem;
                        align-items: flex-start;
                    }

                    .machine-icon {
                        width: 3rem;
                        height: 3rem;
                        background: linear-gradient(135deg, var(--cat-yellow), #e6b800);
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--cat-black);
                        flex-shrink: 0;
                    }

                    .machine-details {
                        flex: 1;
                    }

                    .machine-name {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin: 0 0 0.25rem 0;
                    }

                    .machine-id {
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        margin: 0 0 0.25rem 0;
                    }

                    .machine-location {
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        margin: 0;
                    }

                    .machine-status {
                        flex-shrink: 0;
                    }

                    /* Status Badges */
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        padding: 0.375rem 0.75rem;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .badge-success {
                        background: #d1fae5;
                        color: #065f46;
                    }

                    .badge-primary {
                        background: #dbeafe;
                        color: #1e40af;
                    }

                    .badge-warning {
                        background: #fef3c7;
                        color: #92400e;
                    }

                    .badge-danger {
                        background: #fee2e2;
                        color: #991b1b;
                    }

                    .badge-secondary {
                        background: #f1f5f9;
                        color: #475569;
                    }

                    /* Usage Statistics */
                    .usage-stats {
                        background: white;
                        border-radius: 12px;
                        padding: 1.25rem;
                        margin-bottom: 1.5rem;
                        border: 1px solid #e2e8f0;
                    }

                    .stats-row {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 1rem;
                        margin-bottom: 1rem;
                    }

                    .stat-item {
                        text-align: center;
                        padding: 0.75rem;
                        background: #f8fafc;
                        border-radius: 8px;
                    }

                    .stat-number {
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: var(--cat-dark-gray);
                        margin-bottom: 0.25rem;
                    }

                    .stat-label {
                        font-size: 0.75rem;
                        color: var(--cat-medium-gray);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .efficiency-section {
                        margin-top: 1rem;
                    }

                    .efficiency-label {
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin-bottom: 0.5rem;
                    }

                    .efficiency-bar {
                        background: #e2e8f0;
                        height: 8px;
                        border-radius: 4px;
                        overflow: hidden;
                    }

                    .efficiency-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #f59e0b, #10b981);
                        transition: width 0.5s ease;
                        border-radius: 4px;
                    }

                    /* Machine Actions */
                    .machine-actions {
                        display: flex;
                        gap: 0.75rem;
                        flex-wrap: wrap;
                    }

                    .action-btn {
                        flex: 1;
                        min-width: 120px;
                        border: none;
                        border-radius: 10px;
                        padding: 0.75rem 1rem;
                        font-size: 0.875rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    }

                    .btn-support {
                        background: #3b82f6;
                        color: white;
                    }

                    .btn-support:hover {
                        background: #2563eb;
                        transform: translateY(-1px);
                    }

                    .btn-extension {
                        background: #10b981;
                        color: white;
                    }

                    .btn-extension:hover {
                        background: #059669;
                        transform: translateY(-1px);
                    }

                    .btn-cancellation {
                        background: #ef4444;
                        color: white;
                    }

                    .btn-cancellation:hover {
                        background: #dc2626;
                        transform: translateY(-1px);
                    }

                    /* Modal Styles */
                    .modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.6);
                        backdrop-filter: blur(4px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 1rem;
                    }

                    .modal-modern {
                        background: white;
                        border-radius: 20px;
                        width: 100%;
                        max-width: 600px;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                    }

                    .modal-header {
                        background: linear-gradient(135deg, var(--cat-yellow), #e6b800);
                        color: var(--cat-black);
                        padding: 2rem;
                        border-radius: 20px 20px 0 0;
                    }

                    .modal-title {
                        margin: 0 0 0.5rem 0;
                        font-size: 1.5rem;
                        font-weight: 700;
                    }

                    .modal-subtitle {
                        margin: 0;
                        opacity: 0.8;
                        font-size: 0.95rem;
                    }

                    .modal-form {
                        padding: 2rem;
                    }

                    .form-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1.5rem;
                        margin-bottom: 2rem;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                    }

                    .form-group-full {
                        grid-column: 1 / -1;
                    }

                    .form-label {
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                    }

                    .form-select,
                    .form-input,
                    .form-textarea {
                        width: 100%;
                        padding: 0.875rem 1rem;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 1rem;
                        transition: all 0.2s ease;
                        background: white;
                    }

                    .form-select:focus,
                    .form-input:focus,
                    .form-textarea:focus {
                        outline: none;
                        border-color: var(--cat-yellow);
                        box-shadow: 0 0 0 3px rgba(255, 205, 17, 0.1);
                    }

                    .form-textarea {
                        resize: vertical;
                        font-family: inherit;
                    }

                    .modal-footer {
                        background: #f8fafc;
                        padding: 1.5rem 2rem;
                        border-radius: 0 0 20px 20px;
                        display: flex;
                        gap: 1rem;
                        justify-content: flex-end;
                        border-top: 1px solid #e2e8f0;
                    }

                    /* Empty State */
                    .empty-state-small {
                        text-align: center;
                        padding: 3rem 2rem;
                        color: var(--cat-medium-gray);
                    }

                    .empty-icon {
                        color: var(--cat-light-gray);
                        margin-bottom: 1rem;
                    }

                    .empty-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin: 0 0 0.5rem 0;
                    }

                    .empty-text {
                        margin: 0;
                        line-height: 1.6;
                    }

                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .machine-grid {
                            grid-template-columns: 1fr;
                        }

                        .machine-card {
                            padding: 1.25rem;
                        }

                        .machine-header {
                            flex-direction: column;
                            gap: 1rem;
                            align-items: stretch;
                        }

                        .machine-info {
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            gap: 0.75rem;
                        }

                        .machine-status {
                            align-self: center;
                        }

                        .stats-row {
                            grid-template-columns: 1fr;
                            gap: 0.75rem;
                        }

                        .machine-actions {
                            flex-direction: column;
                        }

                        .action-btn {
                            min-width: auto;
                        }

                        .form-grid {
                            grid-template-columns: 1fr;
                            gap: 1rem;
                        }

                        .modal-form {
                            padding: 1.5rem;
                        }

                        .modal-header {
                            padding: 1.5rem;
                        }

                        .modal-footer {
                            padding: 1rem 1.5rem;
                            flex-direction: column;
                        }
                    }

                    @media (max-width: 480px) {
                        .dashboard-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }

                        .stats-number {
                            font-size: 1.75rem;
                        }

                        .dashboard-title {
                            font-size: 1.75rem;
                        }

                        .machine-card {
                            padding: 1rem;
                        }
                    }
                `}</style>
            </Layout>
        </>
    )
}