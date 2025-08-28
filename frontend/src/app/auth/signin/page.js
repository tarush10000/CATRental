'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
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
                
                // Get the updated session to check user role
                const session = await getSession()
                
                // Redirect based on user role
                if (session?.user?.role === 'admin') {
                    router.push('/admin/dashboard')
                } else if (session?.user?.role === 'customer') {
                    router.push('/customer/dashboard')
                } else {
                    // Fallback redirect
                    router.push('/admin/dashboard')
                }
                
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
                                        className="form-input pr-10"
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
                                            <EyeOff className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Signing in...
                                        </div>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Sign Up Link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-cat-medium-gray">
                                Don't have an account?{' '}
                                <Link 
                                    href="/auth/signup" 
                                    className="font-medium text-cat-yellow hover:text-cat-dark-gray transition-colors"
                                >
                                    Sign up here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}