'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import {
    Truck, Plus, FileText, MessageSquare, Settings,
    TrendingUp, Wrench, Activity, Clock
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
    }, [session, status, router])

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
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">
                            Admin Dashboard
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Welcome back, {session.user.name}! Here's an overview of your rental operations.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Total Machines</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats.total_machines}</p>
                                        </div>
                                        <div className="p-3 bg-blue-100 rounded-full">
                                            <Truck className="h-6 w-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Active Machines</p>
                                            <p className="text-2xl font-bold text-green-600">{stats.active_machines}</p>
                                        </div>
                                        <div className="p-3 bg-green-100 rounded-full">
                                            <Activity className="h-6 w-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">In Maintenance</p>
                                            <p className="text-2xl font-bold text-yellow-600">{stats.maintenance_machines}</p>
                                        </div>
                                        <div className="p-3 bg-yellow-100 rounded-full">
                                            <Wrench className="h-6 w-6 text-yellow-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                                            <p className="text-2xl font-bold text-orange-600">{stats.pending_requests}</p>
                                        </div>
                                        <div className="p-3 bg-orange-100 rounded-full">
                                            <Clock className="h-6 w-6 text-orange-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-lg shadow mb-8 p-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <button
                                        onClick={() => router.push('/admin/add-machine')}
                                        className="btn-primary flex items-center justify-center"
                                    >
                                        <Plus className="h-5 w-5 mr-2" />
                                        Add Machine
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
                        </>
                    )}
                </div>
            </div>
        </Layout>
    )
}