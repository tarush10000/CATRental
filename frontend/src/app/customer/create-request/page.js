'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Layout from '@/components/Layout'
import {
    FileText, Truck, Calendar, MessageSquare, Send, 
    RefreshCw, AlertTriangle, CheckCircle, Clock,
    XCircle, ArrowLeft, Info, Wrench
} from 'lucide-react'

export default function CreateRequestPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    
    const [machines, setMachines] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        machineID: '',
        requestType: 'Support',
        date: '',
        comments: '',
        priority: 'Medium'
    })
    const [errors, setErrors] = useState({})
    const [submitSuccess, setSubmitSuccess] = useState(false)

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user.role !== 'customer') {
            router.push('/auth/signin')
            return
        }

        fetchUserMachines()
        
        // Handle URL parameters for pre-filling form
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search)
            const machineId = urlParams.get('machineId')
            const requestType = urlParams.get('requestType')
            
            if (machineId) {
                setFormData(prev => ({ ...prev, machineID: machineId }))
            }
            if (requestType && ['Support', 'Extension', 'Cancellation'].includes(requestType)) {
                setFormData(prev => ({ 
                    ...prev, 
                    requestType: requestType,
                    date: requestType !== 'Support' ? new Date().toISOString().split('T')[0] : ''
                }))
            }
        }
    }, [session, status, router])

    const fetchUserMachines = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/machines`, {
                headers: {
                    'Authorization': `Bearer ${session?.accessToken}`,
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

    const validateForm = () => {
        const newErrors = {}
        
        if (!formData.machineID) {
            newErrors.machineID = 'Please select a machine'
        }
        
        if (!formData.requestType) {
            newErrors.requestType = 'Please select a request type'
        }
        
        if ((formData.requestType === 'Extension' || formData.requestType === 'Cancellation') && !formData.date) {
            newErrors.date = 'Date is required for this request type'
        }
        
        if (!formData.comments.trim()) {
            newErrors.comments = 'Please provide details about your request'
        } else if (formData.comments.trim().length < 10) {
            newErrors.comments = 'Please provide more details (minimum 10 characters)'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) return

        setSubmitting(true)
        setErrors({})

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({
                    machineID: formData.machineID,
                    requestType: formData.requestType,
                    description: formData.comments,
                    priority: formData.priority.toLowerCase(),
                    date: formData.date || null
                })
            })

            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setSubmitSuccess(true)
                    setTimeout(() => {
                        router.push('/customer/dashboard')
                    }, 2000)
                }
            } else {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to submit request')
            }
        } catch (error) {
            console.error('Error submitting request:', error)
            setErrors({ submit: error.message || 'Failed to submit request. Please try again.' })
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
    }

    const getRequestTypeIcon = (type) => {
        switch (type) {
            case 'Support': return <Wrench size={16} />
            case 'Extension': return <Calendar size={16} />
            case 'Cancellation': return <XCircle size={16} />
            default: return <MessageSquare size={16} />
        }
    }

    const getRequestTypeDescription = (type) => {
        switch (type) {
            case 'Support':
                return 'Get technical assistance, report issues, or request maintenance'
            case 'Extension':
                return 'Request to extend the rental period of your equipment'
            case 'Cancellation':
                return 'Request early return or cancellation of equipment rental'
            default:
                return ''
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-red-600 bg-red-50 border-red-200'
            case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
            case 'Low': return 'text-green-600 bg-green-50 border-green-200'
            default: return 'text-gray-600 bg-gray-50 border-gray-200'
        }
    }

    if (status === 'loading' || loading) {
        return (
            <Layout>
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading create request form...</p>
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
                                <CheckCircle size={48} />
                            </div>
                            <h1 className="success-title">Request Submitted Successfully!</h1>
                            <p className="success-message">
                                Your service request has been submitted and will be reviewed by our team. 
                                You'll receive updates on the status of your request.
                            </p>
                            <div className="success-actions">
                                <button 
                                    onClick={() => router.push('/customer/dashboard')}
                                    className="btn-modern btn-primary-modern"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <style jsx>{`
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
                        max-width: 500px;
                        width: 100%;
                    }

                    .success-icon {
                        color: var(--success-green);
                        margin-bottom: 1.5rem;
                        display: flex;
                        justify-content: center;
                    }

                    .success-title {
                        font-size: 1.75rem;
                        font-weight: 700;
                        color: var(--cat-dark-gray);
                        margin-bottom: 1rem;
                    }

                    .success-message {
                        color: var(--cat-medium-gray);
                        line-height: 1.6;
                        margin-bottom: 2rem;
                    }

                    .success-actions {
                        display: flex;
                        justify-content: center;
                    }
                `}</style>
            </Layout>
        )
    }

    return (
        <>
            <Head>
                <title>Create Request - Caterpillar Machine Tracker</title>
                <meta name="description" content="Create a new service request for your equipment" />
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
                                            <FileText className="page-title-icon" />
                                            Create Service Request
                                        </h1>
                                        <p className="page-subtitle">
                                            Submit a request for equipment support, extension, or cancellation
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Card */}
                        <div className="form-container">
                            <div className="modern-card">
                                <div className="card-header-modern">
                                    <h3 className="card-title-modern">Request Details</h3>
                                    <p className="card-subtitle">Please fill in all required information</p>
                                </div>

                                <div className="card-content">
                                    {/* Error Alert */}
                                    {errors.submit && (
                                        <div className="alert alert-error">
                                            <AlertTriangle size={16} />
                                            <span>{errors.submit}</span>
                                        </div>
                                    )}

                                    <div className="form-grid">
                                        {/* Machine Selection */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                Select Machine <span className="required">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${errors.machineID ? 'form-input-error' : ''}`}
                                                value={formData.machineID}
                                                onChange={(e) => handleInputChange('machineID', e.target.value)}
                                                disabled={submitting}
                                            >
                                                <option value="">Choose a machine...</option>
                                                {machines.map(machine => (
                                                    <option key={machine.machineID || machine.machine_id} value={machine.machineID || machine.machine_id}>
                                                        {machine.machineID || machine.machine_id} - {machine.machineType || machine.machine_type} ({machine.location})
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.machineID && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.machineID}
                                                </div>
                                            )}
                                            {machines.length === 0 && !loading && (
                                                <div className="form-help-text">
                                                    <Info size={12} />
                                                    No machines assigned to you. Contact administrator.
                                                </div>
                                            )}
                                        </div>

                                        {/* Request Type */}
                                        <div className="form-group">
                                            <label className="form-label">
                                                Request Type <span className="required">*</span>
                                            </label>
                                            <select
                                                className={`form-select ${errors.requestType ? 'form-input-error' : ''}`}
                                                value={formData.requestType}
                                                onChange={(e) => handleInputChange('requestType', e.target.value)}
                                                disabled={submitting}
                                            >
                                                <option value="Support">Support</option>
                                                <option value="Extension">Extension</option>
                                                <option value="Cancellation">Cancellation</option>
                                            </select>
                                            {errors.requestType && (
                                                <div className="form-error-message">
                                                    <AlertTriangle size={12} />
                                                    {errors.requestType}
                                                </div>
                                            )}
                                        </div>

                                        {/* Priority */}
                                        <div className="form-group">
                                            <label className="form-label">Priority Level</label>
                                            <select
                                                className="form-select"
                                                value={formData.priority}
                                                onChange={(e) => handleInputChange('priority', e.target.value)}
                                                disabled={submitting}
                                            >
                                                <option value="Low">Low - Can wait</option>
                                                <option value="Medium">Medium - Normal priority</option>
                                                <option value="High">High - Urgent</option>
                                            </select>
                                            {/* <div className={`priority-indicator ${getPriorityColor(formData.priority)}`}>
                                                {getRequestTypeIcon(formData.requestType)}
                                                <span>Priority: {formData.priority}</span>
                                            </div> */}
                                        </div>

                                        {/* Date Field - Conditional */}
                                        {(formData.requestType === 'Extension' || formData.requestType === 'Cancellation') && (
                                            <div className="form-group">
                                                <label className="form-label">
                                                    {formData.requestType === 'Extension' ? 'Extend Until' : 'Cancellation Date'} <span className="required">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className={`form-input ${errors.date ? 'form-input-error' : ''}`}
                                                    value={formData.date}
                                                    onChange={(e) => handleInputChange('date', e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    disabled={submitting}
                                                />
                                                {errors.date && (
                                                    <div className="form-error-message">
                                                        <AlertTriangle size={12} />
                                                        {errors.date}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Request Type Info Card */}
                                    {/* <div className="info-card">
                                        <div className="info-header">
                                            {getRequestTypeIcon(formData.requestType)}
                                            <h4>{formData.requestType} Request</h4>
                                        </div>
                                        <p className="info-description">
                                            {getRequestTypeDescription(formData.requestType)}
                                        </p>
                                    </div> */}

                                    {/* Comments - Full Width */}
                                    <div className="form-group form-group-full">
                                        <label className="form-label">
                                            Request Details <span className="required">*</span>
                                        </label>
                                        <textarea
                                            className={`form-textarea ${errors.comments ? 'form-input-error' : ''}`}
                                            rows="6"
                                            placeholder="Please provide detailed information about your request. Include any specific issues, requirements, or additional context that would help us process your request efficiently..."
                                            value={formData.comments}
                                            onChange={(e) => handleInputChange('comments', e.target.value)}
                                            disabled={submitting}
                                        />
                                        <div className="form-help-text">
                                            <span className={formData.comments.length < 10 ? 'text-red-500' : 'text-green-600'}>
                                                {formData.comments.length} characters (minimum 10 required)
                                            </span>
                                        </div>
                                        {errors.comments && (
                                            <div className="form-error-message">
                                                <AlertTriangle size={12} />
                                                {errors.comments}
                                            </div>
                                        )}
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
                                            disabled={submitting || machines.length === 0}
                                            className="btn-modern btn-primary-modern"
                                        >
                                            {submitting ? (
                                                <>
                                                    <RefreshCw className="animate-spin" size={16} />
                                                    Submitting Request...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={16} />
                                                    Submit Request
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

                    .info-card {
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 1.5rem;
                        margin: 1.5rem 0;
                    }

                    .info-header {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-bottom: 0.75rem;
                        color: var(--cat-dark-gray);
                        font-weight: 600;
                    }

                    .info-header h4 {
                        margin: 0;
                        font-size: 1rem;
                    }

                    .info-description {
                        color: var(--cat-medium-gray);
                        margin: 0;
                        font-size: 0.875rem;
                        line-height: 1.5;
                    }

                    .priority-indicator {
                        margin-top: 0.5rem;
                        padding: 0.5rem 0.75rem;
                        border-radius: 8px;
                        border: 1px solid;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 500;
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
                        justify-content: flex-end;
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

                    @media (max-width: 768px) {
                        .header-left {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 0.75rem;
                        }

                        .form-grid {
                            grid-template-columns: 1fr;
                        }

                        .priority-indicator {
                            flex-direction: column;
                            align-items: flex-start;
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