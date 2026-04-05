import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiTool, FiList, FiCheckCircle, FiClock, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import './StudentComplaints.css';

const STATUS_CFG = {
    resolved: { icon: <FiCheckCircle />, cls: 'resolved', label: 'Resolved' },
    pending: { icon: <FiClock />, cls: 'pending', label: 'Pending' },
};

const StudentComplaints = () => {
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const fetchComplaints = async () => {
        try {
            const res = await axios.get('/complaints/my');
            setComplaints(res.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchComplaints(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description.trim()) {
            setMsg({ type: 'error', text: 'Please describe your issue.' });
            return;
        }
        setSubmitting(true);
        setMsg({ type: '', text: '' });
        try {
            await axios.post('/complaints', { description });
            setMsg({ type: 'success', text: 'Complaint submitted! Our team will respond shortly.' });
            setDescription('');
            await fetchComplaints();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed. Try again.' });
        } finally { setSubmitting(false); }
    };

    if (loading) return <div className="sc-center"><div className="sc-spinner" /></div>;

    const open = complaints.filter(c => c.status?.toLowerCase() !== 'resolved').length;

    return (
        <div className="sc-page">
            <div className="sc-page-header">
                <div>
                    <h1>Maintenance &amp; Complaints</h1>
                    <p>Report issues and track the status of your requests</p>
                </div>
                <button className="page-close-btn" onClick={() => navigate('/student')} title="Back to Dashboard">×</button>
            </div>

            {/* Summary bar */}
            <div className="sc-summary-bar">
                <div className="sc-stat">
                    <FiList />
                    <span>{complaints.length} Total Raised</span>
                </div>
                <div className="sc-stat open">
                    <FiClock />
                    <span>{open} Open</span>
                </div>
                <div className="sc-stat resolved">
                    <FiCheckCircle />
                    <span>{complaints.length - open} Resolved</span>
                </div>
            </div>

            <div className="sc-grid">
                {/* Raise form */}
                <div className="sc-card">
                    <div className="sc-card-title"><FiTool /> Raise New Issue</div>

                    {msg.text && (
                        <div className={`sc-alert ${msg.type}`}>
                            {msg.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
                            {msg.text}
                        </div>
                    )}

                    <form className="sc-form" onSubmit={handleSubmit}>
                        <div className="sc-field">
                            <label>Describe the Problem</label>
                            <textarea
                                rows="6"
                                placeholder="e.g. Leaking tap in washroom, broken ceiling fan in room 204…"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="sc-submit-btn" disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Submit Complaint'}
                        </button>
                    </form>
                </div>

                {/* Ticket list */}
                <div className="sc-card tracker-card">
                    <div className="sc-card-title"><FiList /> My Tickets</div>
                    {complaints.length === 0 ? (
                        <p className="sc-empty">No complaints raised yet.</p>
                    ) : (
                        <div className="sc-ticket-list">
                            {complaints.map((c, i) => {
                                const st = c.status?.toLowerCase() === 'resolved' ? STATUS_CFG.resolved : STATUS_CFG.pending;
                                return (
                                    <div className="sc-ticket" key={c.complaint_id || i}>
                                        <div className="sc-ticket-top">
                                            <span className="sc-ticket-id">#{c.complaint_id}</span>
                                            <span className="sc-ticket-date">
                                                {new Date(c.complaint_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="sc-ticket-desc">{c.description}</p>
                                        <div className={`sc-badge ${st.cls}`}>{st.icon}{st.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentComplaints;
