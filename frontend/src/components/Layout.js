'use client'

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
    BarChart3, 
    Truck, 
    FileText, 
    MessageSquare, 
    Settings, 
    User, 
    Plus,
    Lightbulb,
    Menu,
    LogOut
} from 'lucide-react';

const Layout = ({ children }) => {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isAdmin = session?.user?.role === 'admin';
    const isCustomer = session?.user?.role === 'customer';

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/signin' });
    };

    const adminNavItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
        { name: 'Add Machine', href: '/admin/add-machine', icon: Plus },
        { name: 'Add Order', href: '/admin/add-order', icon: FileText },
        { name: 'Manage Requests', href: '/admin/requests', icon: MessageSquare },
        { name: 'All Machines', href: '/admin/machines', icon: Settings },
    ];

    const customerNavItems = [
        { name: 'Dashboard', href: '/customer/dashboard', icon: BarChart3 },
        { name: 'Create Request', href: '/customer/create-request', icon: FileText },
        { name: 'My Machines', href: '/customer/machines', icon: Truck },
        { name: 'Recommendations', href: '/customer/recommendations', icon: Lightbulb },
    ];

    const navItems = isAdmin ? adminNavItems : customerNavItems;

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
                <div className="flex items-center justify-center h-16 bg-blue-600 text-white">
                    <Truck className="h-8 w-8 mr-2" />
                    <h1 className="text-xl font-bold">CatRental</h1>
                </div>
                
                <nav className="mt-5 px-2">
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md mb-1 ${
                                    pathname === item.href
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <IconComponent className="mr-3 h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User info and sign out */}
                {session && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                        <div className="text-sm text-gray-600 mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            <div>
                                {session.user.name}
                                <br />
                                <span className="text-xs capitalize">{session.user.role}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
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
                        <Menu className="h-6 w-6" />
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