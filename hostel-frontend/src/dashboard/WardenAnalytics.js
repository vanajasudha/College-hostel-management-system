import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FiBarChart2, FiCheckCircle, FiClock, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const WardenAnalytics = () => {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState({
        total_complaints: 0,
        pending: 0,
        resolved: 0,
        monthly_trends: []
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get('/warden/complaints/analytics');
                setAnalytics(res.data);
            } catch (err) {
                console.error("Error fetching warden analytics", err);
            }
        };
        fetchAnalytics();
    }, []);

    const chartData = {
        labels: analytics.monthly_trends.map(t => t.month) || [],
        datasets: [
            {
                label: 'Complaints Logged',
                data: analytics.monthly_trends.map(t => t.total) || [],
                backgroundColor: 'rgba(56, 189, 248, 0.8)',
                borderRadius: 4
            }
        ]
    };

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <button 
                        onClick={() => navigate('/warden')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            padding: '0',
                            marginBottom: '10px'
                        }}
                    >
                        <FiArrowLeft /> Back to Dashboard
                    </button>
                    <h1>System Analytics</h1>
                    <p>Operational data and complaint trends for your assigned hostel</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '12px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', fontSize: '1.5rem' }}>
                        <FiBarChart2 />
                    </div>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>TOTAL COMPLAINTS</p>
                        <h2 style={{ color: '#0f172a', margin: 0 }}>{analytics.total_complaints}</h2>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '12px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', fontSize: '1.5rem' }}>
                        <FiClock />
                    </div>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>PENDING ISSUES</p>
                        <h2 style={{ color: '#0f172a', margin: 0 }}>{analytics.pending}</h2>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '12px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', fontSize: '1.5rem' }}>
                        <FiCheckCircle />
                    </div>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>RESOLVED ISSUES</p>
                        <h2 style={{ color: '#0f172a', margin: 0 }}>{analytics.resolved}</h2>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Monthly Complaint Volume</h3>
                <div style={{ height: '300px' }}>
                    <Bar
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default WardenAnalytics;
