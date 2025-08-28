'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Truck, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function SignIn() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        // Clear error when user starts typing
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            })

            if (result?.error) {
                setError('Invalid email or password. Please try again.')
                toast.error('Sign in failed')
            } else {
                toast.success('Welcome to CatRental!')

                // Redirect based on user role (will be handled by the session)
                router.push('/admin/dashboard') // Default redirect, will be corrected by middleware
                router.refresh()
            }
        } catch (error) {
            console.error('Sign in error:', error)
            setError('An unexpected error occurred. Please try again.')
            toast.error('Sign in failed')
        } finally {
            setLoading(false)
        }
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
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
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-cat-medium-gray">
                        Sign in to your CatRental account
                    </p>
                </div>

                {/* Sign In Form */}
                <div className="card">
                    <div className="card-body">
                        {error && (
                            <div className="alert alert-error mb-6">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                    className="form-input"
                                    placeholder="Enter your email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

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
                                        autoComplete="current-password"
                                        required
                                        className="form-input pr-12"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-cat-medium-gray hover:text-cat-dark-gray" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-cat-medium-gray hover:text-cat-dark-gray" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-cat-yellow focus:ring-cat-yellow border-cat-medium-gray rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-cat-medium-gray">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <Link
                                        href="/auth/forgot-password"
                                        className="font-medium text-cat-yellow hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
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
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            <Truck className="h-5 w-5 mr-2" />
                                            Sign in
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sign Up Link */}
                <div className="text-center">
                    <p className="text-sm text-cat-medium-gray">
                        Don't have an account?{' '}
                        <Link
                            href="/auth/signup"
                            className="font-medium text-cat-yellow hover:underline"
                        >
                            Create one here
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