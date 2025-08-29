// Place this file at: frontend/src/app/customer/[other-pages]/page.js

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import {
    Truck, Plus, FileText, MessageSquare, Lightbulb,
    TrendingUp, Clock, CheckCircle, AlertTriangle, Activity, Package
} from 'lucide-react'

export default function CustomerOtherPages() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }

        // Handle routing to correct pages based on the dynamic route
        const page = params['other-pages']
        
        switch(page) {
            case 'machines':
                // This would be handled by a dedicated machines page
                break
            case 'create-request':
                // This would be handled by a dedicated create-request page
                break
            case 'recommendations':
                // This would be handled by a dedicated recommendations page
                break
            default:
                // Redirect to dashboard if unknown page
                router.push('/customer/dashboard')
                return
        }
    }, [session, status, router, params])

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

    const page = params['other-pages']

    // Render different content based on the page
    const renderPageContent = () => {
        switch(page) {
            case 'machines':
                return <CustomerMachines />
            // case 'create-request':
            //     return <CreateRequest />
            case 'recommendations':
                return <Recommendations />
            default:
                return <div>Page not found. Redirecting...</div>
        }
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {renderPageContent()}
                </div>
            </div>
        </Layout>
    )
}

// Component for Customer Machines page
function CustomerMachines() {
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Truck className="h-8 w-8 mr-3 text-blue-600" />
                    My Machines
                </h1>
                <p className="mt-2 text-gray-600">
                    View and manage your assigned construction equipment
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-12">
                    <Truck className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No machines assigned</h3>
                    <p className="text-gray-500 mb-6">
                        Contact your admin to get machines assigned to your projects.
                    </p>
                    <button className="btn-primary flex items-center mx-auto">
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    )
}

// Component for Create Request page
function CreateRequest() {
    const [formData, setFormData] = useState({
        machineType: '',
        description: '',
        priority: 'medium',
        location: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        // Handle form submission
        console.log('Creating request:', formData)
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Plus className="h-8 w-8 mr-3 text-blue-600" />
                    Create New Request
                </h1>
                <p className="mt-2 text-gray-600">
                    Request new equipment for your construction projects
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Machine Type
                        </label>
                        <select
                            name="machineType"
                            value={formData.machineType}
                            onChange={handleChange}
                            className="form-input"
                            required
                        >
                            <option value="">Select machine type...</option>
                            <option value="excavator">Excavator</option>
                            <option value="bulldozer">Bulldozer</option>
                            <option value="loader">Loader</option>
                            <option value="crane">Crane</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="form-input"
                            placeholder="Describe your project requirements..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                        </label>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="form-input"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Location
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter project location..."
                            required
                        />
                    </div>

                    <div className="flex gap-4">
                        <button type="submit" className="btn-primary flex items-center">
                            <FileText className="h-5 w-5 mr-2" />
                            Submit Request
                        </button>
                        <button type="button" className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Component for Recommendations page
function Recommendations() {
    const recommendations = [
        {
            type: 'efficiency',
            title: 'Optimize Machine Usage',
            description: 'Based on your usage patterns, you could improve efficiency by 15%.',
            priority: 'medium',
            action: 'Schedule maintenance during peak idle hours'
        },
        {
            type: 'cost_saving',
            title: 'Reduce Transportation Costs',
            description: 'Consolidate machine locations to save on transport costs.',
            priority: 'low',
            action: 'Review current deployment locations'
        }
    ]

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'high': return 'text-red-600 bg-red-100'
            case 'medium': return 'text-yellow-600 bg-yellow-100'
            case 'low': return 'text-green-600 bg-green-100'
            default: return 'text-gray-600 bg-gray-100'
        }
    }

    const getPriorityIcon = (priority) => {
        switch(priority) {
            case 'high': return <AlertTriangle className="h-5 w-5" />
            case 'medium': return <Clock className="h-5 w-5" />
            case 'low': return <CheckCircle className="h-5 w-5" />
            default: return <Activity className="h-5 w-5" />
        }
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Lightbulb className="h-8 w-8 mr-3 text-blue-600" />
                    Smart Recommendations
                </h1>
                <p className="mt-2 text-gray-600">
                    AI-powered insights to optimize your equipment usage
                </p>
            </div>

            <div className="space-y-6">
                {recommendations.map((rec, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                                <div className={`p-2 rounded-full mr-3 ${getPriorityColor(rec.priority)}`}>
                                    {getPriorityIcon(rec.priority)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{rec.title}</h3>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                                        {rec.priority.toUpperCase()} PRIORITY
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{rec.description}</p>
                        
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <div className="flex items-center">
                                <Lightbulb className="h-5 w-5 text-blue-400 mr-2" />
                                <p className="text-blue-700 font-medium">Recommended Action:</p>
                            </div>
                            <p className="text-blue-600 mt-1">{rec.action}</p>
                        </div>
                    </div>
                ))}

                {recommendations.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Lightbulb className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations available</h3>
                        <p className="text-gray-500">
                            We'll analyze your usage patterns and provide personalized recommendations soon.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}