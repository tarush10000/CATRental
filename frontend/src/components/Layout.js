'use client'

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Changed import
import { useState } from 'react';

const Layout = ({ children }) => {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname(); // Use this instead of router.pathname
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isAdmin = session?.user?.role === 'admin';
    const isCustomer = session?.user?.role === 'customer';

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/signin' });
    };

    const adminNavItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
        { name: 'Add Machine', href: '/admin/add-machine', icon: '🚜' },
        { name: 'Add Order', href: '/admin/add-order', icon: '📝' },
        { name: 'Manage Requests', href: '/admin/requests', icon: '📋' },
        { name: 'All Machines', href: '/admin/machines', icon: '🔧' },
    ];

    const customerNavItems = [
        { name: 'Dashboard', href: '/customer/dashboard', icon: '📊' },
        { name: 'Create Request', href: '/customer/create-request', icon: '📝' },
        { name: 'My Machines', href: '/customer/machines', icon: '🚜' },
        { name: 'Recommendations', href: '/customer/recommendations', icon: '💡' },
    ];

    const navItems = isAdmin ? adminNavItems : customerNavItems;

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
                <div className="flex items-center justify-center h-16 bg-blue-600 text-white">
                    <h1 className="text-xl font-bold">CatRental</h1>
                </div>
                
                <nav className="mt-5 px-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center px-2 py-2 text-base font-medium rounded-md mb-1 ${
                                pathname === item.href
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <span className="mr-3">{item.icon}</span>
                            {item.name}
                        </Link>
                    ))}
                </nav>

                {/* User info and sign out */}
                {session && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                        <div className="text-sm text-gray-600 mb-2">
                            {session.user.name}
                            <br />
                            <span className="text-xs capitalize">{session.user.role}</span>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
                {/* Top bar for mobile */}
                <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* Main content area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {children}
                </main>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div 
                    className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;