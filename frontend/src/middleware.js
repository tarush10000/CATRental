import { withAuth } from "next-auth/middleware"

export default withAuth(
    function middleware(req) {
        // Add any additional middleware logic here
        console.log("Middleware running for:", req.nextUrl.pathname)
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                // Check if user is trying to access admin routes
                if (req.nextUrl.pathname.startsWith("/admin")) {
                    return token?.role === "admin"
                }

                // Check if user is trying to access customer routes
                if (req.nextUrl.pathname.startsWith("/customer")) {
                    return token?.role === "customer"
                }

                // For other protected routes, just check if token exists
                return !!token
            },
        },
        pages: {
            signIn: "/auth/signin",
        }
    }
)

// Specify which routes should be protected
export const config = {
    matcher: [
        "/admin/:path*",
        "/customer/:path*",
        "/api/admin/:path*",
        "/api/customer/:path*"
    ]
}