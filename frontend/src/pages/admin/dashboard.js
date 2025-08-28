import { useState, useEffect } from 'react'
import { useSession, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from '@/components/Layout'

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
        const badgeClass = {
            'Ready': 'badge-ready',
            'Occupied': 'badge-occupied',
            'Maintenance': 'badge-maintenance',
            'In-transit': 'badge-in-transit'
        }[status] || 'badge-pending'

        return <span className={`badge ${badgeClass}`}>{status}</span>
    }

    const getRequestStatusBadge = (status) => {
        const badgeClass = {
            'Approved': 'badge-approved',
            'In-Progress': 'badge-pending',
            'Denied': 'badge-denied'
        }[status] || 'badge-pending'

        return <span className={`badge ${badgeClass}`}>{status}</span>
    }

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="spinner mb-4"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <>
            <Head>
                <title>Admin Dashboard - Caterpillar Machine Tracker</title>
            </Head>

            <Layout>
                <div className="space-y-6">
                    {/* Welcome Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-cat-dark-gray">
                            Welcome back, {session?.user?.name}
                        </h1>
                        <p className="text-cat-medium-gray">
                            {session?.user?.dealership_name} - Admin Dashboard
                        </p>
                    </div>

                    {/* Statistics Cards */}
                    <div className="dashboard-grid">
                        <div className="stat-card">
                            <div className="stat-number text-cat-yellow">
                                {stats.total_machines}
                            </div>
                            <div className="stat-label">Total Machines</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-number text-success-green">
                                {stats.active_machines}
                            </div>
                            <div className="stat-label">Active Machines</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-number text-warning-orange">
                                {stats.maintenance_machines}
                            </div>
                            <div className="stat-label">Under Maintenance</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-number text-info-blue">
                                {stats.pending_requests}
                            </div>
                            <div className="stat-label">Pending Requests</div>
                        </div>
                    </div>

                    {/* Recent Machines and Requests */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Machines */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Recent Machines</h3>
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
                                <h3 className="card-title">Recent Requests</h3>
                            </div>
                            <div className="card-body">
                                {recentRequests.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentRequests.map((request) => (
                                            <div key={request.request_id} className="flex items-center justify-between p-3 bg-cat-light-gray rounded">
                                                <div>
                                                    <div className="font-medium">{request.request_type}</div>
                                                    <div className="text-sm text-cat-medium-gray">
                                                        Machine: {request.machine_id}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {getRequestStatusBadge(request.status)}
                                                    <div className="text-sm text-cat-medium-gray mt-1">
                                                        {new Date(request.request_date).toLocaleDateString()}
                                                    </div>
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
                            <h3 className="card-title">Quick Actions</h3>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <button
                                    onClick={() => router.push('/admin/add-machine')}
                                    className="btn-primary"
                                >
                                    🚜 Add New Machine
                                </button>

                                <button
                                    onClick={() => router.push('/admin/add-order')}
                                    className="btn-secondary"
                                >
                                    📝 Create Order
                                </button>

                                <button
                                    onClick={() => router.push('/admin/requests')}
                                    className="btn-secondary"
                                >
                                    📋 Manage Requests
                                </button>

                                <button
                                    onClick={() => router.push('/admin/machines')}
                                    className="btn-secondary"
                                >
                                    🔧 View All Machines
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    )
}

export async function getServerSideProps(context) {
    const session = await getSession(context)

    if (!session || session.user.role !== 'admin') {
        return {
            redirect: {
                destination: '/auth/signin',
                permanent: false,
            },
        }
    }

    return {
        props: { session },
    }
}