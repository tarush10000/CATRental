'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Truck, AlertCircle, CheckCircle, User, Building } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SignUp() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'customer',
        dealershipId: '',
        dealershipName: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        // Clear specific error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required'
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters'
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!formData.email) {
            newErrors.email = 'Email is required'
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address'
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required'
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters'
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password'
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }

        // Admin-specific validations
        if (formData.role === 'admin') {
            if (!formData.dealershipId.trim()) {
                newErrors.dealershipId = 'Dealership ID is required for admin accounts'
            }
            if (!formData.dealershipName.trim()) {
                newErrors.dealershipName = 'Dealership name is required for admin accounts'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            toast.error('Please fix the errors below')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                    role: formData.role,
                    dealership_id: formData.role === 'admin' ? formData.dealershipId.trim() : null,
                    dealership_name: formData.role === 'admin' ? formData.dealershipName.trim() : null,
                }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                setSuccess(true)
                toast.success('Account created successfully!')

                // Redirect to sign in page after a short delay
                setTimeout(() => {
                    router.push('/auth/signin')
                }, 2000)
            } else {
                // Handle specific backend errors
                if (data.detail && data.detail.includes('already registered')) {
                    setErrors({ email: 'This email is already registered' })
                    toast.error('Email already exists')
                } else {
                    toast.error(data.detail || 'Registration failed')
                }
            }
        } catch (error) {
            console.error('Registration error:', error)
            toast.error('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const togglePasswordVisibility = (field) => {
        if (field === 'password') {
            setShowPassword(!showPassword)
        } else if (field === 'confirmPassword') {
            setShowConfirmPassword(!showConfirmPassword)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cat-light-gray to-white py-12 px-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="mx-auto h-16 w-16 bg-success-green rounded-full flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-cat-dark-gray">Account Created!</h2>
                    <p className="text-cat-medium-gray">
                        Your CatRental account has been created successfully.
                        You'll be redirected to the sign-in page shortly.
                    </p>
                    <div className="spinner mx-auto"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cat-light-gray to-white py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-cat-yellow rounded-full flex items-center justify-center mb-6">
                        <Truck className="h-8 w-8 text-cat-black" />
                    </div>
                    <h2 className="text-3xl font-bold text-cat-dark-gray">
                        Join CatRental
                    </h2>
                    <p className="mt-2 text-sm text-cat-medium-gray">
                        Create your account to start managing equipment
                    </p>
                </div>

                {/* Sign Up Form */}
                <div className="card">
                    <div className="card-body">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Role Selection */}
                            <div className="form-group">
                                <label className="form-label">Account Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`cursor-pointer ${formData.role === 'customer' ? 'ring-2 ring-cat-yellow' : ''}`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="customer"
                                            checked={formData.role === 'customer'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className="card p-4 text-center hover:bg-cat-light-gray transition-colors">
                                            <User className="h-8 w-8 mx-auto mb-2 text-cat-medium-gray" />
                                            <div className="font-medium text-cat-dark-gray">Customer</div>
                                            <div className="text-xs text-cat-medium-gray">Rent equipment</div>
                                        </div>
                                    </label>

                                    <label className={`cursor-pointer ${formData.role === 'admin' ? 'ring-2 ring-cat-yellow' : ''}`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="admin"
                                            checked={formData.role === 'admin'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className="card p-4 text-center hover:bg-cat-light-gray transition-colors">
                                            <Building className="h-8 w-8 mx-auto mb-2 text-cat-medium-gray" />
                                            <div className="font-medium text-cat-dark-gray">Admin</div>
                                            <div className="text-xs text-cat-medium-gray">Manage fleet</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Name Field */}
                            <div className="form-group">
                                <label htmlFor="name" className="form-label">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    className={`form-input ${errors.name ? 'border-error-red' : ''}`}
                                    placeholder="Enter your full name"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                                {errors.name && <p className="form-error">{errors.name}</p>}
                            </div>

                            {/* Email Field */}
                            <div className="form-group">
                                <label htmlFor="email" className="form-label">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className={`form-input ${errors.email ? 'border-error-red' : ''}`}
                                    placeholder="Enter your email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                                {errors.email && <p className="form-error">{errors.email}</p>}
                            </div>

                            {/* Admin-specific fields */}
                            {formData.role === 'admin' && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="dealershipId" className="form-label">
                                            Dealership ID
                                        </label>
                                        <input
                                            id="dealershipId"
                                            name="dealershipId"
                                            type="text"
                                            required={formData.role === 'admin'}
                                            className={`form-input ${errors.dealershipId ? 'border-error-red' : ''}`}
                                            placeholder="Enter your dealership ID"
                                            value={formData.dealershipId}
                                            onChange={handleChange}
                                        />
                                        {errors.dealershipId && <p className="form-error">{errors.dealershipId}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="dealershipName" className="form-label">
                                            Dealership Name
                                        </label>
                                        <input
                                            id="dealershipName"
                                            name="dealershipName"
                                            type="text"
                                            required={formData.role === 'admin'}
                                            className={`form-input ${errors.dealershipName ? 'border-error-red' : ''}`}
                                            placeholder="Enter your dealership name"
                                            value={formData.dealershipName}
                                            onChange={handleChange}
                                        />
                                        {errors.dealershipName && <p className="form-error">{errors.dealershipName}</p>}
                                    </div>
                                </>
                            )}

                            {/* Password Field */}
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        className={`form-input pr-12 ${errors.password ? 'border-error-red' : ''}`}
                                        placeholder="Create a strong password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => togglePasswordVisibility('password')}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-cat-medium-gray hover:text-cat-dark-gray" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-cat-medium-gray hover:text-cat-dark-gray" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && <p className="form-error">{errors.password}</p>}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="form-group">
                                <label htmlFor="confirmPassword" className="form-label">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        className={`form-input pr-12 ${errors.confirmPassword ? 'border-error-red' : ''}`}
                                        placeholder="Confirm your password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => togglePasswordVisibility('confirmPassword')}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5 text-cat-medium-gray hover:text-cat-dark-gray" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-cat-medium-gray hover:text-cat-dark-gray" />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                            </div>

                            {/* Terms and Conditions */}
                            <div className="form-group">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        required
                                        className="h-4 w-4 text-cat-yellow focus:ring-cat-yellow border-cat-medium-gray rounded"
                                    />
                                    <span className="ml-2 block text-sm text-cat-medium-gray">
                                        I agree to the{' '}
                                        <Link href="/terms" className="text-cat-yellow hover:underline">
                                            Terms of Service
                                        </Link>{' '}
                                        and{' '}
                                        <Link href="/privacy" className="text-cat-yellow hover:underline">
                                            Privacy Policy
                                        </Link>
                                    </span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <div className="form-group">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center"
                                >
                                    {loading ? (
                                        <>
                                            <div className="spinner mr-2"></div>
                                            Creating account...
                                        </>
                                    ) : (
                                        <>
                                            <Truck className="h-5 w-5 mr-2" />
                                            Create Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sign In Link */}
                <div className="text-center">
                    <p className="text-sm text-cat-medium-gray">
                        Already have an account?{' '}
                        <Link
                            href="/auth/signin"
                            className="font-medium text-cat-yellow hover:underline"
                        >
                            Sign in here
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-xs text-cat-medium-gray">
                        © 2025 CatRental. Built for efficient equipment management.
                    </p>
                </div>
            </div>
        </div>
    )
}