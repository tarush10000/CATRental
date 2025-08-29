'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Layout from '@/components/Layout'
import {
    Truck, Search, Filter, Calendar, MessageSquare, 
    XCircle, Eye, RefreshCw, BarChart3, Clock,
    Activity, Wrench, CheckCircle, AlertTriangle,
    MapPin, Plus, Settings, TrendingUp
} from 'lucide-react'

export default function MyMachinesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [filteredMachines, setFilteredMachines] = useState([])
    const [selectedMachine, setSelectedMachine] = useState(null)
    const [showDetails, setShowDetails] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }

        fetchMachines()
    }, [session, status, router])

    useEffect(() => {
        filterMachines()
    }, [machines, searchTerm, statusFilter])

    const fetchMachines = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true)
            } else {
                setLoading(true)
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machines`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setMachines(data.data.machines || [])
                }
            }
        } catch (error) {
            console.error('Error fetching machines:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const filterMachines = () => {
        let filtered = machines

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(machine =>
                (machine.machineID || machine.machine_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (machine.machineType || machine.machine_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (machine.location || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(machine => machine.status === statusFilter)
        }

        setFilteredMachines(filtered)
    }

    const handleRefresh = () => {
        fetchMachines(true)
    }

    const handleCreateRequest = (machineId, requestType = 'Support') => {
        router.push(`/customer/create-request?machineId=${machineId}&requestType=${requestType}`)
    }

    const handleViewDetails = (machine) => {
        setSelectedMachine(machine)
        setShowDetails(true)
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Ready': { class: 'badge-success', icon: CheckCircle },
            'Occupied': { class: 'badge-primary', icon: Activity },
            'In-transit': { class: 'badge-warning', icon: Truck },
            'Maintenance': { class: 'badge-danger', icon: Wrench }
        }

        const config = statusConfig[status] || { class: 'badge-secondary', icon: AlertTriangle }
        const IconComponent = config.icon

        return (
            <span className={`status-badge ${config.class}`}>
                <IconComponent size={12} />
                {status}
            </span>
        )
    }

    const calculateEfficiency = (machine) => {
        if (!machine.engineHoursPerDay || !machine.operatingDays) return 0
        const totalPossibleHours = machine.operatingDays * 24
        const actualHours = machine.engineHoursPerDay * machine.operatingDays
        const idleHours = machine.idleHours || 0
        const efficiency = ((actualHours - idleHours) / actualHours) * 100
        return Math.round(efficiency) || 0
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        } catch {
            return 'N/A'
        }
    }

    const getStatusCounts = () => {
        return {
            total: machines.length,
            occupied: machines.filter(m => m.status === 'Occupied').length,
            ready: machines.filter(m => m.status === 'Ready').length,
            maintenance: machines.filter(m => m.status === 'Maintenance').length,
            transit: machines.filter(m => m.status === 'In-transit').length
        }
    }

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading your machines...</p>
                </div>
            </Layout>
        )
    }

    const statusCounts = getStatusCounts()

    return (
        <>
            <Head>
                <title>My Machines - Caterpillar Machine Tracker</title>
                <meta name="description" content="View and manage your assigned construction equipment" />
            </Head>

            <Layout>
                <div className="admin-container">
                    <div className="admin-content">
                        {/* Page Header */}
                        <div className="page-header">
                            <div className="header-content">
                                <div className="header-text">
                                    <h1 className="page-title">
                                        <Truck className="page-title-icon" />
                                        My Equipment
                                    </h1>
                                    <p className="page-subtitle">
                                        Manage and monitor your assigned construction machines
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
                                        onClick={() => router.push('/customer/create-request')}
                                        className="btn-modern btn-primary-modern"
                                    >
                                        <Plus size={16} />
                                        Create Request
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <div className="stats-grid">
                            <div className="stat-card-modern stat-primary">
                                <div className="stat-icon">
                                    <Truck size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.total}</div>
                                    <div className="stat-label">Total Machines</div>
                                    <div className="stats-trend positive">
                                        <TrendingUp size={12} />
                                        <span>Equipment assigned</span>
                                    </div>
                                </div>
                            </div>

                            <div className="stat-card-modern stat-success">
                                <div className="stat-icon">
                                    <CheckCircle size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.ready}</div>
                                    <div className="stat-label">Ready Machines</div>
                                    <div className="stats-trend neutral">
                                        <CheckCircle size={12} />
                                        <span>Available for use</span>
                                    </div>
                                </div>
                            </div>

                            <div className="stat-card-modern stat-warning">
                                <div className="stat-icon">
                                    <Wrench size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.maintenance}</div>
                                    <div className="stat-label">Maintenance</div>
                                    <div className="stats-trend neutral">
                                        <Wrench size={12} />
                                        <span>Under maintenance</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters and Search */}
                        <div className="modern-card">
                            <div className="card-content">
                                <div className="filters-row">
                                    <div className="filters-left">
                                        <div className="search-input-wrapper">
                                            <Search size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search by machine ID, type, or location..."
                                                className="search-input"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="filters-right">
                                        <div className="filter-select-wrapper">
                                            <Filter size={16} />
                                            <select
                                                className="filter-select"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="all">All Statuses</option>
                                                <option value="Ready">Ready</option>
                                                <option value="Occupied">Occupied</option>
                                                <option value="In-transit">In-transit</option>
                                                <option value="Maintenance">Maintenance</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Machines Grid */}
                        <div className="modern-card">
                            <div className="card-header-modern">
                                <div>
                                    <h3 className="card-title-modern">Equipment Overview</h3>
                                    <p className="card-subtitle">
                                        Showing {filteredMachines.length} of {machines.length} machines
                                    </p>
                                </div>
                            </div>
                            <div className="card-content">
                                {filteredMachines.length > 0 ? (
                                    <div className="machines-grid">
                                        {filteredMachines.map((machine) => (
                                            <div key={machine.machineID || machine.machine_id} className="machine-card">
                                                <div className="machine-header">
                                                    <div className="machine-info">
                                                        <div className="machine-icon">
                                                            <Truck size={20} />
                                                        </div>
                                                        <div className="machine-details">
                                                            <h4 className="machine-name">
                                                                {machine.machineType || machine.machine_type || 'Unknown Type'}
                                                            </h4>
                                                            <p className="machine-id">
                                                                ID: {machine.machineID || machine.machine_id || 'N/A'}
                                                            </p>
                                                            <p className="machine-location">
                                                                <MapPin size={12} />
                                                                {machine.location || 'Unknown Location'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="machine-status">
                                                        {getStatusBadge(machine.status)}
                                                    </div>
                                                </div>

                                                {/* Usage Stats */}
                                                <div className="usage-stats">
                                                    <div className="stats-row">
                                                        <div className="stat-item">
                                                            <div className="stat-number">
                                                                {(machine.engineHoursPerDay * machine.operatingDays) || 0}
                                                            </div>
                                                            <div className="stat-label">Total Hours</div>
                                                        </div>
                                                        <div className="stat-item">
                                                            <div className="stat-number">
                                                                {machine.operatingDays || 0}
                                                            </div>
                                                            <div className="stat-label">Days Active</div>
                                                        </div>
                                                        <div className="stat-item">
                                                            <div className="stat-number">
                                                                {calculateEfficiency(machine)}%
                                                            </div>
                                                            <div className="stat-label">Efficiency</div>
                                                        </div>
                                                    </div>
                                                    <div className="efficiency-bar">
                                                        <div 
                                                            className="efficiency-fill" 
                                                            style={{width: `${calculateEfficiency(machine)}%`}}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Machine Timeline */}
                                                {(machine.checkOutDate || machine.checkInDate) && (
                                                    <div className="machine-timeline">
                                                        <div className="timeline-item">
                                                            <Calendar size={12} />
                                                            <span>
                                                                {machine.checkOutDate ? 
                                                                    `Checked out: ${formatDate(machine.checkOutDate)}` :
                                                                    'Not checked out'
                                                                }
                                                            </span>
                                                        </div>
                                                        {machine.checkInDate && (
                                                            <div className="timeline-item">
                                                                <Calendar size={12} />
                                                                <span>Due back: {formatDate(machine.checkInDate)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="machine-actions">
                                                    <button 
                                                        className="action-btn btn-view"
                                                        onClick={() => handleViewDetails(machine)}
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} />
                                                        <span>Details</span>
                                                    </button>
                                                    <button 
                                                        className="action-btn btn-support"
                                                        onClick={() => handleCreateRequest(machine.machineID || machine.machine_id, 'Support')}
                                                        title="Request Support"
                                                    >
                                                        <MessageSquare size={14} />
                                                        <span>Support</span>
                                                    </button>
                                                    <button 
                                                        className="action-btn btn-extension"
                                                        onClick={() => handleCreateRequest(machine.machineID || machine.machine_id, 'Extension')}
                                                        title="Request Extension"
                                                    >
                                                        <Calendar size={14} />
                                                        <span>Extend</span>
                                                    </button>
                                                    <button 
                                                        className="action-btn btn-cancellation"
                                                        onClick={() => handleCreateRequest(machine.machineID || machine.machine_id, 'Cancellation')}
                                                        title="Request Cancellation"
                                                    >
                                                        <XCircle size={14} />
                                                        <span>Cancel</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">
                                            <Truck size={48} />
                                        </div>
                                        <h3 className="empty-state-title">
                                            {machines.length === 0 ? 'No Machines Assigned' : 'No Matches Found'}
                                        </h3>
                                        <p className="empty-state-description">
                                            {machines.length === 0 
                                                ? "You don't have any machines assigned yet. Contact your administrator to get started."
                                                : "Try adjusting your search terms or filters to find what you're looking for."
                                            }
                                        </p>
                                        {machines.length === 0 && (
                                            <div className="empty-state-actions">
                                                <button 
                                                    onClick={() => router.push('/customer/create-request')}
                                                    className="btn-modern btn-primary-modern"
                                                >
                                                    <Plus size={16} />
                                                    Create Request
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Machine Details Modal */}
                {showDetails && selectedMachine && (
                    <div className="modal-overlay" onClick={() => setShowDetails(false)}>
                        <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">Machine Details</h3>
                                <p className="modal-subtitle">{selectedMachine.machineID || selectedMachine.machine_id} - {selectedMachine.machineType || selectedMachine.machine_type}</p>
                                <button 
                                    className="modal-close"
                                    onClick={() => setShowDetails(false)}
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="details-grid">
                                    <div className="detail-section">
                                        <h4 className="section-title">Basic Information</h4>
                                        <div className="detail-row">
                                            <span className="detail-label">Machine ID:</span>
                                            <span className="detail-value">{selectedMachine.machineID || selectedMachine.machine_id}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Type:</span>
                                            <span className="detail-value">{selectedMachine.machineType || selectedMachine.machine_type}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Location:</span>
                                            <span className="detail-value">{selectedMachine.location}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Status:</span>
                                            <span className="detail-value">{getStatusBadge(selectedMachine.status)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Site ID:</span>
                                            <span className="detail-value">{selectedMachine.siteId || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="detail-section">
                                        <h4 className="section-title">Usage Statistics</h4>
                                        <div className="detail-row">
                                            <span className="detail-label">Hours per Day:</span>
                                            <span className="detail-value">{selectedMachine.engineHoursPerDay || 0} hours</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Operating Days:</span>
                                            <span className="detail-value">{selectedMachine.operatingDays || 0} days</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Idle Hours:</span>
                                            <span className="detail-value">{selectedMachine.idleHours || 0} hours</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Total Hours:</span>
                                            <span className="detail-value">
                                                {(selectedMachine.engineHoursPerDay * selectedMachine.operatingDays) || 0} hours
                                            </span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Efficiency:</span>
                                            <span className="detail-value">{calculateEfficiency(selectedMachine)}%</span>
                                        </div>
                                    </div>

                                    <div className="detail-section">
                                        <h4 className="section-title">Timeline</h4>
                                        <div className="detail-row">
                                            <span className="detail-label">Check-out Date:</span>
                                            <span className="detail-value">{formatDate(selectedMachine.checkOutDate)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Check-in Date:</span>
                                            <span className="detail-value">{formatDate(selectedMachine.checkInDate)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Last Updated:</span>
                                            <span className="detail-value">{formatDate(selectedMachine.updatedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button 
                                    onClick={() => setShowDetails(false)}
                                    className="btn-modern btn-secondary-modern"
                                >
                                    Close
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowDetails(false)
                                        handleCreateRequest(selectedMachine.machineID || selectedMachine.machine_id)
                                    }}
                                    className="btn-modern btn-primary-modern"
                                >
                                    <Plus size={16} />
                                    Create Request
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx>{`
                    /* Machines Grid */
                    .machines-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
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
                        flex: 1;
                    }

                    .machine-icon {
                        width: 2.5rem;
                        height: 2.5rem;
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
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }

                    .machine-status {
                        flex-shrink: 0;
                    }

                    /* Status Badges */
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.25rem;
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
                        font-size: 1.25rem;
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

                    .efficiency-bar {
                        background: #e2e8f0;
                        height: 6px;
                        border-radius: 3px;
                        overflow: hidden;
                    }

                    .efficiency-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #f59e0b, #10b981);
                        transition: width 0.5s ease;
                        border-radius: 3px;
                    }

                    /* Machine Timeline */
                    .machine-timeline {
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 1rem;
                        margin-bottom: 1.5rem;
                    }

                    .timeline-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        margin-bottom: 0.5rem;
                    }

                    .timeline-item:last-child {
                        margin-bottom: 0;
                    }

                    /* Machine Actions */
                    .machine-actions {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.75rem;
                    }

                    .action-btn {
                        border: none;
                        border-radius: 10px;
                        padding: 0.875rem 1.25rem;
                        font-size: 0.875rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        min-height: 44px;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        overflow: hidden;
                        width : 100%;
                    }

                    .btn-view {
                        background: #6b7280;
                        color: white;
                    }

                    .btn-view:hover {
                        background: #4b5563;
                        transform: translateY(-1px);
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

                    /* Empty State */
                    .empty-state {
                        text-align: center;
                        padding: 4rem 2rem;
                        color: var(--cat-medium-gray);
                    }

                    .empty-state-icon {
                        color: var(--cat-light-gray);
                        margin-bottom: 1.5rem;
                        display: flex;
                        justify-content: center;
                    }

                    .empty-state-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin: 0 0 1rem 0;
                    }

                    .empty-state-description {
                        margin: 0 0 2rem 0;
                        line-height: 1.6;
                        max-width: 400px;
                        margin-left: auto;
                        margin-right: auto;
                    }

                    .empty-state-actions {
                        display: flex;
                        justify-content: center;
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
                        max-width: 800px;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                        position: relative;
                    }

                    .modal-header {
                        background: linear-gradient(135deg, var(--cat-yellow), #e6b800);
                        color: var(--cat-black);
                        padding: 2rem;
                        border-radius: 20px 20px 0 0;
                        position: relative;
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

                    .modal-close {
                        position: absolute;
                        top: 1.5rem;
                        right: 1.5rem;
                        background: rgba(0, 0, 0, 0.1);
                        border: none;
                        border-radius: 50%;
                        width: 2.5rem;
                        height: 2.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        color: var(--cat-black);
                    }

                    .modal-close:hover {
                        background: rgba(0, 0, 0, 0.2);
                    }

                    .modal-body {
                        padding: 2rem;
                    }

                    .details-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 2rem;
                    }

                    .detail-section {
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 1.5rem;
                        border: 1px solid #e2e8f0;
                    }

                    .section-title {
                        font-size: 1rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin: 0 0 1rem 0;
                        padding-bottom: 0.5rem;
                        border-bottom: 2px solid #e2e8f0;
                    }

                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #e2e8f0;
                    }

                    .detail-row:last-child {
                        border-bottom: none;
                    }

                    .detail-label {
                        font-weight: 500;
                        color: var(--cat-medium-gray);
                        font-size: 0.875rem;
                    }

                    .detail-value {
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        font-size: 0.875rem;
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

                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .machines-grid {
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
                        }

                        .machine-actions {
                            grid-template-columns: 1fr;
                            gap: 0.5rem;
                        }

                        .action-btn {
                            padding: 0.75rem 1rem;
                            font-size: 0.8rem;
                        }

                        .action-btn span {
                            display: inline;
                        }

                        .details-grid {
                            grid-template-columns: 1fr;
                        }

                        .modal-body {
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
                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }

                        .machine-card {
                            padding: 1rem;
                        }

                        .action-btn span {
                            display: none;
                        }

                        .action-btn {
                            padding: 0.75rem;
                            min-width: 44px;
                        }
                    }
                `}</style>
            </Layout>
        </>
    )
}