import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'

export default function SignIn() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result.error) {
                setError('Invalid credentials. Please try again.')
            } else {
                // Get the updated session to check user role
                const session = await getSession()

                if (session?.user?.role === 'admin') {
                    router.push('/admin/dashboard')
                } else if (session?.user?.role === 'customer') {
                    router.push('/customer/dashboard')
                } else {
                    router.push('/dashboard')
                }
            }
        } catch (error) {
            setError('An error occurred. Please try again.')
            console.error('Sign in error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Head>
                <title>Sign In - Caterpillar Machine Tracker</title>
                <meta name="description" content="Sign in to Caterpillar Machine Tracking System" />
            </Head>

            <div className="min-h-screen flex items-center justify-center bg-cat-light-gray py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <div className="flex justify-center">
                            <img
                                className="h-16 w-auto"
                                src="/caterpillar-logo.png"
                                alt="Caterpillar"
                            />
                        </div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-cat-dark-gray">
                            Sign in to your account
                        </h2>
                        <p className="mt-2 text-center text-sm text-cat-medium-gray">
                            Or{' '}
                            <Link href="/auth/signup" className="font-medium text-cat-yellow hover:underline">
                                create a new account
                            </Link>
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="card">
                            <div className="card-body">
                                {error && (
                                    <div className="alert alert-error">
                                        {error}
                                    </div>
                                )}

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
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="password" className="form-label">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        className="form-input"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner mr-2"></span>
                                                Signing in...
                                            </>
                                        ) : (
                                            'Sign in'
                                        )}
                                    </button>
                                </div>

                                <div className="text-center">
                                    <Link href="/auth/forgot-password" className="text-sm text-cat-medium-gray hover:underline">
                                        Forgot your password?
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </form>

                    <div className="text-center">
                        <p className="text-xs text-cat-medium-gray">
                            © 2025 Caterpillar Inc. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}