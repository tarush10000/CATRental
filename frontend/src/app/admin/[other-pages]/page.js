'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
import HealthScoreManagement from '@/components/admin/HealthScoreManagement'
import AdminRecommendations from '@/components/admin/AdminRecommendations'

import {
    Truck, Plus, FileText, MessageSquare, Settings,
    TrendingUp, Wrench, Activity, Clock, CheckCircle,
    AlertTriangle, Package, Users, Search, Filter,
    Edit, Trash2, Save, X, ChevronDown, RefreshCw,Upload
} from 'lucide-react'

export default function AdminOtherPages() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()

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
            case 'add-machine':
            case 'add-order':
            case 'requests':
            case 'recommendations':
            case 'health-scores':
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
                <div className="admin-container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
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
                return <AdminMachines session={session} />
            case 'add-machine':
                return <AddMachine session={session} />
            case 'add-order':
                return <AddOrder session={session} />
            case 'requests':
                return <ManageRequests session={session} />
            case 'recommendations':
                return <AdminRecommendations session={session} />
            case 'health-scores':
                return <HealthScoreManagement session={session} />
            default:
                return (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <AlertTriangle />
                        </div>
                        <h3 className="empty-state-title">Page not found</h3>
                        <p className="empty-state-description">
                            <a href="/admin/dashboard" className="btn-secondary-modern">
                                Return to Dashboard
                            </a>
                        </p>
                    </div>
                )
        }
    }

    return (
        <Layout>
            <div className="admin-container">
                <div className="admin-content">
                    {renderPageContent()}
                </div>
            </div>
        </Layout>
    )
}

// Component for Admin Machines Management page
function AdminMachines({ session }) {
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        fetchMachines()
    }, [session])

    const fetchMachines = async () => {
        try {
            setLoading(true)
            setError('')
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/machines`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch machines')
            }

            const data = await response.json()
            if (data.success) {
                setMachines(data.data.machines || [])
            } else {
                throw new Error(data.message || 'Failed to load machines')
            }
        } catch (err) {
            console.error('Error fetching machines:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const deleteMachine = async (machineId) => {
        if (!confirm('Are you sure you want to delete this machine? This action cannot be undone.')) return

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines/${machineId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to delete machine')
            }

            const data = await response.json()
            if (data.success) {
                setMachines(machines.filter(machine => machine.machineID !== machineId))
            } else {
                throw new Error(data.message || 'Failed to delete machine')
            }
        } catch (err) {
            console.error('Error deleting machine:', err)
            alert('Error deleting machine: ' + err.message)
        }
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Ready': { class: 'badge-ready-modern', icon: CheckCircle },
            'Occupied': { class: 'badge-occupied-modern', icon: Activity },
            'Maintenance': { class: 'badge-maintenance-modern', icon: Wrench },
            'In-transit': { class: 'badge-in-transit-modern', icon: Truck }
        }

        const config = statusConfig[status] || { class: 'badge-pending-modern', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`badge-modern ${config.class}`}>
                <IconComponent size={12} />
                {status}
            </span>
        )
    }

    const filteredMachines = machines.filter(machine => {
        const matchesFilter = filter === 'all' || machine.status.toLowerCase() === filter.toLowerCase()
        const matchesSearch = machine.machineID.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             machine.machineType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (machine.location && machine.location.toLowerCase().includes(searchTerm.toLowerCase()))
        return matchesFilter && matchesSearch
    })

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <Truck className="page-title-icon" />
                    Manage Machines
                </h1>
                <p className="page-subtitle">
                    View and manage your fleet of construction equipment
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert-modern alert-error-modern">
                    <AlertTriangle className="alert-icon" />
                    <div className="alert-content">
                        <div className="alert-message">{error}</div>
                        <button onClick={fetchMachines} className="alert-action">
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card-filters">
                <div className="filters-row">
                    <div className="filters-left">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search machines..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filter-select-wrapper">
                            <Filter className="filter-icon" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="ready">Ready</option>
                                <option value="occupied">Occupied</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="in-transit">In-transit</option>
                            </select>
                            <ChevronDown className="select-arrow" />
                        </div>
                    </div>
                    <div className="filters-right">
                        <button
                            onClick={fetchMachines}
                            className="btn-modern btn-secondary-modern"
                            disabled={loading}
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                        <a
                            href="/admin/add-machine"
                            className="btn-modern btn-primary-modern"
                        >
                            <Plus size={16} />
                            Add Machine
                        </a>
                    </div>
                </div>
            </div>

            {/* Machines Table */}
            <div className="modern-card">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                ) : filteredMachines.length === 0 ? (
                    <div className="empty-state">
                        <Truck className="empty-state-icon" />
                        <h3 className="empty-state-title">No machines found</h3>
                        <p className="empty-state-description">
                            {machines.length === 0 
                                ? 'Get started by adding your first machine.' 
                                : 'No machines match your current filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="modern-table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Machine ID</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Location</th>
                                    <th>Last Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMachines.map((machine) => (
                                    <tr key={machine.machineID}>
                                        <td>
                                            <strong>{machine.machineID}</strong>
                                        </td>
                                        <td>{machine.machineType}</td>
                                        <td>{getStatusBadge(machine.status)}</td>
                                        <td>{machine.location || 'Not specified'}</td>
                                        <td>{new Date(machine.updatedAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn action-btn-edit">
                                                    <Edit size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => deleteMachine(machine.machineID)}
                                                    className="action-btn action-btn-delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
function AddMachine({ session }) {
    const [formData, setFormData] = useState({
        machineId: '',
        machineType: '',
        location: '',
        siteId: ''
    })
    const [coordinates, setCoordinates] = useState({ lat: null, lng: null })
    const [isScanning, setIsScanning] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState({})
    const [locationLoading, setLocationLoading] = useState(false)
    const [stream, setStream] = useState(null)
    const [showScanner, setShowScanner] = useState(false)
    const videoRef = useRef(null)
    const router = useRouter()

    // Cleanup camera stream on component unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [stream])

    // Load Quagga library for barcode scanning
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js'
        script.async = true
        document.head.appendChild(script)

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script)
            }
        }
    }, [])

    const fetchLocationCoordinates = async (locationName) => {
        if (!locationName.trim()) {
            setCoordinates({ lat: null, lng: null })
            return
        }

        setLocationLoading(true)
        try {
            // Using OpenStreetMap Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`
            )
            
            if (!response.ok) {
                throw new Error('Failed to fetch location data')
            }

            const data = await response.json()
            
            if (data && data.length > 0) {
                const coords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                }
                setCoordinates(coords)
            } else {
                setCoordinates({ lat: null, lng: null })
            }
        } catch (err) {
            console.error('Location fetch error:', err)
            setCoordinates({ lat: null, lng: null })
        } finally {
            setLocationLoading(false)
        }
    }

    const startCameraScanning = async () => {
        try {
            setIsScanning(true)
            setShowScanner(true)

            // Get camera permission
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            })
            
            setStream(mediaStream)
            
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
                videoRef.current.play()
            }

            // Initialize Quagga after video starts
            setTimeout(() => {
                if (window.Quagga && videoRef.current) {
                    window.Quagga.init({
                        inputStream: {
                            name: "Live",
                            type: "LiveStream",
                            target: videoRef.current,
                            constraints: {
                                width: 640,
                                height: 480,
                                facingMode: "environment"
                            }
                        },
                        decoder: {
                            readers: [
                                "code_128_reader",
                                "ean_reader",
                                "ean_8_reader",
                                "code_39_reader",
                                "code_39_vin_reader",
                                "codabar_reader",
                                "upc_reader",
                                "upc_e_reader",
                                "i2of5_reader"
                            ]
                        }
                    }, (err) => {
                        if (err) {
                            console.error('Quagga initialization failed:', err)
                            stopScanning()
                            return
                        }
                        window.Quagga.start()
                    })

                    window.Quagga.onDetected((data) => {
                        const code = data.codeResult.code
                        setFormData(prev => ({
                            ...prev,
                            machineId: code
                        }))
                        stopScanning()
                    })
                }
            }, 1000)

        } catch (err) {
            console.error('Camera access failed:', err)
            alert('Camera access denied or not available')
            setIsScanning(false)
            setShowScanner(false)
        }
    }

    const stopScanning = () => {
        if (window.Quagga) {
            window.Quagga.stop()
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setIsScanning(false)
        setShowScanner(false)
    }

    const handleBarcodeUpload = async () => {
        // Create a file input for image upload
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = 'image/*'
        fileInput.capture = 'environment'
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0]
            if (file) {
                setIsScanning(true)
                try {
                    // Create image element to load the file
                    const img = new Image()
                    const canvas = document.createElement('canvas')
                    const ctx = canvas.getContext('2d')
                    
                    img.onload = () => {
                        // Set canvas dimensions to match image
                        canvas.width = img.width
                        canvas.height = img.height
                        
                        // Draw image on canvas
                        ctx.drawImage(img, 0, 0)
                        
                        // Use Quagga to decode barcode from canvas
                        if (window.Quagga) {
                            window.Quagga.decodeSingle({
                                src: canvas.toDataURL(),
                                numOfWorkers: 0,
                                inputStream: {
                                    size: 800
                                },
                                decoder: {
                                    readers: [
                                        "code_128_reader",
                                        "ean_reader",
                                        "ean_8_reader",
                                        "code_39_reader",
                                        "code_39_vin_reader",
                                        "codabar_reader",
                                        "upc_reader",
                                        "upc_e_reader",
                                        "i2of5_reader"
                                    ]
                                }
                            }, (result) => {
                                if (result && result.codeResult) {
                                    const code = result.codeResult.code
                                    setFormData(prev => ({
                                        ...prev,
                                        machineId: code
                                    }))
                                    // alert(`Barcode detected: ${code}`)
                                } else {
                                    console.log(result)
                                    alert('No barcode found in the image. Please try a clearer image.')
                                }
                                setIsScanning(false)
                            })
                        } else {
                            alert('Barcode scanner not ready. Please try again.')
                            setIsScanning(false)
                        }
                    }
                    
                    img.onerror = () => {
                        alert('Failed to load image')
                        setIsScanning(false)
                    }
                    
                    // Create object URL and set as image source
                    const imageUrl = URL.createObjectURL(file)
                    img.src = imageUrl
                    
                } catch (error) {
                    console.error('Barcode upload error:', error)
                    alert('Error processing barcode: ' + error.message)
                    setIsScanning(false)
                }
            }
        }
        
        fileInput.click()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // Validate form
        const newErrors = {}
        if (!formData.machineId.trim()) newErrors.machineId = 'Machine ID is required'
        if (!formData.machineType.trim()) newErrors.machineType = 'Machine type is required'
        if (!formData.location.trim()) newErrors.location = 'Location is required'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            const payload = {
                machine_id: formData.machineId.trim(),
                machine_type: formData.machineType.trim(),
                // location: formData.location.trim(),
                site_id: formData.siteId.trim() || null
            }

            // Add coordinates as comma-separated string if available
            if (coordinates.lat && coordinates.lng) {
                payload.location = `${coordinates.lat},${coordinates.lng}`
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to create machine')
            }

            if (data.success) {
                alert('Machine added successfully!')
                router.push('/admin/machines')
            } else {
                throw new Error(data.message || 'Failed to create machine')
            }
        } catch (err) {
            console.error('Error creating machine:', err)
            if (err.message.includes('already exists')) {
                setErrors({ machineId: 'Machine ID already exists' })
            } else {
                alert('Error creating machine: ' + err.message)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value
        })
        
        // Handle location coordinate fetching
        if (name === 'location') {
            // Debounce the API call
            clearTimeout(window.locationTimeout)
            window.locationTimeout = setTimeout(() => {
                fetchLocationCoordinates(value)
            }, 1000)
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            })
        }
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <Plus className="page-title-icon" />
                    Add New Machine
                </h1>
                <p className="page-subtitle">
                    Add new construction equipment to your fleet
                </p>
            </div>

            {/* Barcode Scanner Section */}
            <div className="barcode-scanner">
                <Truck className="barcode-icon" />
                <h3 className="barcode-title">Scan Machine Barcode</h3>
                <p className="barcode-description">
                    Quickly populate machine details by scanning or uploading a barcode image
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={startCameraScanning}
                        disabled={isScanning || showScanner}
                        className="btn-modern btn-secondary-modern"
                    >
                        {showScanner ? (
                            <>
                                <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                                Scanning...
                            </>
                        ) : (
                            <>
                                <Search size={16} />
                                Live Scan
                            </>
                        )}
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleBarcodeUpload}
                        disabled={isScanning}
                        className="btn-modern btn-secondary-modern"
                    >
                        {isScanning && !showScanner ? (
                            <>
                                <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload size={16} />
                                Upload Image
                            </>
                        )}
                    </button>

                    {showScanner && (
                        <button
                            type="button"
                            onClick={stopScanning}
                            className="btn-modern btn-secondary-modern"
                        >
                            <X size={16} />
                            Stop
                        </button>
                    )}
                </div>

                {/* Camera Scanner Display */}
                {showScanner && (
                    <div style={{ 
                        marginTop: '15px', 
                        background: '#000', 
                        borderRadius: '8px', 
                        padding: '10px', 
                        textAlign: 'center' 
                    }}>
                        <video 
                            ref={videoRef} 
                            style={{ 
                                width: '100%', 
                                maxWidth: '300px', 
                                height: 'auto', 
                                borderRadius: '4px' 
                            }}
                            autoPlay 
                            playsInline 
                            muted
                        />
                        <p style={{ color: 'white', margin: '10px 0 0 0', fontSize: '14px' }}>
                            Point camera at barcode
                        </p>
                    </div>
                )}
            </div>

            {/* Manual Entry Form */}
            <div className="modern-form">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Machine ID
                            </label>
                            <input
                                type="text"
                                name="machineId"
                                value={formData.machineId}
                                onChange={handleChange}
                                className={`form-input-modern ${errors.machineId ? 'form-input-error' : ''}`}
                                placeholder="e.g., CAT001"
                            />
                            {errors.machineId && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.machineId}
                                </div>
                            )}
                        </div>

                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Machine Type
                            </label>
                            <select
                                name="machineType"
                                value={formData.machineType}
                                onChange={handleChange}
                                className={`form-input-modern ${errors.machineType ? 'form-input-error' : ''}`}
                                style={{ backgroundColor: 'white', cursor: 'pointer' }}
                            >
                                <option value="">Select Machine Type</option>
                                <option value="Air Compressors">Air Compressors</option>
                                <option value="Attachments">Attachments</option>
                                <option value="Augers">Augers</option>
                                <option value="Backhoes">Backhoes</option>
                                <option value="Boom Lifts">Boom Lifts</option>
                                <option value="Brush Hogs">Brush Hogs</option>
                                <option value="Compact Track Loaders">Compact Track Loaders</option>
                                <option value="Compactors">Compactors</option>
                                <option value="Concrete Buggies">Concrete Buggies</option>
                                <option value="Concrete Equipment">Concrete Equipment</option>
                                <option value="Concrete Mixers">Concrete Mixers</option>
                                <option value="Cranes">Cranes</option>
                                <option value="Dozers">Dozers</option>
                                <option value="Dump Trucks">Dump Trucks</option>
                                <option value="Excavators">Excavators</option>
                                <option value="Forklifts">Forklifts</option>
                                <option value="Generators">Generators</option>
                                <option value="Heaters">Heaters</option>
                                <option value="Jackhammers">Jackhammers</option>
                                <option value="Landscape Rakes">Landscape Rakes</option>
                                <option value="Light Towers">Light Towers</option>
                                <option value="Man Lifts">Man Lifts</option>
                                <option value="Mini Skid Loaders">Mini Skid Loaders</option>
                                <option value="Motor Graders">Motor Graders</option>
                                <option value="Mulchers">Mulchers</option>
                                <option value="Pavers">Pavers</option>
                                <option value="Plate Tampers">Plate Tampers</option>
                                <option value="Pressure Washers">Pressure Washers</option>
                                <option value="Pumps">Pumps</option>
                                <option value="Rammers">Rammers</option>
                                <option value="Rock Trucks">Rock Trucks</option>
                                <option value="Scissor Lifts">Scissor Lifts</option>
                                <option value="Skid Steer Loaders">Skid Steer Loaders</option>
                                <option value="Stump Grinders">Stump Grinders</option>
                                <option value="Telehandlers">Telehandlers</option>
                                <option value="Track Loaders">Track Loaders</option>
                                <option value="Trailers">Trailers</option>
                                <option value="Trench Rollers">Trench Rollers</option>
                                <option value="Trenchers">Trenchers</option>
                                <option value="Shoring Equipment">Shoring Equipment</option>
                                <option value="UTVs">UTVs</option>
                                <option value="Water Trucks">Water Trucks</option>
                                <option value="Welders">Welders</option>
                                <option value="Wheel Loaders">Wheel Loaders</option>
                                <option value="Wood Chippers">Wood Chippers</option>
                                <option value="Articulated Trucks">Articulated Trucks</option>
                                <option value="Asphalt Pavers">Asphalt Pavers</option>
                                <option value="Backhoe Loaders">Backhoe Loaders</option>
                                <option value="Cold Planers">Cold Planers</option>
                                <option value="Draglines">Draglines</option>
                                <option value="Drills">Drills</option>
                                <option value="Electric Rope Shovels">Electric Rope Shovels</option>
                                <option value="Forest Machines">Forest Machines</option>
                                <option value="Hydraulic Mining Shovels">Hydraulic Mining Shovels</option>
                                <option value="Material Handlers">Material Handlers</option>
                                <option value="Off-Highway Trucks">Off-Highway Trucks</option>
                                <option value="Pipelayers">Pipelayers</option>
                                <option value="Road Reclaimers">Road Reclaimers</option>
                                <option value="Underground Hard Rock Equipment">Underground Hard Rock Equipment</option>
                                <option value="Wheel Tractor-Scrapers">Wheel Tractor-Scrapers</option>

                            </select>
                            {errors.machineType && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.machineType}
                                </div>
                            )}
                        </div>

                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Location
                                {locationLoading && (
                                    <span style={{ marginLeft: '8px', fontSize: '16px', animation: 'spin 1s linear infinite' }}>
                                        🌍
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className={`form-input-modern ${errors.location ? 'form-input-error' : ''}`}
                                placeholder="e.g., New York, USA"
                            />
                            {coordinates.lat && coordinates.lng && (
                                <div style={{ 
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    background: '#e8f5e8',
                                    borderRadius: '4px',
                                    borderLeft: '4px solid #28a745',
                                    fontSize: '14px',
                                    color: '#155724'
                                }}>
                                    📍 Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                                </div>
                            )}
                            {errors.location && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.location}
                                </div>
                            )}
                        </div>

                        <div className="form-group-modern">
                            <label className="form-label-modern">
                                Site ID
                            </label>
                            <input
                                type="text"
                                name="siteId"
                                value={formData.siteId}
                                onChange={handleChange}
                                className="form-input-modern"
                                placeholder="e.g., SITE001 (optional)"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn-modern btn-secondary-modern"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || showScanner}
                            className="btn-modern btn-primary-modern"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Add Machine
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// Component for Add Order page (Machine Assignment)
function AddOrder({ session }) {
    const [formData, setFormData] = useState({
        machineId: '',
        customerId: '',
        checkOutDate: '',
        checkInDate: '',
        siteId: ''
    })
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState({})

    useEffect(() => {
        fetchAvailableMachines()
    }, [session])

    const fetchAvailableMachines = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/machines?status=Ready`, {
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
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // Validate form
        const newErrors = {}
        if (!formData.machineId) newErrors.machineId = 'Machine is required'
        if (!formData.customerId.trim()) newErrors.customerId = 'Customer ID is required'
        if (!formData.checkOutDate) newErrors.checkOutDate = 'Check-out date is required'
        if (!formData.checkInDate) newErrors.checkInDate = 'Check-in date is required'
        if (!formData.siteId.trim()) newErrors.siteId = 'Site ID is required'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/machines/${formData.machineId}/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({
                    user_id: formData.customerId.trim(),
                    site_id: formData.siteId.trim(),
                    check_out_date: new Date(formData.checkOutDate).toISOString(),
                    check_in_date: new Date(formData.checkInDate).toISOString()
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to assign machine')
            }

            if (data.success) {
                alert('Machine assigned successfully!')
                // Reset form
                setFormData({
                    machineId: '',
                    customerId: '',
                    checkOutDate: '',
                    checkInDate: '',
                    siteId: ''
                })
                fetchAvailableMachines()
            } else {
                throw new Error(data.message || 'Failed to assign machine')
            }
        } catch (err) {
            console.error('Error assigning machine:', err)
            alert('Error assigning machine: ' + err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value
        })
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            })
        }
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <Plus className="page-title-icon" />
                    Assign Machine
                </h1>
                <p className="page-subtitle">
                    Assign available equipment to customers
                </p>
            </div>

            {/* Assignment Form */}
            <div className="modern-form">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Available Machine
                            </label>
                            <select
                                name="machineId"
                                value={formData.machineId}
                                onChange={handleChange}
                                className={`form-input-modern ${errors.machineId ? 'form-input-error' : ''}`}
                            >
                                <option value="">Select a machine</option>
                                {machines.map((machine) => (
                                    <option key={machine.machineID} value={machine.machineID}>
                                        {machine.machineID} - {machine.machineType} ({machine.location})
                                    </option>
                                ))}
                            </select>
                            {errors.machineId && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.machineId}
                                </div>
                            )}
                            {loading && <p style={{ fontSize: '0.9rem', color: 'var(--cat-medium-gray)', marginTop: '0.5rem' }}>Loading machines...</p>}
                        </div>

                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Customer ID
                            </label>
                            <input
                                type="text"
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleChange}
                                className={`form-input-modern ${errors.customerId ? 'form-input-error' : ''}`}
                                placeholder="e.g., CUST001"
                            />
                            {errors.customerId && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.customerId}
                                </div>
                            )}
                        </div>

                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Check-out Date
                            </label>
                            <input
                                type="date"
                                name="checkOutDate"
                                value={formData.checkOutDate}
                                onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]}
                                className={`form-input-modern ${errors.checkOutDate ? 'form-input-error' : ''}`}
                            />
                            {errors.checkOutDate && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.checkOutDate}
                                </div>
                            )}
                        </div>

                        <div className="form-group-modern">
                            <label className="form-label-modern form-label-required">
                                Expected Check-in Date
                            </label>
                            <input
                                type="date"
                                name="checkInDate"
                                value={formData.checkInDate}
                                onChange={handleChange}
                                min={formData.checkOutDate || new Date().toISOString().split('T')[0]}
                                className={`form-input-modern ${errors.checkInDate ? 'form-input-error' : ''}`}
                            />
                            {errors.checkInDate && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.checkInDate}
                                </div>
                            )}
                        </div>

                        <div className="form-group-modern" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label-modern form-label-required">
                                Site ID
                            </label>
                            <input
                                type="text"
                                name="siteId"
                                value={formData.siteId}
                                onChange={handleChange}
                                className={`form-input-modern ${errors.siteId ? 'form-input-error' : ''}`}
                                placeholder="e.g., SITE001"
                            />
                            {errors.siteId && (
                                <div className="form-error-message">
                                    <AlertTriangle size={12} />
                                    {errors.siteId}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-modern btn-secondary-modern"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-modern btn-primary-modern"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="loading-spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Assign Machine
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Component for Manage Requests page
function ManageRequests({ session }) {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState('')
    const [updatingRequests, setUpdatingRequests] = useState(new Set())
    const [availableTypes, setAvailableTypes] = useState([])
    const [summary, setSummary] = useState(null)

    useEffect(() => {
        fetchRequests()
    }, [session])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            setError('')
            
            let url = `${process.env.NEXT_PUBLIC_API_URL}/api/requests`
            const params = new URLSearchParams()
            
            if (statusFilter !== 'all') {
                params.append('status', statusFilter)
            }
            if (typeFilter !== 'all') {
                params.append('request_type', typeFilter)
            }
            
            if (params.toString()) {
                url += `?${params.toString()}`
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch requests')
            }

            const data = await response.json()
            if (data.success) {
                setRequests(data.data?.requests || [])
                setSummary(data.data?.summary || null)
                setAvailableTypes(data.data?.available_types || [])
            } else {
                throw new Error(data.message || 'Failed to load requests')
            }
        } catch (err) {
            console.error('Error fetching requests:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const [availableMachines, setAvailableMachines] = useState([])
    const [showAssignmentModal, setShowAssignmentModal] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState(null)

    const handleAcceptRequest = async (requestId) => {
        if (updatingRequests.has(requestId)) return

        const request = filteredRequests.find(r => r.requestID === requestId)
        
        // For new orders, show machine assignment modal
        if (request.source === 'newOrders') {
            setSelectedRequest(request)
            await fetchAvailableMachines(request.machineType, request.checkOutDate, request.checkInDate)
            setShowAssignmentModal(true)
            return
        }

        // For regular requests, handle based on type
        if (request.requestType === 'EXTENSION') {
            const extensionDate = prompt('Enter new check-in date (YYYY-MM-DD):')
            if (!extensionDate) return
            
            await approveRequest(requestId, { extension_date: extensionDate })
        } else {
            await approveRequest(requestId, { notes: 'Request approved by admin' })
        }
    }

    const approveRequest = async (requestId, approvalData = {}) => {
        setUpdatingRequests(prev => new Set([...prev, requestId]))
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/requests/requests/${requestId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify(approvalData),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to approve request')
            }

            if (data.success) {
                // Update the request in the local state
                setRequests(requests => 
                    (requests || []).map(request => 
                        request.requestID === requestId 
                            ? { ...request, status: 'COMPLETED', adminComments: approvalData.notes || 'Request approved' }
                            : request
                    )
                )
                alert(`Request approved successfully! ${data.data.type ? `(${data.data.type})` : ''}`)
            } else {
                throw new Error(data.message || 'Failed to approve request')
            }
        } catch (err) {
            console.error('Error approving request:', err)
            alert('Error approving request: ' + err.message)
        } finally {
            setUpdatingRequests(prev => {
                const newSet = new Set(prev)
                newSet.delete(requestId)
                return newSet
            })
        }
    }

    const handleRejectRequest = async (requestId) => {
        if (updatingRequests.has(requestId)) return

        const rejectionReason = prompt('Please provide a reason for rejection:') 
        if (!rejectionReason) return
        
        setUpdatingRequests(prev => new Set([...prev, requestId]))
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/requests/${requestId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({
                    reason: rejectionReason
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to reject request')
            }

            if (data.success) {
                // Update the request in the local state
                setRequests(requests => 
                    (requests || []).map(request => 
                        request.requestID === requestId 
                            ? { 
                                ...request, 
                                status: 'CANCELLED', 
                                adminComments: rejectionReason 
                            }
                            : request
                    )
                )
                alert('Request rejected successfully!')
            } else {
                throw new Error(data.message || 'Failed to reject request')
            }
        } catch (err) {
            console.error('Error rejecting request:', err)
            alert('Error rejecting request: ' + err.message)
        } finally {
            setUpdatingRequests(prev => {
                const newSet = new Set(prev)
                newSet.delete(requestId)
                return newSet
            })
        }
    }

    const fetchAvailableMachines = async (machineType, checkOutDate, checkInDate) => {
        try {
            const params = new URLSearchParams()
            if (machineType) params.append('machine_type', machineType)
            if (checkOutDate) params.append('check_out_date', checkOutDate)
            if (checkInDate) params.append('check_in_date', checkInDate)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/requests/available-machines?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setAvailableMachines(data.data?.machines || [])
            }
        } catch (error) {
            console.error('Error fetching available machines:', error)
            setAvailableMachines([])
        }
    }

    const handleMachineAssignment = async (machineId) => {
        if (!selectedRequest) return

        const approvalData = {
            assigned_machine_id: machineId,
            notes: `Order approved, machine ${machineId} assigned`
        }

        await approveRequest(selectedRequest.requestID, approvalData)
        setShowAssignmentModal(false)
        setSelectedRequest(null)
        setAvailableMachines([])
    }

    const getRequestStatusBadge = (status) => {
        const statusConfig = {
            'IN_PROGRESS': { class: 'badge-occupied-modern', icon: Clock },
            'COMPLETED': { class: 'badge-ready-modern', icon: CheckCircle },
            'CANCELLED': { class: 'badge-maintenance-modern', icon: X },
            'PENDING': { class: 'badge-pending-modern', icon: Clock },
            'Approved': { class: 'badge-ready-modern', icon: CheckCircle },
            'Denied': { class: 'badge-maintenance-modern', icon: X }
        }

        const config = statusConfig[status] || { class: 'badge-pending-modern', icon: Clock }
        const IconComponent = config.icon

        return (
            <span className={`badge-modern ${config.class}`}>
                <IconComponent size={12} />
                {status.replace('_', ' ')}
            </span>
        )
    }

    const filteredRequests = (requests || []).filter(request => {
        const matchesSearch = request.requestID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             request.machineID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             request.requestType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             request.machineType?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    })

    useEffect(() => {
        fetchRequests()
    }, [statusFilter, typeFilter])

    const canManageRequest = (status) => {
        return ['IN_PROGRESS', 'PENDING', 'Pending'].includes(status)
    }

    const getRequestTypeDisplay = (request) => {
        if (request.source === 'newOrders') {
            return (
                <div>
                    <span className="request-type-badge new-order-badge">NEW ORDER</span>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                        {request.machineType}
                    </div>
                </div>
            )
        }
        return request.requestType || 'N/A'
    }

    const getMachineDisplay = (request) => {
        if (request.source === 'newOrders') {
            return (
                <div>
                    <span style={{ color: '#6c757d', fontStyle: 'italic' }}>To be assigned</span>
                    {request.isAvailable && request.availableMachines && (
                        <div style={{ fontSize: '11px', color: '#28a745', marginTop: '2px' }}>
                            {request.availableCount} available
                        </div>
                    )}
                </div>
            )
        }
        return request.machineID || 'N/A'
    }

    const getAvailabilityIndicator = (request) => {
        if (request.source !== 'newOrders') {
            return null
        }

        return (
            <div className={`availability-indicator ${request.isAvailable ? 'available' : 'unavailable'}`}>
                {request.isAvailable ? (
                    <>
                        <CheckCircle size={12} />
                        <span>Available</span>
                    </>
                ) : (
                    <>
                        <AlertTriangle size={12} />
                        <span>Unavailable</span>
                    </>
                )}
            </div>
        )
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <MessageSquare className="page-title-icon" />
                    Manage Requests
                </h1>
                <p className="page-subtitle">
                    Review and manage customer service requests
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert-modern alert-error-modern">
                    <AlertTriangle className="alert-icon" />
                    <div className="alert-content">
                        <div className="alert-message">{error}</div>
                        <button onClick={fetchRequests} className="alert-action">
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0070f3' }}>
                            {summary.total_items}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>Total Items</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                            {summary.requests_count}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>Service Requests</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                            {summary.orders_count}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>New Orders</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
                            {summary.available_orders || 0}
                        </div>
                        <div className="summary-label" style={{ fontSize: '14px', color: '#6c757d' }}>Available Orders</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card-filters">
                <div className="filters-row">
                    <div className="filters-left">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filter-select-wrapper">
                            <Filter className="filter-icon" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="PENDING">Pending</option>
                            </select>
                            <ChevronDown className="select-arrow" />
                        </div>
                        <div className="filter-select-wrapper">
                            <MessageSquare className="filter-icon" />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Types</option>
                                {availableTypes.map(type => (
                                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                ))}
                            </select>
                            <ChevronDown className="select-arrow" />
                        </div>
                    </div>
                    <div className="filters-right">
                        <button
                            onClick={fetchRequests}
                            className="btn-modern btn-secondary-modern"
                            disabled={loading}
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Requests Table */}
            <div className="modern-card">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="empty-state">
                        <MessageSquare className="empty-state-icon" />
                        <h3 className="empty-state-title">No requests found</h3>
                        <p className="empty-state-description">
                            {requests.length === 0 
                                ? 'No service requests have been submitted yet.' 
                                : 'No requests match your current filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="modern-table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Request ID</th>
                                    <th>Machine/Type</th>
                                    <th>Request Type</th>
                                    <th>Status</th>
                                    <th>Availability</th>
                                    <th>Request Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((request) => (
                                    <tr key={request.requestID || request._id} className={!request.isAvailable && request.source === 'newOrders' ? 'unavailable-row' : ''}>
                                        <td>
                                            <strong>{request.requestID}</strong>
                                            {request.source === 'newOrders' && (
                                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                                                    Order
                                                </div>
                                            )}
                                        </td>
                                        <td>{getMachineDisplay(request)}</td>
                                        <td>{getRequestTypeDisplay(request)}</td>
                                        <td>{getRequestStatusBadge(request.status)}</td>
                                        <td>{getAvailabilityIndicator(request)}</td>
                                        <td>{new Date(request.requestDate || request.orderDate).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                {canManageRequest(request.status) ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleAcceptRequest(request.requestID)}
                                                            className={`action-btn ${request.source === 'newOrders' && !request.isAvailable ? 'action-btn-accept-disabled' : 'action-btn-accept'}`}
                                                            title={request.source === 'newOrders' && !request.isAvailable ? 'No machines available for this order' : 'Accept Request'}
                                                            disabled={updatingRequests.has(request.requestID) || (request.source === 'newOrders' && !request.isAvailable)}
                                                        >
                                                            {updatingRequests.has(request.requestID) ? (
                                                                <div 
                                                                    className="loading-spinner" 
                                                                    style={{ 
                                                                        width: '14px', 
                                                                        height: '14px', 
                                                                        borderWidth: '2px',
                                                                        borderColor: '#28a745 transparent #28a745 transparent'
                                                                    }}
                                                                ></div>
                                                            ) : (
                                                                <CheckCircle size={14} />
                                                            )}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRejectRequest(request.requestID)}
                                                            className="action-btn action-btn-reject"
                                                            title="Reject Request"
                                                            disabled={updatingRequests.has(request.requestID)}
                                                        >
                                                            {updatingRequests.has(request.requestID) ? (
                                                                <div 
                                                                    className="loading-spinner" 
                                                                    style={{ 
                                                                        width: '14px', 
                                                                        height: '14px', 
                                                                        borderWidth: '2px',
                                                                        borderColor: '#dc3545 transparent #dc3545 transparent'
                                                                    }}
                                                                ></div>
                                                            ) : (
                                                                <X size={14} />
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                                                        {request.status === 'COMPLETED' ? 'Approved' : 
                                                         request.status === 'CANCELLED' ? 'Rejected' : 
                                                         'No actions available'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Machine Assignment Modal */}
            {showAssignmentModal && selectedRequest && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '24px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                                Assign Machine to Order
                            </h3>
                            <button
                                onClick={() => setShowAssignmentModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                            <strong>Order Details:</strong><br />
                            Order ID: {selectedRequest.requestID}<br />
                            Machine Type: {selectedRequest.machineType}<br />
                            Check-out: {new Date(selectedRequest.checkOutDate).toLocaleDateString()}<br />
                            Check-in: {new Date(selectedRequest.checkInDate).toLocaleDateString()}
                        </div>

                        <h4 style={{ marginBottom: '12px' }}>Available Machines:</h4>

                        {availableMachines.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                No available machines found for this order.
                            </div>
                        ) : (
                            <div className="machines-grid" style={{
                                display: 'grid',
                                gap: '12px',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {availableMachines.map((machine) => (
                                    <div
                                        key={machine.machineID}
                                        style={{
                                            border: '1px solid #dee2e6',
                                            borderRadius: '4px',
                                            padding: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <strong>{machine.machineID}</strong><br />
                                            <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                                {machine.machineType} - {machine.location}
                                            </span><br />
                                            <span style={{ fontSize: '12px', color: machine.status === 'READY' ? '#28a745' : '#ffc107' }}>
                                                Status: {machine.status}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleMachineAssignment(machine.machineID)}
                                            className="btn-modern btn-primary-modern"
                                            style={{ padding: '8px 16px', fontSize: '14px' }}
                                        >
                                            Assign
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button
                                onClick={() => setShowAssignmentModal(false)}
                                className="btn-modern btn-secondary-modern"
                                style={{ marginRight: '8px' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .action-btn-accept {
                    background-color: #28a745;
                    border-color: #28a745;
                    color: white;
                }
                .action-btn-accept:hover {
                    background-color: #218838;
                    border-color: #1e7e34;
                }
                .action-btn-accept:disabled {
                    background-color: #6c757d;
                    border-color: #6c757d;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .action-btn-accept-disabled {
                    background-color: #dc3545;
                    border-color: #dc3545;
                    color: white;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .action-btn-reject {
                    background-color: #dc3545;
                    border-color: #dc3545;
                    color: white;
                }
                .action-btn-reject:hover {
                    background-color: #c82333;
                    border-color: #bd2130;
                }
                .action-btn-reject:disabled {
                    background-color: #6c757d;
                    border-color: #6c757d;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .action-buttons {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }
                .text-muted {
                    color: #6c757d;
                }
                .summary-card {
                    background: white;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                }
                .request-type-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .new-order-badge {
                    background-color: #ffc107;
                    color: #212529;
                }
                .availability-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .availability-indicator.available {
                    color: #28a745;
                }
                .availability-indicator.unavailable {
                    color: #dc3545;
                }
                .unavailable-row {
                    background-color: #fff5f5;
                }
                .unavailable-row:hover {
                    background-color: #fed7d7;
                }
                    border-color: #6c757d;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .action-btn-accept-disabled {
                    background-color: #dc3545;
                    border-color: #dc3545;
                    color: white;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .action-btn-reject {
                    background-color: #dc3545;
                    border-color: #dc3545;
                    color: white;
                }
                .action-btn-reject:hover {
                    background-color: #c82333;
                    border-color: #bd2130;
                }
                .action-btn-reject:disabled {
                    background-color: #6c757d;
                    border-color: #6c757d;
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .action-buttons {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                }
                .text-muted {
                    color: #6c757d;
                }
                .summary-card {
                    background: white;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    text-align: center;
                }
                .request-type-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .new-order-badge {
                    background-color: #ffc107;
                    color: #212529;
                }
                .availability-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }
                .availability-indicator.available {
                    color: #28a745;
                }
                .availability-indicator.unavailable {
                    color: #dc3545;
                }
                .unavailable-row {
                    background-color: #fff5f5;
                }
                .unavailable-row:hover {
                    background-color: #fed7d7;
                }
            `}</style>
        </div>
    )
}