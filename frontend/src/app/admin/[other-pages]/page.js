'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Layout from '@/components/Layout'
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
                                <option value="Caterpillar Excavator">Caterpillar Excavator</option>
                                <option value="Bulldozer">Bulldozer</option>
                                <option value="Wheel Loader">Wheel Loader</option>
                                <option value="Motor Grader">Motor Grader</option>
                                <option value="Backhoe Loader">Backhoe Loader</option>
                                <option value="Skid Steer Loader">Skid Steer Loader</option>
                                <option value="Articulated Truck">Articulated Truck</option>
                                <option value="Compactor">Compactor</option>
                                <option value="Scrapers">Scrapers</option>
                                <option value="Pipelayer">Pipelayer</option>
                                <option value="Telehandler">Telehandler</option>
                                <option value="Mini Excavator">Mini Excavator</option>
                                <option value="Track Loader">Track Loader</option>
                                <option value="Cold Planer">Cold Planer</option>
                                <option value="Paver">Paver</option>
                                <option value="Generator Set">Generator Set</option>
                                <option value="Other">Other</option>
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
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        fetchRequests()
    }, [session])

    const fetchRequests = async () => {
        try {
            setLoading(true)
            setError('')
            
            let url = `${process.env.NEXT_PUBLIC_API_URL}/api/requests`
            if (filter !== 'all') {
                url += `?status=${encodeURIComponent(filter)}`
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
                setRequests(data.data || [])
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

    const updateRequestStatus = async (requestId, newStatus, adminComments = '') => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify({
                    status: newStatus,
                    admin_comments: adminComments
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to update request')
            }

            if (data.success) {
                // Update the request in the local state
                setRequests(requests.map(request => 
                    request.requestID === requestId 
                        ? { ...request, status: newStatus, adminComments: adminComments }
                        : request
                ))
            } else {
                throw new Error(data.message || 'Failed to update request')
            }
        } catch (err) {
            console.error('Error updating request:', err)
            alert('Error updating request: ' + err.message)
        }
    }

    const handleStatusChange = (requestId, currentStatus) => {
        const newStatus = prompt(`Enter new status for request ${requestId}:`, currentStatus)
        if (newStatus && newStatus !== currentStatus) {
            const adminComments = prompt('Add admin comments (optional):') || ''
            updateRequestStatus(requestId, newStatus, adminComments)
        }
    }

    const getRequestStatusBadge = (status) => {
        const statusConfig = {
            'IN_PROGRESS': { class: 'badge-occupied-modern', icon: Clock },
            'COMPLETED': { class: 'badge-ready-modern', icon: CheckCircle },
            'CANCELLED': { class: 'badge-maintenance-modern', icon: X },
            'PENDING': { class: 'badge-pending-modern', icon: Clock }
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

    const filteredRequests = (requests?.requests || []).filter(request => {
        const matchesFilter = filter === 'all' || request.status.toLowerCase() === filter.toLowerCase().replace('_', '_')
        const matchesSearch = request.requestID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             request.machineID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             request.requestType?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesFilter && matchesSearch
    })

    useEffect(() => {
        fetchRequests()
    }, [filter])

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
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
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
                                    <th>Machine ID</th>
                                    <th>Request Type</th>
                                    <th>Status</th>
                                    <th>Request Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((request) => (
                                    <tr key={request.requestID}>
                                        <td>
                                            <strong>{request.requestID}</strong>
                                        </td>
                                        <td>{request.machineID}</td>
                                        <td>{request.requestType}</td>
                                        <td>{getRequestStatusBadge(request.status)}</td>
                                        <td>{new Date(request.requestDate).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    onClick={() => handleStatusChange(request.requestID, request.status)}
                                                    className="action-btn action-btn-edit"
                                                    title="Update Status"
                                                >
                                                    <Edit size={14} />
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