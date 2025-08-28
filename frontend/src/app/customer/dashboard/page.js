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
    Lightbulb,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    Activity,
    Package
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
    const [myMachines, setMyMachines] = useState([])
    const [myRequests, setMyRequests] = useState([])
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }

        fetchDashboardData()
    }, [session, status])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // Fetch dashboard statistics
            const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                setStats(statsData.data)
            }

            // Fetch user's machines
            const machinesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machines`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (machinesResponse.ok) {
                const machinesData = await machinesResponse.json()
                setMyMachines(machinesData.data?.machines?.slice(0, 5) || [])
            }

            // Fetch user's requests
            const requestsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (requestsResponse.ok) {
                const requestsData = await requestsResponse.json()
                setMyRequests(requestsData.data?.requests?.slice(0, 5) || [])
            }

            // Fetch recommendations
            const recommendationsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/recommendations`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (recommendationsResponse.ok) {
                const recommendationsData = await recommendationsResponse.json()
                setRecommendations(recommendationsData.data?.slice(0, 3) || [])
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
            'Maintenance': { class: 'badge-maintenance', icon: AlertTriangle },
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

    const getPriorityIcon = (priority) => {
        const priorityConfig = {
            'high': { icon: AlertTriangle, class: 'text-red-500' },
            'medium': { icon: Clock, class: 'text-yellow-500' },
            'low': { icon: CheckCircle, class: 'text-green-500' }
        }

        const config = priorityConfig[priority] || priorityConfig['medium']
        const IconComponent = config.icon

        return <IconComponent className={`w-5 h-5 ${config.class}`} />
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

    // If no session or not customer, this will be handled by the useEffect redirect
    if (!session || session.user.role !== 'customer') {
        return null
    }

    return (
        <>
            <Head>
                <title>Customer Dashboard - CatRental</title>
                <meta name="description" content="Customer dashboard for managing CatRental equipment and requests" />
            </Head>
            <Layout>
                <div className="p-6 bg-gray-50 min-h-screen">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-cat-dark-gray mb-2">Customer Dashboard</h1>
                        <p className="text-cat-medium-gray">
                            Welcome back, {session.user.name}! Manage your equipment and track your requests.
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
                                        {stats.my_machines}
                                    </div>
                                    <div className="stat-label">My Machines</div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-number text-info-blue flex items-center">
                                        <Package className="h-8 w-8 mr-2" />
                                        {stats.active_orders}
                                    </div>
                                    <div className="stat-label">Active Orders</div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-number text-warning-orange flex items-center">
                                        <Clock className="h-8 w-8 mr-2" />
                                        {stats.pending_requests}
                                    </div>
                                    <div className="stat-label">Pending Requests</div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-number text-success-green flex items-center">
                                        <CheckCircle className="h-8 w-8 mr-2" />
                                        {stats.completed_orders}
                                    </div>
                                    <div className="stat-label">Completed Orders</div>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                {/* My Machines */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center">
                                            <Truck className="h-5 w-5 mr-2" />
                                            My Machines
                                        </h3>
                                    </div>
                                    <div className="card-body">
                                        {myMachines.length > 0 ? (
                                            <div className="space-y-4">
                                                {myMachines.map((machine) => (
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
                                            <p className="text-cat-medium-gray text-center py-4">No machines assigned</p>
                                        )}

                                        <div className="mt-4">
                                            <button
                                                onClick={() => router.push('/customer/machines')}
                                                className="btn-secondary w-full"
                                            >
                                                View All Machines
                                            </button>
                                        </div>
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
                                        {myRequests.length > 0 ? (
                                            <div className="space-y-4">
                                                {myRequests.map((request) => (
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

                                        <div className="mt-4">
                                            <button
                                                onClick={() => router.push('/customer/create-request')}
                                                className="btn-primary w-full"
                                            >
                                                Create New Request
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Smart Recommendations */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title flex items-center">
                                            <Lightbulb className="h-5 w-5 mr-2" />
                                            Smart Recommendations
                                        </h3>
                                    </div>
                                    <div className="card-body">
                                        {recommendations.length > 0 ? (
                                            <div className="space-y-4">
                                                {recommendations.map((recommendation, index) => (
                                                    <div key={index} className="p-3 border rounded-lg">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <h4 className="font-medium text-sm">{recommendation.title}</h4>
                                                            {getPriorityIcon(recommendation.priority)}
                                                        </div>
                                                        <p className="text-xs text-cat-medium-gray mb-2">
                                                            {recommendation.description}
                                                        </p>
                                                        {recommendation.suggested_action && (
                                                            <div className="text-xs text-blue-600 font-medium">
                                                                💡 {recommendation.suggested_action}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-cat-medium-gray text-center py-4">No recommendations available</p>
                                        )}

                                        <div className="mt-4">
                                            <button
                                                onClick={() => router.push('/customer/recommendations')}
                                                className="btn-secondary w-full"
                                            >
                                                View All Recommendations
                                            </button>
                                        </div>
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
                                            onClick={() => router.push('/customer/create-request')}
                                            className="btn-primary flex items-center justify-center"
                                        >
                                            <Plus className="h-5 w-5 mr-2" />
                                            New Request
                                        </button>

                                        <button
                                            onClick={() => router.push('/customer/machines')}
                                            className="btn-secondary flex items-center justify-center"
                                        >
                                            <Truck className="h-5 w-5 mr-2" />
                                            My Machines
                                        </button>

                                        <button
                                            onClick={() => router.push('/customer/recommendations')}
                                            className="btn-secondary flex items-center justify-center"
                                        >
                                            <Lightbulb className="h-5 w-5 mr-2" />
                                            Recommendations
                                        </button>

                                        <button
                                            onClick={() => router.push('/customer/support')}
                                            className="btn-secondary flex items-center justify-center"
                                        >
                                            <MessageSquare className="h-5 w-5 mr-2" />
                                            Support
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