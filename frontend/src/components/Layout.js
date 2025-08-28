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
    LogOut,
    Bell,
    Search,
    ChevronDown
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
        { name: 'All Machines', href: '/admin/machines', icon: Truck },
        { name: 'Add Machine', href: '/admin/add-machine', icon: Plus },
        { name: 'Assign Machine', href: '/admin/add-order', icon: FileText },
        { name: 'Manage Requests', href: '/admin/requests', icon: MessageSquare },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const customerNavItems = [
        { name: 'Dashboard', href: '/customer/dashboard', icon: BarChart3 },
        { name: 'Create Request', href: '/customer/create-request', icon: FileText },
        { name: 'My Machines', href: '/customer/machines', icon: Truck },
        { name: 'Recommendations', href: '/customer/recommendations', icon: Lightbulb },
    ];

    const navItems = isAdmin ? adminNavItems : customerNavItems;

    return (
        <div className="modern-layout">
            {/* Enhanced Sidebar */}
            <div className={`modern-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                {/* Logo Section */}
                <div className="sidebar-header">
                    <div className="logo-container">
                        <Truck className="logo-icon" />
                        <div className="logo-text">
                            <h1 className="logo-title">CatRental</h1>
                            <p className="logo-subtitle">Management System</p>
                        </div>
                    </div>
                </div>
                
                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <p className="nav-section-title">Main Navigation</p>
                        {navItems.map((item) => {
                            const IconComponent = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <IconComponent className="nav-item-icon" />
                                    <span className="nav-item-text">{item.name}</span>
                                    {isActive && <div className="nav-item-indicator"></div>}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User Profile Section */}
                {session && (
                    <div className="sidebar-footer">
                        <div className="user-profile">
                            <div className="user-avatar">
                                <User className="user-avatar-icon" />
                            </div>
                            <div className="user-info">
                                <p className="user-name">{session.user.name}</p>
                                <p className="user-role">{session.user.role}</p>
                                {isAdmin && session.user.dealership_name && (
                                    <p className="user-company">{session.user.dealership_name}</p>
                                )}
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="logout-btn"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="main-content">
                {/* Top Navigation Bar */}
                <header className="top-navbar">
                    <div className="navbar-left">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="mobile-menu-btn"
                        >
                            <Menu size={20} />
                        </button>
                        
                        {/* Breadcrumb */}
                        <div className="breadcrumb">
                            <span className="breadcrumb-item">
                                {isAdmin ? 'Admin' : 'Customer'}
                            </span>
                            <span className="breadcrumb-separator">/</span>
                            <span className="breadcrumb-current">
                                {navItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                            </span>
                        </div>
                    </div>

                    <div className="navbar-right">
                        {/* Search Bar */}
                        <div className="navbar-search">
                            <Search className="search-icon" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="search-input"
                            />
                        </div>

                        {/* Notifications */}
                        <button className="notification-btn">
                            <Bell size={18} />
                            <span className="notification-badge">3</span>
                        </button>

                        {/* User Menu */}
                        <div className="user-menu">
                            <button className="user-menu-btn">
                                <div className="user-menu-avatar">
                                    <User size={16} />
                                </div>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="page-content">
                    <div className="content-wrapper">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="mobile-overlay"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default Layout;