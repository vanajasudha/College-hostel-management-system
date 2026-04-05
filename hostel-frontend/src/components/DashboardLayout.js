import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiChevronDown, FiUser, FiLogOut } from 'react-icons/fi';
import './DashboardLayout.css';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch unread notification count for student
    useEffect(() => {
        const fetchCount = async () => {
            if (!user || user.role !== 'Student') return;
            try {
                const response = await axios.get('/notifications/unread-count/me');
                setUnreadCount(response.data?.unreadCount || 0);
            } catch (err) {
                console.warn('Unable to fetch unread notification count', err?.message);
            }
        };
        fetchCount();
    }, [user]);

    const role = user?.role || '';
    const initials = user?.login_id?.charAt(0)?.toUpperCase() || role.charAt(0);

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="main-content">
                {/* Top Navbar */}
                <header className="topbar">
                    <div className="topbar-left">
                        <h2 className="topbar-title">Hostel Management System</h2>
                    </div>
                    <div className="topbar-right">
                        <button className="topbar-icon-btn notif-btn" title="Notifications" onClick={() => navigate('/student')}>
                            <FiBell />
                            {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
                        </button>

                        <div className="topbar-user" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <div className="topbar-avatar">{initials}</div>
                            <div className="topbar-user-info">
                                <span className="topbar-username">{user?.login_id || 'User'}</span>
                                <span className="topbar-role">{role}</span>
                            </div>
                            <FiChevronDown className={`chevron ${dropdownOpen ? 'open' : ''}`} />

                            {dropdownOpen && (
                                <div className="topbar-dropdown">
                                    <button onClick={() => navigate(`/${role.toLowerCase()}/profile`)}>
                                        <FiUser /> My Profile
                                    </button>
                                    <div className="dropdown-divider" />
                                    <button className="logout" onClick={handleLogout}>
                                        <FiLogOut /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="dashboard-container">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
