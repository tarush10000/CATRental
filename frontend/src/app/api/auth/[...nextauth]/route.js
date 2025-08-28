import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    })

                    const user = await res.json()

                    if (res.ok && user.success) {
                        return {
                            id: user.data.user.user_id,
                            email: user.data.user.email,
                            name: user.data.user.name,
                            role: user.data.user.role,
                            dealership_id: user.data.user.dealership_id,
                            dealership_name: user.data.user.dealership_name,
                            accessToken: user.data.access_token
                        }
                    }
                    return null
                } catch (error) {
                    console.error('Authorization error:', error)
                    return null
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.dealership_id = user.dealership_id
                token.dealership_name = user.dealership_name
                token.accessToken = user.accessToken
            }
            return token
        },
        async session({ session, token }) {
            session.user.id = token.sub
            session.user.role = token.role
            session.user.dealership_id = token.dealership_id
            session.user.dealership_name = token.dealership_name
            session.accessToken = token.accessToken
            return session
        }
    },
    pages: {
        signIn: '/auth/signin',
        signUp: '/auth/signup'
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
