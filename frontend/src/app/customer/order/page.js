'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Layout from '@/components/Layout'
import {
    Package, Search, Filter, Calendar, Clock, 
    CheckCircle, XCircle, RefreshCw, Plus,
    AlertTriangle, Eye, MapPin, Building2
} from 'lucide-react'

export default function MyOrdersPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [filteredOrders, setFilteredOrders] = useState([])

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }

        fetchOrders()
    }, [session, status, router])

    useEffect(() => {
        filterOrders()
    }, [orders, searchTerm, statusFilter])

    const fetchOrders = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true)
            } else {
                setLoading(true)
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setOrders(data.data.orders || [])
                }
            }
        } catch (error) {
            console.error('Error fetching orders:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const filterOrders = () => {
        let filtered = orders

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(order =>
                (order.orderID || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.machineType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.siteID || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.location || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter)
        }

        setFilteredOrders(filtered)
    }

    const handleRefresh = () => {
        fetchOrders(true)
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Pending': { class: 'badge-warning', icon: Clock },
            'Approved': { class: 'badge-success', icon: CheckCircle },
            'Denied': { class: 'badge-danger', icon: XCircle },
            'Completed': { class: 'badge-success', icon: CheckCircle },
            'Cancelled': { class: 'badge-secondary', icon: XCircle }
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

    const calculateDuration = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0
        const start = new Date(checkIn)
        const end = new Date(checkOut)
        const diffTime = end - start
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 0 ? diffDays : 0
    }

    const getStatusCounts = () => {
        return {
            total: orders.length,
            pending: orders.filter(o => o.status === 'Pending').length,
            approved: orders.filter(o => o.status === 'Approved').length,
            denied: orders.filter(o => o.status === 'Denied').length,
            completed: orders.filter(o => o.status === 'Completed').length
        }
    }

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading your orders...</p>
                </div>
            </Layout>
        )
    }

    const statusCounts = getStatusCounts()

    return (
        <>
            <Head>
                <title>My Orders - Caterpillar Machine Tracker</title>
                <meta name="description" content="View and manage your equipment orders" />
            </Head>

            <Layout>
                <div className="admin-container">
                    <div className="admin-content">
                        {/* Page Header */}
                        <div className="page-header">
                            <div className="header-content">
                                <div className="header-text">
                                    <h1 className="page-title">
                                        <Package className="page-title-icon" />
                                        My Orders
                                    </h1>
                                    <p className="page-subtitle">
                                        Track and manage your equipment orders
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
                                        onClick={() => router.push('/customer/create-order')}
                                        className="btn-modern btn-primary-modern"
                                    >
                                        <Plus size={16} />
                                        New Order
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <div className="stats-grid">
                            <div className="stat-card-modern stat-primary">
                                <div className="stat-icon">
                                    <Package size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.total}</div>
                                    <div className="stat-label">Total Orders</div>
                                </div>
                            </div>

                            <div className="stat-card-modern stat-warning">
                                <div className="stat-icon">
                                    <Clock size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.pending}</div>
                                    <div className="stat-label">Pending</div>
                                </div>
                            </div>

                            <div className="stat-card-modern stat-success">
                                <div className="stat-icon">
                                    <CheckCircle size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.approved}</div>
                                    <div className="stat-label">Approved</div>
                                </div>
                            </div>

                            <div className="stat-card-modern stat-info">
                                <div className="stat-icon">
                                    <CheckCircle size={24} />
                                </div>
                                <div className="stat-content">
                                    <div className="stat-value">{statusCounts.completed}</div>
                                    <div className="stat-label">Completed</div>
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
                                                placeholder="Search by order ID, machine type, or site..."
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
                                                <option value="all">All Status</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Denied">Denied</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Orders List */}
                        <div className="modern-card">
                            <div className="card-header-modern">
                                <div>
                                    <h3 className="card-title-modern">Order History</h3>
                                    <p className="card-subtitle">
                                        Showing {filteredOrders.length} of {orders.length} orders
                                    </p>
                                </div>
                            </div>
                            <div className="card-content">
                                {filteredOrders.length > 0 ? (
                                    <div className="orders-grid">
                                        {filteredOrders.map((order) => (
                                            <div key={order._id} className="order-card">
                                                <div className="order-header">
                                                    <div className="order-info">
                                                        <div className="order-icon">
                                                            <Package size={20} />
                                                        </div>
                                                        <div className="order-details">
                                                            <h4 className="order-title">
                                                                {order.machineType}
                                                            </h4>
                                                            <p className="order-id">
                                                                Order: {order.orderID}
                                                            </p>
                                                            <p className="order-site">
                                                                <Building2 size={12} />
                                                                Site: {order.siteID}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="order-status">
                                                        {getStatusBadge(order.status)}
                                                    </div>
                                                </div>

                                                {/* Order Timeline */}
                                                <div className="order-timeline">
                                                    <div className="timeline-item">
                                                        <Calendar size={12} />
                                                        <span>Start: {formatDate(order.checkInDate)}</span>
                                                    </div>
                                                    <div className="timeline-item">
                                                        <Calendar size={12} />
                                                        <span>End: {formatDate(order.checkOutDate)}</span>
                                                    </div>
                                                    <div className="timeline-item">
                                                        <Clock size={12} />
                                                        <span>{calculateDuration(order.checkInDate, order.checkOutDate)} days</span>
                                                    </div>
                                                </div>

                                                {/* Location */}
                                                <div className="order-location">
                                                    <MapPin size={14} />
                                                    <span>{order.location}</span>
                                                </div>

                                                {/* Comments */}
                                                {order.comments && (
                                                    <div className="order-comments">
                                                        <p>"{order.comments}"</p>
                                                    </div>
                                                )}

                                                {/* Order Footer */}
                                                <div className="order-footer">
                                                    <div className="order-dates">
                                                        <span className="date-label">Created:</span>
                                                        <span className="date-value">{formatDate(order.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">
                                            <Package size={48} />
                                        </div>
                                        <h3 className="empty-state-title">
                                            {orders.length === 0 ? 'No Orders Yet' : 'No Matches Found'}
                                        </h3>
                                        <p className="empty-state-description">
                                            {orders.length === 0 
                                                ? "You haven't placed any orders yet. Create your first equipment order to get started."
                                                : "Try adjusting your search terms or filters to find what you're looking for."
                                            }
                                        </p>
                                        {orders.length === 0 && (
                                            <div className="empty-state-actions">
                                                <button 
                                                    onClick={() => router.push('/customer/create-order')}
                                                    className="btn-modern btn-primary-modern"
                                                >
                                                    <Plus size={16} />
                                                    Create First Order
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    /* Orders Grid */
                    .orders-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                        gap: 1.5rem;
                    }

                    .order-card {
                        background: #f8fafc;
                        border: 2px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 1.5rem;
                        transition: all 0.3s ease;
                    }

                    .order-card:hover {
                        border-color: var(--cat-yellow);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    }

                    .order-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 1.5rem;
                    }

                    .order-info {
                        display: flex;
                        gap: 1rem;
                        align-items: flex-start;
                        flex: 1;
                    }

                    .order-icon {
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

                    .order-details {
                        flex: 1;
                    }

                    .order-title {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin: 0 0 0.25rem 0;
                    }

                    .order-id {
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        margin: 0 0 0.25rem 0;
                    }

                    .order-site {
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }

                    .order-status {
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

                    /* Order Timeline */
                    .order-timeline {
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 1rem;
                        margin-bottom: 1rem;
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 0.75rem;
                    }

                    .timeline-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        text-align: center;
                        justify-content: center;
                    }

                    .order-location {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.875rem;
                        color: var(--cat-medium-gray);
                        margin-bottom: 1rem;
                        padding: 0.75rem;
                        background: white;
                        border-radius: 8px;
                    }

                    .order-comments {
                        background: #f0f9ff;
                        border-left: 4px solid #3b82f6;
                        padding: 1rem;
                        margin-bottom: 1rem;
                        border-radius: 0 8px 8px 0;
                    }

                    .order-comments p {
                        margin: 0;
                        font-style: italic;
                        color: var(--cat-dark-gray);
                        font-size: 0.875rem;
                    }

                    .order-footer {
                        border-top: 1px solid #e2e8f0;
                        padding-top: 1rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .order-dates {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.75rem;
                    }

                    .date-label {
                        color: var(--cat-medium-gray);
                        font-weight: 500;
                    }

                    .date-value {
                        color: var(--cat-dark-gray);
                        font-weight: 600;
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

                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .orders-grid {
                            grid-template-columns: 1fr;
                        }

                        .order-card {
                            padding: 1.25rem;
                        }

                        .order-header {
                            flex-direction: column;
                            gap: 1rem;
                            align-items: stretch;
                        }

                        .order-info {
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            gap: 0.75rem;
                        }

                        .order-status {
                            align-self: center;
                        }

                        .order-timeline {
                            grid-template-columns: 1fr;
                            text-align: left;
                        }

                        .timeline-item {
                            justify-content: flex-start;
                        }
                    }

                    @media (max-width: 480px) {
                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }

                        .order-card {
                            padding: 1rem;
                        }
                    }
                `}</style>
            </Layout>
        </>
    )
}