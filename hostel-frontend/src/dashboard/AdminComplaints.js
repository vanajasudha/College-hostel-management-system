import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiFilter, FiCheckCircle, FiClock, FiInfo , FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

const AdminComplaints = () => {
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchComplaints = async () => {
            try {
                const res = await axios.get('/admin/manage/complaints/history');
                setComplaints(res.data || []);
            } catch (error) {
                console.error("Error fetching admin complaints history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchComplaints();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <button 
                        onClick={() => navigate('/admin')}
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
                    <h1>Complaint Reports</h1>
                    <p>Track and overview maintenance tickets across all hostels</p>
                </div>
                <button className="admin-btn-secondary">
                    <FiFilter /> Filter Issues
                </button>
            </div>

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Refreshing Tickets...</div>
                    ) : complaints.length === 0 ? (
                        <div className="empty-state">
                            <FiInfo size={40} />
                            <h3>No complaints found</h3>
                            <p>No maintenance tickets have been recorded in the system yet.</p>
                        </div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>Student</th>
                                    <th>Hostel & Room</th>
                                    <th>Issue Description</th>
                                    <th>Status</th>
                                    <th>Logged Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.map((c, i) => (
                                    <tr key={i}>
                                        <td>#TKT-{c.complaint_id || `90${i}`}</td>
                                        <td>{c.student_name}</td>
                                        <td>{c.hostel_name} - {c.room_number || 'Unassigned'}</td>
                                        <td>{c.description}</td>
                                        <td>
                                            <span className={`admin-badge ${c.status === 'Resolved' ? 'badge-green' : 'badge-orange'}`}>
                                                {c.status === 'Resolved' ? <FiCheckCircle /> : <FiClock />} {c.status}
                                            </span>
                                        </td>
                                        <td>{formatDate(c.complaint_date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminComplaints;
