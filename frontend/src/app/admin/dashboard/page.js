'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Layout from '@/components/Layout'
import {
    Truck,
    Plus,
    FileText,
    MessageSquare,
    Settings,
    TrendingUp,
    Wrench,
    Activity,
    Clock,
    AlertTriangle,
    CheckCircle
} from 'lucide-react'

export default function AdminDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState({
        total_machines: 0,
        active_machines: 0,
        maintenance_machines: 0,
        pending_requests: 0
    })
    const [recentMachines, setRecentMachines] = useState([])
    const [recentRequests, setRecentRequests] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        fetchDashboardData()
    }, [session, status])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // Fetch dashboard statistics
            const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                setStats(statsData.data)
            }

            // Fetch recent machines
            const machinesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/machines/recent`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (machinesResponse.ok) {
                const machinesData = await machinesResponse.json()
                setRecentMachines(machinesData.data || [])
            }

            // Fetch recent requests
            const requestsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/requests/recent`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json()
                setRecentRequests(requestsData.data || [])
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Ready': { class: 'badge-ready', icon: CheckCircle },
            'Occupied': { class: 'badge-occupied', icon: Activity },
            'Maintenance': { class: 'badge-maintenance', icon: Wrench },
            'In-transit': { class: 'badge-in-transit', icon: Truck }
        }

        const config = statusConfig[status] || { class: 'badge-pending', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`badge ${config.class} flex items-center`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {status}
            </span>
        )
    }

    const getRequestStatusBadge = (status) => {
        const statusConfig = {
            'Approved': { class: 'badge-approved', icon: CheckCircle },
            'In-Progress': { class: 'badge-pending', icon: Clock },
            'Denied': { class: 'badge-denied', icon: AlertTriangle }
        }

        const config = statusConfig[status] || { class: 'badge-pending', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`badge ${config.class} flex items-center`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {status}
            </span>
        )
    }

    // Show loading state while session is being fetched
    if (status === 'loading') {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        )
    }

    // If no session or not admin, this will be handled by the useEffect redirect
    if (!session || session.user.role !== 'admin') {
        return null
    }

    return (
        <>
            <Head>
                <title>Admin Dashboard - CatRental</title>
                <meta name="description" content="Admin dashboard for managing CatRental operations" />
            </Head>
            <Layout>
                <div className="p-6 bg-gray-50 min-h-screen">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-cat-dark-gray mb-2">Admin Dashboard</h1>
                        <p className="text-cat-medium-gray">
                            Welcome back, {session.user.name}! Here's an overview of your rental operations.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="stat-card">
                                    <div className="stat-number text-cat-yellow flex items-center">
                                        <Truck className="h-8 w-8 mr-2" />
                                        {stats.total_machines}
                                    </div>
                                    <div className="stat-label">Total Machines</div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-number text-success-green flex items-center">
                                        <Activity className="h-8 w-8 mr-2" />
                                        {stats.active_machines}
                                    </div>
                                    <div className="stat-label">Active Machines</div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-number text-warning-orange flex items-center">
                                        <Wrench className="h-8 w-8 mr-2" />
                                        {stats.maintenance_machines}
                                    </div>
                                    <div className="stat-label">Under Maintenance</div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-number text-info-blue flex items-center">
                                        <Clock className="h-8 w-8 mr-2" />
                                        {stats.pending_requests}
                                    </div>
                                    <div className="stat-label">Pending Requests</div>
                                </div>
                            </div>

                            {/* Recent Machines and Requests */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Recent Machines */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center">
                                            <Truck className="h-5 w-5 mr-2" />
                                            Recent Machines
                                        </h3>
                                    </div>
                                    <div className="card-body">
                                        {recentMachines.length > 0 ? (
                                            <div className="space-y-4">
                                                {recentMachines.map((machine) => (
                                                    <div key={machine.machine_id} className="flex items-center justify-between p-3 bg-cat-light-gray rounded">
                                                        <div>
                                                            <div className="font-medium">{machine.machine_id}</div>
                                                            <div className="text-sm text-cat-medium-gray">{machine.machine_type}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            {getStatusBadge(machine.status)}
                                                            <div className="text-sm text-cat-medium-gray mt-1">
                                                                {machine.location}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-cat-medium-gray text-center py-4">No recent machines</p>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Requests */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center">
                                            <MessageSquare className="h-5 w-5 mr-2" />
                                            Recent Requests
                                        </h3>
                                    </div>
                                    <div className="card-body">
                                        {recentRequests.length > 0 ? (
                                            <div className="space-y-4">
                                                {recentRequests.map((request) => (
                                                    <div key={request._id} className="flex items-center justify-between p-3 bg-cat-light-gray rounded">
                                                        <div>
                                                            <div className="font-medium">{request.machineID}</div>
                                                            <div className="text-sm text-cat-medium-gray">
                                                                {new Date(request.requestDate).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {getRequestStatusBadge(request.status)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-cat-medium-gray text-center py-4">No recent requests</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title flex items-center">
                                        <TrendingUp className="h-5 w-5 mr-2" />
                                        Quick Actions
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <button
                                            onClick={() => router.push('/admin/add-machine')}
                                            className="btn-primary flex items-center justify-center"
                                        >
                                            <Plus className="h-5 w-5 mr-2" />
                                            Add New Machine
                                        </button>

                                        <button
                                            onClick={() => router.push('/admin/add-order')}
                                            className="btn-secondary flex items-center justify-center"
                                        >
                                            <FileText className="h-5 w-5 mr-2" />
                                            Create Order
                                        </button>

                                        <button
                                            onClick={() => router.push('/admin/requests')}
                                            className="btn-secondary flex items-center justify-center"
                                        >
                                            <MessageSquare className="h-5 w-5 mr-2" />
                                            Manage Requests
                                        </button>

                                        <button
                                            onClick={() => router.push('/admin/machines')}
                                            className="btn-secondary flex items-center justify-center"
                                        >
                                            <Settings className="h-5 w-5 mr-2" />
                                            View All Machines
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Layout>
        </>
    )
}