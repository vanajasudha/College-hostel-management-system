import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    FiUsers, FiHome, FiAlertCircle,
    FiArrowRight, FiBarChart2, FiActivity,
    FiCheckCircle, FiSettings, FiBell, FiDollarSign, FiList
} from 'react-icons/fi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement, PointElement, LineElement, LineController
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './WardenDashboard.css';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, PointElement, LineElement, LineController
);

const WardenDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [kpiData, setKpiData] = useState(null);
    const [chartsData, setChartsData] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [kpiRes, analyticsRes, notifRes] = await Promise.all([
                    axios.get('/warden/dashboard/summary'),
                    axios.get('/warden/dashboard/analytics'),
                    axios.get('/warden/notifications')
                ]);
                setKpiData(kpiRes.data);
                setChartsData(analyticsRes.data);
                const notifData = Array.isArray(notifRes.data) ? notifRes.data : [];
                setNotifications(notifData.filter(n => !n.is_read));
            } catch (err) {
                console.error('Error fetching Warden Dashboard data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load dashboard data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const markAsRead = async (notif) => {
        const id = notif.notification_id || notif.id;
        try {
            await axios.put(`/warden/notifications/${id}/read`);
            setNotifications(prev => prev.filter(n => (n.notification_id || n.id) !== id));
        } catch (e) {
            console.error('markAsRead error:', e);
        }
    };

    if (error) return (
        <div className="admin-dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '28px 32px', borderRadius: '16px', textAlign: 'center', maxWidth: '420px', border: '1px solid #f87171' }}>
                <FiAlertCircle size={44} style={{ marginBottom: '14px' }} />
                <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: 700 }}>Dashboard Unavailable</h2>
                <p style={{ fontSize: '0.9rem', color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
        </div>
    );

    if (isLoading || !kpiData || !chartsData) return (
        <div className="admin-dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <FiActivity size={30} className="spinning-icon" />
                <p style={{ margin: 0, fontSize: '14px' }}>Loading dashboard data…</p>
            </div>
        </div>
    );

    const occupancyRate = kpiData.total_capacity > 0
        ? Math.round((kpiData.occupied_rooms / kpiData.total_capacity) * 100) : 0;

    const quickActions = [
        { label: 'Manage Students', desc: 'Profiles & reassignments', icon: <FiUsers />, path: '/warden/students', colorClass: 'qa-blue' },
        { label: 'Dues Management', desc: 'Generate & track payments', icon: <FiDollarSign />, path: '/warden/payments', colorClass: 'qa-green' },
        { label: 'All Payments', desc: 'Full payment history', icon: <FiList />, path: '/warden/all-payments', colorClass: 'qa-purple' },
        { label: 'Complaint Control', desc: 'Priority & assignment', icon: <FiCheckCircle />, path: '/warden/complaints', colorClass: 'qa-orange' },
        { label: 'Room Allocations', desc: 'Assign & manage rooms', icon: <FiHome />, path: '/warden/allocate', colorClass: 'qa-blue' },
        { label: 'Analytics', desc: 'Detailed complaint reports', icon: <FiBarChart2 />, path: '/warden/analytics', colorClass: 'qa-red' },
    ];

    const revenueConfig = {
        labels: chartsData.revenue?.map(t => t.month) || [],
        datasets: [{
            label: 'Revenue (₹)',
            data: chartsData.revenue?.map(t => t.revenue) || [],
            backgroundColor: 'rgba(16, 185, 129, 0.82)',
            hoverBackgroundColor: 'rgba(5, 150, 105, 1)',
            borderRadius: 5,
            barThickness: 18
        }]
    };

    const complaintConfig = {
        labels: chartsData.complaints?.map(t => t.month) || [],
        datasets: [{
            label: 'Complaints',
            data: chartsData.complaints?.map(t => t.count) || [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.35,
            fill: true,
            pointBackgroundColor: '#ef4444',
            pointRadius: 4
        }]
    };

    const paidDue   = chartsData.dues?.find(d => d.status === 'paid')?.amount    || kpiData.total_collected     || 0;
    const unpaidDue = chartsData.dues?.find(d => d.status === 'unpaid')?.amount  || kpiData.total_pending_dues   || 0;
    const duesDonut = {
        labels: ['Collected', 'Pending'],
        datasets: [{
            data: [paidDue, unpaidDue],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 6
        }]
    };

    const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    return (
        <div className="admin-dashboard-page">

            {/* ── Hero Banner ── */}
            <div className="admin-hero-banner">
                <div className="hero-content">
                    <h1 className="hero-title">Welcome back, {user?.login_id || 'Warden'} 👋</h1>
                    <p className="hero-subtitle">Here's the live operational snapshot for your hostel.</p>
                </div>
                <div className="hero-decoration">
                    <FiHome size={110} />
                </div>
            </div>

            {/* ── KPI Grid ── */}
            <div className="admin-kpi-grid">
                <div className="admin-kpi-card kpi-blue">
                    <div className="kpi-icon-wrapper"><FiUsers /></div>
                    <div className="kpi-info">
                        <h3 className="kpi-title">Active Residents</h3>
                        <span className="kpi-value">{kpiData.total_students}</span>
                        <span className="kpi-desc">Across {kpiData.total_rooms} rooms</span>
                    </div>
                </div>
                <div className="admin-kpi-card kpi-green">
                    <div className="kpi-icon-wrapper"><FiHome /></div>
                    <div className="kpi-info">
                        <h3 className="kpi-title">Occupancy Rate</h3>
                        <span className="kpi-value">{occupancyRate}%</span>
                        <span className="kpi-desc">{kpiData.occupied_rooms} / {kpiData.total_capacity} beds</span>
                    </div>
                </div>
                <div className="admin-kpi-card kpi-yellow">
                    <div className="kpi-icon-wrapper"><FiAlertCircle /></div>
                    <div className="kpi-info">
                        <h3 className="kpi-title">Pending Complaints</h3>
                        <span className="kpi-value">{kpiData.pending_complaints}</span>
                        <span className="kpi-desc">Require attention</span>
                    </div>
                </div>
                <div className="admin-kpi-card" style={{ borderTopColor: '#f59e0b' }}>
                    <div className="kpi-icon-wrapper" style={{ background: '#fffbeb', color: '#d97706' }}><FiDollarSign /></div>
                    <div className="kpi-info">
                        <h3 className="kpi-title">Total Arrears</h3>
                        <span className="kpi-value">₹{(kpiData.total_pending_dues || 0).toLocaleString()}</span>
                        <span className="kpi-desc">Outstanding fees</span>
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="admin-middle-section">
                <div className="admin-section-card qa-full-card">
                    <div className="section-header">
                        <h2><FiSettings className="section-icon" /> Core Operations</h2>
                        <span className="section-badge">Quick Access</span>
                    </div>
                    <div className="admin-qa-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {quickActions.map((qa, i) => (
                            <div className={`admin-qa-item ${qa.colorClass}`} key={i} onClick={() => navigate(qa.path)}>
                                <div className="qa-item-icon">{qa.icon}</div>
                                <div className="qa-item-content">
                                    <h4>{qa.label}</h4>
                                    <p>{qa.desc}</p>
                                </div>
                                <FiArrowRight className="qa-item-arrow" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Charts + Notifications ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>

                <div className="admin-section-card">
                    <div className="section-header">
                        <h2><FiBarChart2 className="section-icon" /> Revenue (6 mo)</h2>
                        <span className="section-badge chart-badge">Monthly</span>
                    </div>
                    <div className="admin-chart-wrapper bar-chart">
                        <Bar data={revenueConfig} options={chartOpts} />
                    </div>
                </div>

                <div className="admin-section-card">
                    <div className="section-header">
                        <h2><FiAlertCircle className="section-icon" /> Complaint Trend</h2>
                        <span className="section-badge chart-badge">Trend</span>
                    </div>
                    <div className="admin-chart-wrapper" style={{ height: '240px' }}>
                        <Line data={complaintConfig} options={chartOpts} />
                    </div>
                </div>

                <div className="admin-section-card">
                    <div className="section-header">
                        <h2><FiBell className="section-icon" /> Alerts</h2>
                        <span className="section-badge" style={{ background: notifications.length ? '#fee2e2' : '#f1f5f9', color: notifications.length ? '#b91c1c' : '#475569' }}>
                            {notifications.length} unread
                        </span>
                    </div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                        {notifications.length === 0
                            ? <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px 0', margin: 0 }}>No unread alerts.</p>
                            : notifications.map(n => (
                                <div key={n.notification_id || n.id} className="warden-notif-item">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 2px', fontSize: '12.5px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {n.message}
                                        </p>
                                        <small style={{ color: '#94a3b8', fontSize: '11px' }}>
                                            {new Date(n.created_at).toLocaleDateString()}
                                        </small>
                                    </div>
                                    <button onClick={() => markAsRead(n)} className="warden-clear-btn">Clear</button>
                                </div>
                            ))
                        }
                    </div>
                </div>

            </div>

            {/* ── Dues Economy ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '18px' }}>
                <div className="admin-section-card">
                    <div className="section-header">
                        <h2><FiDollarSign className="section-icon" /> Dues Economy</h2>
                        <span className="section-badge chart-badge">Live</span>
                    </div>
                    <div className="admin-chart-wrapper donut-chart">
                        <Doughnut data={duesDonut} options={{ responsive: true, maintainAspectRatio: false, cutout: '74%', plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                </div>

                <div className="admin-section-card">
                    <div className="section-header">
                        <h2>Hostel Summary</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {[
                            { label: 'Total Rooms',       value: kpiData.total_rooms,          color: '#3b82f6', bg: '#eff6ff' },
                            { label: 'Available Rooms',   value: kpiData.available_rooms,       color: '#10b981', bg: '#ecfdf5' },
                            { label: 'Maintenance',       value: kpiData.maintenance_rooms,     color: '#f59e0b', bg: '#fffbeb' },
                            { label: 'Total Collected',   value: `₹${(kpiData.total_collected || 0).toLocaleString()}`, color: '#8b5cf6', bg: '#f5f3ff' },
                        ].map((item, i) => (
                            <div key={i} style={{
                                background: item.bg,
                                border: `1px solid ${item.color}22`,
                                borderRadius: '12px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    {item.label}
                                </span>
                                <strong style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{item.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default WardenDashboard;
