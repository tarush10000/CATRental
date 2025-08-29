'use client'

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import MapPanel from './MapPanel';
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
    ChevronDown,
    Brain,
    MapPin,
    Map
} from 'lucide-react';

const Layout = ({ children }) => {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [mapPanelOpen, setMapPanelOpen] = useState(false);

    const isAdmin = session?.user?.role === 'admin';
    const isCustomer = session?.user?.role === 'customer';

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/auth/signin' });
    };

    // Add click outside handler for profile dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownOpen && !event.target.closest('.user-menu')) {
                setProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileDropdownOpen]);

    const adminNavItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
        { name: 'All Machines', href: '/admin/machines', icon: Truck },
        { name: 'Add Machine', href: '/admin/add-machine', icon: Plus },
        { name: 'Assign Machine', href: '/admin/add-order', icon: FileText },
        { name: 'Manage Requests', href: '/admin/requests', icon: MessageSquare },
        { name: 'Smart Recommendations', href: '/admin/recommendations', icon: Brain },
        { name: 'Health Scores', href: '/admin/health-scores', icon: Lightbulb },
        // { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    const customerNavItems = [
        { name: 'Dashboard', href: '/customer/dashboard', icon: BarChart3 },
        { name: 'Create Request', href: '/customer/create-request', icon: FileText },
        { name: 'My Machines', href: '/customer/machines', icon: Truck },
        { name: 'Smart Recommendations', href: '/customer/recommendations', icon: Lightbulb },
        { name: 'My Health Score', href: '/customer/my-health-score', icon: Brain },
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
                        {/* Map Panel Button */}
                        <button 
                            className="map-panel-btn"
                            onClick={() => setMapPanelOpen(true)}
                            title="View Machine Locations"
                        >
                            <MapPin size={18} />
                            <span className="map-btn-text">Map</span>
                        </button>

                        {/* Notifications */}
                        <button 
                            className="notification-btn"
                            onClick={() => {
                                const notificationSection = document.getElementById('notifications-section');
                                if (notificationSection) {
                                    notificationSection.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            title="View Notifications"
                        >
                            <Bell size={18} />
                            <span className="notification-badge">3</span>
                        </button>

                        {/* User Menu */}
                        <div className="user-menu">
                            <button 
                                className="user-menu-btn"
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            >
                                <div className="user-menu-avatar">
                                    <User size={16} />
                                </div>
                                <span className="user-name-navbar">{session?.user?.name || 'User'}</span>
                                <ChevronDown size={14} />
                            </button>
                            
                            {/* Profile Dropdown */}
                            {profileDropdownOpen && (
                                <div className="user-menu-dropdown">
                                    <div className="dropdown-item">
                                        <User size={16} />
                                        <span>{session?.user?.name}</span>
                                    </div>
                                    <div className="dropdown-item">
                                        <span className="user-role-text">{session?.user?.role}</span>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <button className="dropdown-item dropdown-button" onClick={() => {
                                        setProfileDropdownOpen(false);
                                        // Navigate to settings page
                                        router.push(isAdmin ? '/admin/settings' : '/customer/settings');
                                    }}>
                                        <Settings size={16} />
                                        <span>Settings</span>
                                    </button>
                                    <button className="dropdown-item dropdown-button" onClick={handleSignOut}>
                                        <LogOut size={16} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
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

            {/* Map Panel */}
            <MapPanel isOpen={mapPanelOpen} onClose={() => setMapPanelOpen(false)} />
        </div>
    );
};

export default Layout;