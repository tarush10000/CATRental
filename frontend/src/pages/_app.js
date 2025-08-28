import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import Head from 'next/head'
import '@/styles/globals.css'

export default function App({
    Component,
    pageProps: { session, ...pageProps },
}) {
    return (
        <>
            <Head>
                <title>Caterpillar Machine Tracker</title>
                <meta name="description" content="Track and manage Caterpillar machines efficiently" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />

                {/* Caterpillar brand fonts - if available */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <SessionProvider session={session}>
                <Component {...pageProps} />
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#fff',
                            color: '#2C2C2C',
                            border: '2px solid #FFCD11',
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
                    }}
                />
            </SessionProvider>
        </>
    )
}