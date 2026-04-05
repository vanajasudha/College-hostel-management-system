import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
    FiHome, FiUsers, FiDollarSign, FiMessageSquare,
    FiActivity, FiPieChart, FiTrendingUp, FiCheckCircle,
    FiSettings, FiArrowRight, FiTool, FiUser
} from 'react-icons/fi';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement, LineElement, PointElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import './WardenDashboard.css';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
    ArcElement, LineElement, PointElement
);

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [kpiData, setKpiData] = useState({
        totalHostels: 0, totalRooms: 0, totalStudents: 0,
        occupancy: 0, totalPayments: '₹0', totalComplaints: 0
    });

    const [chartData, setChartData] = useState({
        occupancyDistribution: [],
        monthlyPayments: []
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [kpiRes, chartsRes] = await Promise.all([
                    axios.get('/admin/dashboard/kpi'),
                    axios.get('/admin/dashboard/charts')
                ]);
                setKpiData(kpiRes.data);
                setChartData(chartsRes.data);
            } catch (err) {
                console.error('Error fetching admin dashboard metrics:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const kpiCards = [
        { title: 'Total Hostels',   value: kpiData.totalHostels,    desc: 'Registered buildings',  icon: <FiHome />,         colorClass: 'kpi-blue'   },
        { title: 'Total Rooms',     value: kpiData.totalRooms,      desc: 'Tracked in system',     icon: <FiCheckCircle />,  colorClass: 'kpi-green'  },
        { title: 'Total Students',  value: kpiData.totalStudents,   desc: 'Active records',        icon: <FiUsers />,        colorClass: 'kpi-yellow' },
        { title: 'Occupancy',       value: `${kpiData.occupancy}%`, desc: 'System-wide average',   icon: <FiActivity />,     colorClass: 'kpi-blue'   },
        { title: 'Revenue Collected', value: kpiData.totalPayments, desc: 'Total payments',        icon: <FiDollarSign />,   colorClass: 'kpi-green'  },
        { title: 'Complaints',      value: kpiData.totalComplaints, desc: 'Lifetime tickets',      icon: <FiMessageSquare />,colorClass: 'kpi-red'    },
    ];

    const quickActions = [
        { label: 'Manage Hostels',   desc: 'Add & configure hostels',   icon: <FiHome />,         path: '/admin/hostels',    colorClass: 'qa-blue'   },
        { label: 'Manage Rooms',     desc: 'Rooms & capacity',          icon: <FiTool />,         path: '/admin/rooms',      colorClass: 'qa-green'  },
        { label: 'Manage Students',  desc: 'Student records',           icon: <FiUsers />,        path: '/admin/students',   colorClass: 'qa-yellow' },
        { label: 'Room Allocation',  desc: 'Assign rooms to students',  icon: <FiUser />,         path: '/admin/allocate',   colorClass: 'qa-purple' },
        { label: 'Payment Reports',  desc: 'Generate & view dues',      icon: <FiDollarSign />,   path: '/admin/payments',   colorClass: 'qa-green'  },
        { label: 'Complaint Reports',desc: 'View & manage complaints',  icon: <FiMessageSquare />,path: '/admin/complaints', colorClass: 'qa-orange' },
        { label: 'Hostels Dashboard',desc: 'Hostel management panel',   icon: <FiHome />,         path: '/admin/hostels',    colorClass: 'qa-blue'   },
    ];

    const monthlyLabels = chartData.monthlyPayments.map(r => r.month || r.payment_month);
    const monthlyValues = chartData.monthlyPayments.map(r => Number(r.monthly_revenue || r.total || 0));

    const barChartData = {
        labels: monthlyLabels,
        datasets: [{
            label: 'Revenue (₹)',
            data: monthlyValues,
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 5,
        }]
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { precision: 0 } },
            x: { grid: { display: false } }
        }
    };

    const dLabels = chartData.occupancyDistribution.map(
        r => `${r.hostel_name} (${r.occupied_rooms}/${r.total_rooms})`
    );
    const dValues = chartData.occupancyDistribution.map(r => r.occupied_rooms);

    const doughnutData = {
        labels: dLabels,
        datasets: [{
            data: dValues,
            backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff',
            hoverOffset: 5
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
            legend: { position: 'right', labels: { font: { size: 12 }, padding: 14 } }
        }
    };

    return (
        <div className="admin-dashboard-page">

            {/* ── Hero ── */}
            <div className="admin-hero-banner" style={{ background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #1c1917 100%)' }}>
                <div className="hero-content">
                    <h1 className="hero-title">System Administrator Portal</h1>
                    <p className="hero-subtitle">
                        Managing {loading ? '…' : kpiData.totalStudents} students across {loading ? '…' : kpiData.totalHostels} hostels.
                    </p>
                </div>
                <div className="hero-decoration">
                    <FiTrendingUp size={115} />
                </div>
            </div>

            {/* ── KPI Grid ── */}
            <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {kpiCards.map((card, i) => (
                    <div className={`admin-kpi-card ${card.colorClass}`} key={i}>
                        <div className="kpi-icon-wrapper">{card.icon}</div>
                        <div className="kpi-info">
                            <h3 className="kpi-title">{card.title}</h3>
                            <div className="kpi-value-row">
                                <span className="kpi-value">{loading ? '—' : card.value}</span>
                            </div>
                            <span className="kpi-desc">{card.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Quick Actions ── */}
            <div className="admin-middle-section">
                <div className="admin-section-card qa-full-card">
                    <div className="section-header">
                        <h2><FiSettings className="section-icon" /> System Management</h2>
                        <span className="section-badge">Quick Access</span>
                    </div>
                    <div className="admin-qa-grid">
                        {quickActions.slice(0, 6).map((qa, i) => (
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

            {/* ── Charts ── */}
            <div className="admin-charts-grid">
                <div className="admin-section-card">
                    <div className="section-header">
                        <h2><FiPieChart className="section-icon" /> Occupancy Distribution</h2>
                    </div>
                    <div className="admin-chart-wrapper donut-chart">
                        <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                </div>
                <div className="admin-section-card">
                    <div className="section-header">
                        <h2><FiDollarSign className="section-icon" /> Monthly Revenue</h2>
                        <span className="section-badge chart-badge">Trend</span>
                    </div>
                    <div className="admin-chart-wrapper bar-chart">
                        <Bar data={barChartData} options={barOptions} />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;
