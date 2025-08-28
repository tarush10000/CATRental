'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import {
    Truck, Plus, FileText, MessageSquare, Settings,
    TrendingUp, Wrench, Activity, Clock, CheckCircle,
    AlertTriangle, Package, Users, Search, Filter
} from 'lucide-react'

export default function AdminOtherPages() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        // Handle routing to correct pages based on the dynamic route
        const page = params['other-pages']
        
        switch(page) {
            case 'machines':
                // This would be handled by a dedicated machines page
                break
            case 'add-machine':
                // This would be handled by a dedicated add-machine page
                break
            case 'add-order':
                // This would be handled by a dedicated add-order page
                break
            case 'requests':
                // This would be handled by a dedicated requests page
                break
            default:
                // Redirect to dashboard if unknown page
                router.push('/admin/dashboard')
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

    // If no session or not admin, this will be handled by the useEffect redirect
    if (!session || session.user.role !== 'admin') {
        return null
    }

    const page = params['other-pages']

    // Render different content based on the page
    const renderPageContent = () => {
        switch(page) {
            case 'machines':
                return <AdminMachines />
            case 'add-machine':
                return <AddMachine />
            case 'add-order':
                return <AddOrder />
            case 'requests':
                return <ManageRequests />
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

// Component for Admin Machines Management page
function AdminMachines() {
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    const mockMachines = [
        {
            id: 'CAT001',
            type: 'Excavator 320',
            status: 'Ready',
            location: 'Warehouse A',
            lastUpdated: '2024-01-15'
        },
        {
            id: 'CAT002',
            type: 'Bulldozer D6',
            status: 'Occupied',
            location: 'Site B',
            lastUpdated: '2024-01-14'
        },
        {
            id: 'CAT003',
            type: 'Loader 950',
            status: 'Maintenance',
            location: 'Service Center',
            lastUpdated: '2024-01-13'
        }
    ]

    useEffect(() => {
        // Simulate API call
        setTimeout(() => {
            setMachines(mockMachines)
            setLoading(false)
        }, 1000)
    }, [])

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Ready': { class: 'bg-green-100 text-green-800', icon: CheckCircle },
            'Occupied': { class: 'bg-blue-100 text-blue-800', icon: Activity },
            'Maintenance': { class: 'bg-yellow-100 text-yellow-800', icon: Wrench },
            'In-transit': { class: 'bg-purple-100 text-purple-800', icon: Truck }
        }
        
        const config = statusConfig[status] || { class: 'bg-gray-100 text-gray-800', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {status}
            </span>
        )
    }

    const filteredMachines = machines.filter(machine => {
        const matchesFilter = filter === 'all' || machine.status.toLowerCase() === filter
        const matchesSearch = machine.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             machine.type.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
    })

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Settings className="h-8 w-8 mr-3 text-blue-600" />
                    All Machines
                </h1>
                <p className="mt-2 text-gray-600">
                    Manage your entire fleet of construction equipment
                </p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-center space-x-2">
                        <Search className="h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search machines..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input flex-1"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="form-input"
                        >
                            <option value="all">All Status</option>
                            <option value="ready">Ready</option>
                            <option value="occupied">Occupied</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Machines Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Machine ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Location
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Updated
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredMachines.map((machine) => (
                                    <tr key={machine.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {machine.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {machine.type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(machine.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {machine.location}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {machine.lastUpdated}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                                                Edit
                                            </button>
                                            <button className="text-red-600 hover:text-red-900">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// Component for Add Machine page
function AddMachine() {
    const [formData, setFormData] = useState({
        machineId: '',
        machineType: '',
        manufacturer: 'Caterpillar',
        model: '',
        year: new Date().getFullYear(),
        location: '',
        status: 'Ready'
    })
    const [isScanning, setIsScanning] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        console.log('Adding machine:', formData)
        // Handle form submission
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleBarcodeSearch = () => {
        setIsScanning(true)
        // Simulate barcode scanning
        setTimeout(() => {
            setFormData({
                ...formData,
                machineId: 'CAT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                machineType: 'Excavator 320',
                model: '320GC'
            })
            setIsScanning(false)
        }, 2000)
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Plus className="h-8 w-8 mr-3 text-blue-600" />
                    Add New Machine
                </h1>
                <p className="mt-2 text-gray-600">
                    Add new construction equipment to your fleet
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
                {/* Barcode Scanner Section */}
                <div className="mb-8 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Scan Machine Barcode</h3>
                    <p className="text-gray-500 mb-4">
                        Quickly populate machine details by scanning the equipment barcode
                    </p>
                    <button
                        type="button"
                        onClick={handleBarcodeSearch}
                        disabled={isScanning}
                        className="btn-secondary flex items-center mx-auto"
                    >
                        {isScanning ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                                Scanning...
                            </>
                        ) : (
                            <>
                                <Search className="h-5 w-5 mr-2" />
                                Scan Barcode
                            </>
                        )}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Machine ID *
                            </label>
                            <input
                                type="text"
                                name="machineId"
                                value={formData.machineId}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., CAT-EX-001"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Machine Type *
                            </label>
                            <select
                                name="machineType"
                                value={formData.machineType}
                                onChange={handleChange}
                                className="form-input"
                                required
                            >
                                <option value="">Select machine type...</option>
                                <option value="Excavator">Excavator</option>
                                <option value="Bulldozer">Bulldozer</option>
                                <option value="Loader">Loader</option>
                                <option value="Crane">Crane</option>
                                <option value="Grader">Grader</option>
                                <option value="Compactor">Compactor</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Manufacturer
                            </label>
                            <select
                                name="manufacturer"
                                value={formData.manufacturer}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="Caterpillar">Caterpillar</option>
                                <option value="Komatsu">Komatsu</option>
                                <option value="John Deere">John Deere</option>
                                <option value="Volvo">Volvo</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Model
                            </label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., 320GC"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Year
                            </label>
                            <input
                                type="number"
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                className="form-input"
                                min="1990"
                                max={new Date().getFullYear() + 1}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Location *
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., Warehouse A"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Initial Status
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="Ready">Ready</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="In-transit">In-transit</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="submit" className="btn-primary flex items-center">
                            <Plus className="h-5 w-5 mr-2" />
                            Add Machine
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

// Component for Add Order page
function AddOrder() {
    const [formData, setFormData] = useState({
        customerId: '',
        machineType: '',
        quantity: 1,
        startDate: '',
        endDate: '',
        location: '',
        priority: 'medium',
        notes: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        console.log('Creating order:', formData)
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
                    <FileText className="h-8 w-8 mr-3 text-blue-600" />
                    Create New Order
                </h1>
                <p className="mt-2 text-gray-600">
                    Process equipment rental orders for customers
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Customer ID *
                            </label>
                            <input
                                type="text"
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Enter customer ID"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Machine Type *
                            </label>
                            <select
                                name="machineType"
                                value={formData.machineType}
                                onChange={handleChange}
                                className="form-input"
                                required
                            >
                                <option value="">Select machine type...</option>
                                <option value="Excavator">Excavator</option>
                                <option value="Bulldozer">Bulldozer</option>
                                <option value="Loader">Loader</option>
                                <option value="Crane">Crane</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                className="form-input"
                                min="1"
                                max="10"
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
                                Start Date *
                            </label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date *
                            </label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery Location *
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter delivery address"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Notes
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={4}
                            className="form-input"
                            placeholder="Any special requirements or notes..."
                        />
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="submit" className="btn-primary flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Create Order
                        </button>
                        <button type="button" className="btn-secondary">
                            Save as Draft
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Component for Manage Requests page
function ManageRequests() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const mockRequests = [
        {
            id: 'REQ001',
            customerId: 'CUST001',
            machineType: 'Excavator',
            status: 'In-Progress',
            requestDate: '2024-01-15',
            priority: 'high'
        },
        {
            id: 'REQ002',
            customerId: 'CUST002',
            machineType: 'Bulldozer',
            status: 'Approved',
            requestDate: '2024-01-14',
            priority: 'medium'
        }
    ]

    useEffect(() => {
        setTimeout(() => {
            setRequests(mockRequests)
            setLoading(false)
        }, 1000)
    }, [])

    const getStatusBadge = (status) => {
        const statusConfig = {
            'In-Progress': { class: 'bg-yellow-100 text-yellow-800', icon: Clock },
            'Approved': { class: 'bg-green-100 text-green-800', icon: CheckCircle },
            'Denied': { class: 'bg-red-100 text-red-800', icon: AlertTriangle }
        }
        
        const config = statusConfig[status] || { class: 'bg-gray-100 text-gray-800', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {status}
            </span>
        )
    }

    const handleStatusChange = (requestId, newStatus) => {
        setRequests(requests.map(req => 
            req.id === requestId ? { ...req, status: newStatus } : req
        ))
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <MessageSquare className="h-8 w-8 mr-3 text-blue-600" />
                    Manage Requests
                </h1>
                <p className="mt-2 text-gray-600">
                    Review and process customer equipment requests
                </p>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center space-x-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="all">All Requests</option>
                        <option value="In-Progress">In Progress</option>
                        <option value="Approved">Approved</option>
                        <option value="Denied">Denied</option>
                    </select>
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Request ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Machine Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {requests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {request.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {request.customerId}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {request.machineType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(request.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {request.requestDate}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                            {request.status === 'In-Progress' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleStatusChange(request.id, 'Approved')}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStatusChange(request.id, 'Denied')}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Deny
                                                    </button>
                                                </>
                                            )}
                                            <button className="text-blue-600 hover:text-blue-900">
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}