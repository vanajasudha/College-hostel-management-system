import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';
import {
    FiHome,
    FiUser,
    FiSettings,
    FiLogOut,
    FiMenu,
    FiMessageSquare,
    FiCreditCard,
    FiUsers,
    FiBarChart2,
    FiTool,
    FiDollarSign
} from 'react-icons/fi';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const role = user?.role || 'Student';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = {
        Student: [
            { path: '/student', name: 'Dashboard', icon: <FiHome /> },
            { path: '/student/profile', name: 'My Profile', icon: <FiUser /> },
            { path: '/student/complaints', name: 'Complaints', icon: <FiMessageSquare /> },
            { path: '/student/payments', name: 'Payments', icon: <FiCreditCard /> },
        ],
        Warden: [
            { path: '/warden', name: 'Dashboard', icon: <FiHome /> },
            { path: '/warden/students', name: 'Manage Students', icon: <FiUsers /> },
            { path: '/warden/complaints', name: 'Complaints', icon: <FiTool /> },
            { path: '/warden/analytics', name: 'Analytics', icon: <FiBarChart2 /> },
            { path: '/warden/payments', name: 'Manage Dues', icon: <FiDollarSign /> },
            { path: '/warden/all-payments', name: 'All Payments', icon: <FiDollarSign /> },
        ],
        Admin: [
            { path: '/admin', name: 'Dashboard', icon: <FiHome /> },
            { path: '/admin/hostels', name: 'Manage Hostels', icon: <FiHome /> },
            { path: '/admin/rooms', name: 'Manage Rooms', icon: <FiTool /> },
            { path: '/admin/students', name: 'Manage Students', icon: <FiUsers /> },
            { path: '/admin/allocate', name: 'Allocate Rooms', icon: <FiUser /> },
            { path: '/admin/payments', name: 'Payment Reports', icon: <FiDollarSign /> },
            { path: '/admin/complaints', name: 'Complaint Reports', icon: <FiMessageSquare /> },
        ]
    };

    const currentLinks = navLinks[role] || [];

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="brand-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                    {!collapsed && <span className="brand-name">HMS</span>}
                </div>
                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label="Toggle Sidebar"
                >
                    <FiMenu />
                </button>
            </div>

            <div className="user-info">
                <div className="user-avatar">
                    {user?.login_id?.charAt(0)?.toUpperCase() || role.charAt(0)}
                </div>
                {!collapsed && (
                    <div className="user-details">
                        <span className="user-name">{user?.login_id || 'User'}</span>
                        <span className="user-role">{role}</span>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                <ul className="nav-list">
                    {currentLinks.map((link, index) => (
                        <li key={index} className="nav-item">
                            <NavLink
                                to={link.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                title={collapsed ? link.name : ''}
                                end
                            >
                                <span className="nav-icon">{link.icon}</span>
                                {!collapsed && <span className="nav-text">{link.name}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={handleLogout} title={collapsed ? "Logout" : ""}>
                    <FiLogOut className="nav-icon" />
                    {!collapsed && <span className="nav-text">Logout</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
