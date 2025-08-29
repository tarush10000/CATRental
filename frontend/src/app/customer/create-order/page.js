'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Layout from '@/components/Layout'
import {
    Package, Truck, MapPin, Calendar, MessageSquare, Send,
    RefreshCw, AlertTriangle, CheckCircle, Info,
    ArrowLeft, Clock, Building2, Target
} from 'lucide-react'
import { get } from 'http'
import VoiceInputAdvanced from '@/components/VoiceInputAdvanced'

const processVoiceInput = async (transcript) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript,
                formFields: ['machineType', 'description', 'priority', 'location']
            })
        })

        const result = await response.json()
        if (result.success) {
            setFormData(prev => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(result.data).filter(([key, value]) => value !== '')
                )
            }))
        }
    } catch (error) {
        console.error('Error processing voice input:', error)
    }
}

const handleVoiceFormUpdate = (voiceData) => {
    console.log('🎤 handleVoiceFormUpdate called with:', voiceData)
    console.log('📝 Current form data before update:', formData)

    const updatedData = { ...formData }

    // Update each field if it exists in voiceData
    Object.keys(voiceData).forEach(key => {
        if (voiceData[key] && voiceData[key] !== '') {
            updatedData[key] = voiceData[key]
            console.log(`✅ Updated ${key}:`, voiceData[key])
        }
    })

    console.log('📝 Final form data after update:', updatedData)

    // Update the form
    setFormData(updatedData)

    // Clear related errors
    setErrors({})

    console.log('✅ Form state updated successfully!')
}

async function getCoordinates(cityName) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`;

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "my_app/1.0 (your_email@example.com)", // required by Nominatim
                "Accept-Language": "en"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || data.length === 0) {
            throw new Error(`No coordinates found for "${cityName}"`);
        }

        // ✅ Always pick the first result
        const firstResult = data[0];
        const { lat, lon } = firstResult;

        return `${lat},${lon}`;
    } catch (error) {
        console.error("Error fetching coordinates:", error.message);
        throw error;
    }
}

export default function CreateOrderPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [machineTypes, setMachineTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        machineType: '',
        location: '',
        siteID: '',
        checkInDate: '',
        checkOutDate: '',
        comments: '',
        duration: 'custom'
    })
    const [errors, setErrors] = useState({})
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [orderDetails, setOrderDetails] = useState(null)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }

        fetchMachineTypes()
    }, [session, status, router])

    const fetchMachineTypes = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machine-types`, {
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setMachineTypes(data.data.machine_types || [])
                }
            }
        } catch (error) {
            console.error('Error fetching machine types:', error)
        } finally {
            setLoading(false)
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.machineType) {
            newErrors.machineType = 'Please select a machine type'
        }

        if (!formData.location.trim()) {
            newErrors.location = 'Please provide a location'
        }

        if (!formData.siteID.trim()) {
            newErrors.siteID = 'Please provide a site ID'
        } else if (!/^[A-Za-z0-9-]+$/.test(formData.siteID)) {
            newErrors.siteID = 'Site ID can only contain letters, numbers, and hyphens'
        }

        if (!formData.checkInDate) {
            newErrors.checkInDate = 'Please select a check-in date'
        } else {
            const checkInDate = new Date(formData.checkInDate)
            const now = new Date()
            if (checkInDate <= now) {
                newErrors.checkInDate = 'Check-in date must be in the future'
            }
        }

        if (!formData.checkOutDate) {
            newErrors.checkOutDate = 'Please select a check-out date'
        } else if (formData.checkInDate && formData.checkOutDate) {
            const checkInDate = new Date(formData.checkInDate)
            const checkOutDate = new Date(formData.checkOutDate)
            if (checkOutDate <= checkInDate) {
                newErrors.checkOutDate = 'Check-out date must be after check-in date'
            }

            // Minimum rental period check (1 day)
            const diffTime = checkOutDate - checkInDate
            const diffDays = diffTime / (1000 * 60 * 60 * 24)
            if (diffDays < 1) {
                newErrors.checkOutDate = 'Minimum rental period is 1 day'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) return

        setSubmitting(true)
        setErrors({})

        const loc = await getCoordinates(formData.location.trim())

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({
                    machineType: formData.machineType,
                    location: loc,
                    siteID: formData.siteID,
                    checkInDate: new Date(formData.checkInDate).toISOString(),
                    checkOutDate: new Date(formData.checkOutDate).toISOString(),
                    comments: formData.comments
                })
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setOrderDetails(result.data)
                    setSubmitSuccess(true)
                    setTimeout(() => {
                        router.push('/customer/dashboard')
                    }, 3000)
                }
            } else {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to create order')
            }
        } catch (error) {
            console.error('Error creating order:', error)
            setErrors({ submit: error.message || 'Failed to create order. Please try again.' })
        } finally {
            setSubmitting(false)
        }
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }

        // Auto-calculate check-out date based on duration
        if (field === 'checkInDate' || (field === 'duration' && formData.checkInDate)) {
            if (value !== 'custom' && field === 'duration') {
                const checkInDate = new Date(formData.checkInDate)
                if (checkInDate && !isNaN(checkInDate.getTime())) {
                    const daysToAdd = parseInt(value)
                    const checkOutDate = new Date(checkInDate)
                    checkOutDate.setDate(checkInDate.getDate() + daysToAdd)
                    setFormData(prev => ({
                        ...prev,
                        duration: value,
                        checkOutDate: checkOutDate.toISOString().split('T')[0]
                    }))
                } else {
                    setFormData(prev => ({ ...prev, duration: value }))
                }
            } else if (field === 'checkInDate') {
                const checkInDate = new Date(value)
                if (checkInDate && !isNaN(checkInDate.getTime()) && formData.duration !== 'custom') {
                    const daysToAdd = parseInt(formData.duration)
                    const checkOutDate = new Date(checkInDate)
                    checkOutDate.setDate(checkInDate.getDate() + daysToAdd)
                    setFormData(prev => ({
                        ...prev,
                        checkInDate: value,
                        checkOutDate: checkOutDate.toISOString().split('T')[0]
                    }))
                }
            }
        }
    }

    const calculateDuration = () => {
        if (!formData.checkInDate || !formData.checkOutDate) return 0
        const checkIn = new Date(formData.checkInDate)
        const checkOut = new Date(formData.checkOutDate)
        const diffTime = checkOut - checkIn
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 0 ? diffDays : 0
    }

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading order form...</p>
                </div>
            </Layout>
        )
    }

    if (submitSuccess) {
        return (
            <Layout>
                <div className="dashboard-container">
                    <div className="success-container">
                        <div className="success-card">
                            <div className="success-icon">
                                <CheckCircle size={64} />
                            </div>
                            <h1 className="success-title">Order Created Successfully!</h1>
                            <div className="order-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Order ID:</span>
                                    <span className="summary-value">{orderDetails?.order_id}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Status:</span>
                                    <span className="summary-value pending">{orderDetails?.status}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Machine Type:</span>
                                    <span className="summary-value">{formData.machineType}</span>
                                </div>
                            </div>
                            <p className="success-message">
                                {orderDetails?.message || 'Your equipment order has been submitted and is pending approval from our team.'}
                            </p>
                            <div className="success-actions">
                                <button
                                    onClick={() => router.push('/customer/dashboard')}
                                    className="btn-modern btn-primary-modern"
                                >
                                    Back to Dashboard
                                </button>
                                <button
                                    onClick={() => router.push('/customer/orders')}
                                    className="btn-modern btn-secondary-modern"
                                >
                                    View My Orders
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <>
            <Head>
                <title>Create Order - Caterpillar Machine Tracker</title>
                <meta name="description" content="Order new construction equipment for your project" />
            </Head>

            <Layout>
                <div className="admin-container">
                    <div className="admin-content">
                        {/* Page Header */}
                        <div className="page-header">
                            <div className="header-content">
                                <div className="header-left">
                                    <button
                                        onClick={() => router.back()}
                                        className="back-btn"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div>
                                        <h1 className="page-title">
                                            <Package className="page-title-icon" />
                                            Create Equipment Order
                                        </h1>
                                        <p className="page-subtitle">
                                            Request new construction equipment for your project site
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Card */}
                        <div className="form-container">
                            <div className="modern-card">
                                <div className="card-header-modern">
                                    <h3 className="card-title-modern">Order Details</h3>
                                    <p className="card-subtitle">Please provide complete information for your equipment order</p>
                                </div>

                                <div className="card-content">                                    {/* Error Alert */}
                                    {errors.submit && (
                                        <div className="alert alert-error">
                                            <AlertTriangle size={16} />
                                            <span>{errors.submit}</span>
                                        </div>
                                    )}

                                    {/* <VoiceInputAdvanced
                                        formFields={['machineType', 'siteID', 'location', 'checkInDate', 'checkOutDate', 'quantity', 'comments']}
                                        currentFormData={formData}
                                        onFormUpdate={handleVoiceFormUpdate}
                                        placeholder="Describe your equipment order requirements..."
                                        className="mb-6"
                                    /> */}

                                    <div className="form-grid">
                                        {/* Machine Type */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Truck size={16} />
                                                Equipment Type <span className="required">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${errors.machineType ? 'form-input-error' : ''}`}
                                                value={formData.machineType}
                                                onChange={(e) => handleInputChange('machineType', e.target.value)}
                                                disabled={submitting}
                                            >
                                                <option value="">Select equipment type...</option>
                                                {machineTypes.map(type => (
                                                    <option key={type} value={type}>
                                                        {type}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.machineType && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.machineType}
                                                </div>
                                            )}
                                        </div>

                                        {/* Site ID */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Building2 size={16} />
                                                Site ID <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-input ${errors.siteID ? 'form-input-error' : ''}`}
                                                placeholder="e.g., CAT-1028"
                                                value={formData.siteID}
                                                onChange={(e) => handleInputChange('siteID', e.target.value.toUpperCase())}
                                                disabled={submitting}
                                            />
                                            {errors.siteID && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.siteID}
                                                </div>
                                            )}
                                            <div className="form-help-text">
                                                <Info size={12} />
                                                Use format: CAT-XXXX (letters, numbers, and hyphens only)
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div className="form-group form-group-full">
                                            <label className="form-label">
                                                <MapPin size={16} />
                                                Project Location <span className="required">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className={`form-input ${errors.location ? 'form-input-error' : ''}`}
                                                placeholder="e.g., 19.736621, 73.806407 or City, State"
                                                value={formData.location}
                                                onChange={(e) => handleInputChange('location', e.target.value)}
                                                disabled={submitting}
                                            />
                                            {errors.location && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.location}
                                                </div>
                                            )}
                                            <div className="form-help-text">
                                                <Info size={12} />
                                                Provide coordinates (lat, lng) or detailed address
                                            </div>
                                        </div>

                                        {/* Duration Preset */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Clock size={16} />
                                                Rental Duration
                                            </label>
                                            <select
                                                className="form-select"
                                                value={formData.duration}
                                                onChange={(e) => handleInputChange('duration', e.target.value)}
                                                disabled={submitting}
                                            >
                                                <option value="7">1 Week (7 days)</option>
                                                <option value="14">2 Weeks (14 days)</option>
                                                <option value="30">1 Month (30 days)</option>
                                                <option value="60">2 Months (60 days)</option>
                                                <option value="90">3 Months (90 days)</option>
                                                <option value="custom">Custom Duration</option>
                                            </select>
                                        </div>

                                        {/* Check-in Date */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Calendar size={16} />
                                                Start Date <span className="required">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                className={`form-input ${errors.checkInDate ? 'form-input-error' : ''}`}
                                                value={formData.checkInDate}
                                                onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                                                disabled={submitting}
                                            />
                                            {errors.checkInDate && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.checkInDate}
                                                </div>
                                            )}
                                        </div>

                                        {/* Check-out Date */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                <Calendar size={16} />
                                                End Date <span className="required">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                className={`form-input ${errors.checkOutDate ? 'form-input-error' : ''}`}
                                                value={formData.checkOutDate}
                                                onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                                                min={formData.checkInDate ?
                                                    new Date(new Date(formData.checkInDate).getTime() + 86400000).toISOString().split('T')[0] :
                                                    new Date(Date.now() + 172800000).toISOString().split('T')[0] // Day after tomorrow
                                                }
                                                disabled={submitting || formData.duration !== 'custom'}
                                            />
                                            {errors.checkOutDate && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.checkOutDate}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Duration Summary */}
                                    {formData.checkInDate && formData.checkOutDate && (
                                        <div className="duration-summary">
                                            <div className="duration-card">
                                                <div className="duration-icon">
                                                    <Target size={20} />
                                                </div>
                                                <div className="duration-details">
                                                    <h4>Rental Duration</h4>
                                                    <p>{calculateDuration()} days</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Comments */}
                                    <div className="form-group form-group-full">
                                        <label className="form-label">
                                            <MessageSquare size={16} />
                                            Additional Requirements
                                        </label>
                                        <textarea
                                            className="form-textarea"
                                            rows="4"
                                            placeholder="Describe any specific requirements, site conditions, operator needs, or special instructions..."
                                            value={formData.comments}
                                            onChange={(e) => handleInputChange('comments', e.target.value)}
                                            disabled={submitting}
                                        />
                                        <div className="form-help-text">
                                            <Info size={12} />
                                            Optional: Include any special requirements or site-specific information
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div className="form-actions">
                                        <button
                                            type="button"
                                            onClick={() => router.back()}
                                            className="btn-modern btn-secondary-modern"
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={submitting || machineTypes.length === 0}
                                            className="btn-modern btn-primary-modern"
                                        >
                                            {submitting ? (
                                                <>
                                                    <RefreshCw className="animate-spin" size={16} />
                                                    Creating Order...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={16} />
                                                    Submit Order
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style jsx>{`
                    .back-btn {
                        background: none;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 0.75rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        margin-right: 1rem;
                        color: var(--cat-medium-gray);
                    }

                    .back-btn:hover {
                        border-color: var(--cat-yellow);
                        color: var(--cat-dark-gray);
                        background: rgba(255, 205, 17, 0.05);
                    }

                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                    }

                    .form-label {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                    }

                    .duration-summary {
                        margin: 2rem 0;
                        display: flex;
                        justify-content: center;
                    }

                    .duration-card {
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        border: 2px solid var(--cat-yellow);
                        border-radius: 16px;
                        padding: 1.5rem;
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        min-width: 200px;
                    }

                    .duration-icon {
                        background: var(--cat-yellow);
                        color: var(--cat-black);
                        width: 3rem;
                        height: 3rem;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }

                    .duration-details h4 {
                        margin: 0 0 0.25rem 0;
                        font-size: 1rem;
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                    }

                    .duration-details p {
                        margin: 0;
                        font-size: 1.25rem;
                        font-weight: 700;
                        color: var(--cat-yellow);
                    }

                    .required {
                        color: #ef4444;
                    }

                    .form-help-text {
                        margin-top: 0.5rem;
                        font-size: 0.75rem;
                        color: var(--cat-medium-gray);
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }

                    .form-group-full .form-help-text {
                        justify-content: flex-start;
                    }

                    .alert {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 1rem;
                        border-radius: 8px;
                        margin-bottom: 1.5rem;
                    }

                    .alert-error {
                        background: #fee2e2;
                        color: #991b1b;
                        border: 1px solid #fecaca;
                    }

                    .form-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1.5rem;
                        margin-bottom: 2rem;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                    }

                    .form-group-full {
                        grid-column: 1 / -1;
                    }

                    .form-select,
                    .form-input,
                    .form-textarea {
                        width: 100%;
                        padding: 0.875rem 1rem;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 1rem;
                        transition: all 0.2s ease;
                        background: white;
                    }

                    .form-select:focus,
                    .form-input:focus,
                    .form-textarea:focus {
                        outline: none;
                        border-color: var(--cat-yellow);
                        box-shadow: 0 0 0 3px rgba(255, 205, 17, 0.1);
                    }

                    .form-input-error {
                        border-color: #ef4444 !important;
                        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
                    }

                    .form-textarea {
                        resize: vertical;
                        font-family: inherit;
                    }

                    .form-error-message {
                        margin-top: 0.5rem;
                        font-size: 0.75rem;
                        color: #ef4444;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }

                    .form-actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: flex-end;
                        padding-top: 1rem;
                        border-top: 1px solid #e2e8f0;
                    }

                    .success-container {
                        min-height: 60vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 2rem;
                    }

                    .success-card {
                        background: white;
                        border-radius: 20px;
                        padding: 3rem;
                        text-align: center;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        max-width: 600px;
                        width: 100%;
                    }

                    .success-icon {
                        color: var(--success-green);
                        margin-bottom: 2rem;
                        display: flex;
                        justify-content: center;
                    }

                    .success-title {
                        font-size: 2rem;
                        font-weight: 700;
                        color: var(--cat-dark-gray);
                        margin-bottom: 2rem;
                    }

                    .order-summary {
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 1.5rem;
                        margin-bottom: 2rem;
                        text-align: left;
                    }

                    .summary-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #e2e8f0;
                    }

                    .summary-item:last-child {
                        border-bottom: none;
                    }

                    .summary-label {
                        font-weight: 500;
                        color: var(--cat-medium-gray);
                    }

                    .summary-value {
                        font-weight: 600;
                        color: var(--cat-dark-gray);
                    }

                    .summary-value.pending {
                        background: #fef3c7;
                        color: #92400e;
                        padding: 0.25rem 0.5rem;
                        border-radius: 4px;
                        font-size: 0.875rem;
                    }

                    .success-message {
                        color: var(--cat-medium-gray);
                        line-height: 1.6;
                        margin-bottom: 2rem;
                    }

                    .success-actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                        flex-wrap: wrap;
                    }

                    @media (max-width: 768px) {
                        .header-left {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 0.75rem;
                        }

                        .form-grid {
                            grid-template-columns: 1fr;
                        }

                        .duration-card {
                            min-width: auto;
                            width: 100%;
                        }

                        .success-actions {
                            flex-direction: column;
                        }

                        .form-actions {
                            flex-direction: column;
                        }

                        .success-card {
                            padding: 2rem;
                        }
                    }
                `}</style>
            </Layout>
        </>
    )
}