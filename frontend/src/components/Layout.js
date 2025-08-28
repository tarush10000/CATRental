import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Layout = ({ children }) => {
    const { data: session } = useSession();
    const router = useRouter();
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-cat-yellow border-b border-gray-200 fixed w-full top-0 z-50">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        {/* Logo and Title */}
                        <div className="flex items-center">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="text-gray-700 hover:text-gray-900 md:hidden"
                            >
                                <span className="sr-only">Open sidebar</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div className="flex items-center ml-4 md:ml-0">
                                <div className="flex-shrink-0">
                                    <img
                                        className="h-8 w-auto"
                                        src="/caterpillar-logo.png"
                                        alt="Caterpillar"
                                    />
                                </div>
                                <h1 className="ml-3 text-xl font-semibold text-gray-900">
                                    Machine Tracker
                                </h1>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-700">
                                Welcome, {session?.user?.name}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded-full">
                                {session?.user?.role?.toUpperCase()}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="btn-secondary text-sm"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex pt-16">
                {/* Sidebar */}
                <div className={`bg-white w-64 min-h-screen shadow-sm border-r border-gray-200 fixed md:relative md:translate-x-0 transform transition-transform duration-200 ease-in-out z-30 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}>
                    <nav className="mt-5 px-2">
                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${router.pathname === item.href
                                            ? 'bg-cat-yellow text-gray-900'
                                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <span className="mr-3 text-lg">{item.icon}</span>
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </nav>
                </div>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <div className="flex-1 md:ml-0">
                    <main className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;