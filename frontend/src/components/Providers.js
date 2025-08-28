'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children, session }) {
    return (
        <SessionProvider session={session}>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#2C2C2C',
                        border: '2px solid #FFCD11',
                        borderRadius: '0.5rem',
                        fontSize: '14px',
                        fontWeight: '500',
                    },
                    success: {
                        style: {
                            border: '2px solid #28A745',
                        },
                    },
                    error: {
                        style: {
                            border: '2px solid #DC3545',
                        },
                    },
                    loading: {
                        style: {
                            border: '2px solid #FFCD11',
                        },
                    },
                }}
            />
        </SessionProvider>
    )
}