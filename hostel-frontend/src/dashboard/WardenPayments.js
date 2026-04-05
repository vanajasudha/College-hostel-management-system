import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiDollarSign, FiAlertCircle, FiCheckCircle, FiPlus, FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

const WardenPayments = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [unpaidStudents, setUnpaidStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear]   = useState(new Date().getFullYear());
    const [hostelFee, setHostelFee] = useState(5200);
    const [elecFee, setElecFee]     = useState(2600);
    const [submitting, setSubmitting] = useState(false);

    const wardenHostelId = user?.hostel_id;

    const loadData = async () => {
        setLoading(true);
        setMsg({ type: '', text: '' });
        try {
            const res = await axios.get('/warden/payment/unpaid-students');
            setUnpaidStudents(res.data || []);
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to load dues data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });

        if (!wardenHostelId) {
            setMsg({ type: 'error', text: 'Hostel not assigned. Please contact admin.' });
            return;
        }
        if (!month || !year || hostelFee == null || elecFee == null) {
            setMsg({ type: 'error', text: 'All fields are required.' });
            return;
        }
        if (isNaN(hostelFee) || isNaN(elecFee) || Number(hostelFee) < 0 || Number(elecFee) < 0) {
            setMsg({ type: 'error', text: 'Fees must be non-negative numbers.' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await axios.post('/warden/payment/generate-dues', {
                month, year: Number(year),
                hostel_fee: Number(hostelFee),
                electricity_fee: Number(elecFee)
            });
            setMsg({ type: 'success', text: res.data.message });
            await loadData();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to generate dues.' });
        } finally {
            setSubmitting(false);
        }
    };

    const sendReminder = async (student_id) => {
        try {
            await axios.post('/notifications', {
                student_id,
                title: 'Pending Dues Reminder',
                message: 'Please pay your pending hostel dues as soon as possible.',
                type: 'fee',
            });
            setMsg({ type: 'success', text: `Reminder sent to student ID ${student_id}` });
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send reminder' });
        }
    };

    return (
        <div className="admin-page">

            {/* Header */}
            <div className="admin-page-header">
                <div>
                    <button onClick={() => navigate('/warden')} style={{
                        background: 'transparent', border: 'none', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        cursor: 'pointer', fontSize: '13.5px', fontWeight: 600,
                        padding: 0, marginBottom: '10px', fontFamily: 'Inter, sans-serif'
                    }}>
                        <FiArrowLeft /> Back to Dashboard
                    </button>
                    <h1>Manage Dues</h1>
                    <p>Generate monthly dues and track unpaid balances for your hostel</p>
                </div>
            </div>

            {/* Hostel info banner */}
            {wardenHostelId && (
                <div className="admin-alert info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiDollarSign />
                    Generating dues for Hostel ID: <strong>{wardenHostelId}</strong>
                </div>
            )}

            {/* Alert */}
            {msg.text && (
                <div className={`admin-alert ${msg.type}`}>
                    {msg.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                    {msg.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '20px' }}>

                {/* Generate Form */}
                <div className="admin-card">
                    <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiPlus style={{ color: '#3b82f6' }} /> Generate Monthly Dues
                    </h3>

                    <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                <label>Month</label>
                                <select value={month} onChange={e => setMonth(e.target.value)}>
                                    {['January','February','March','April','May','June','July','August','September','October','November','December']
                                        .map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                <label>Year</label>
                                <input type="number" min={2024} value={year} onChange={e => setYear(e.target.value)} required />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                <label>Hostel Fee (₹)</label>
                                <input type="number" min={0} value={hostelFee} onChange={e => setHostelFee(e.target.value)} required />
                            </div>
                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                <label>Electricity Fee (₹)</label>
                                <input type="number" min={0} value={elecFee} onChange={e => setElecFee(e.target.value)} required />
                            </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e8edf3' }}>
                            Total per student: <strong style={{ color: '#1e293b' }}>₹{(Number(hostelFee) + Number(elecFee)).toLocaleString()}</strong> for {month} {year}
                        </p>

                        <button type="submit" disabled={submitting} className="admin-btn-primary full-width">
                            {submitting ? 'Generating…' : 'Generate Dues'}
                        </button>
                    </form>
                </div>

                {/* Unpaid Students Table */}
                <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', background: '#fafcff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiAlertCircle style={{ color: '#f59e0b' }} /> Unpaid Dues
                        </h3>
                        <span className="admin-badge badge-orange">{unpaidStudents.length} records</span>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading dues data…</div>
                    ) : unpaidStudents.length === 0 ? (
                        <div className="empty-state">
                            <FiCheckCircle size={44} style={{ color: '#10b981' }} />
                            <h3>All dues cleared!</h3>
                            <p>No outstanding dues for this hostel.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', maxHeight: '480px', overflowY: 'auto' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Room</th>
                                        <th>Month</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unpaidStudents.map((d, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.name}</div>
                                                <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{d.roll_number}</div>
                                            </td>
                                            <td>{d.room_number || '—'}</td>
                                            <td>{d.month} {d.year}</td>
                                            <td style={{ fontWeight: 700, color: '#dc2626' }}>₹{Number(d.total_amount).toLocaleString()}</td>
                                            <td>
                                                <span className={`admin-badge ${d.status === 'overdue' ? 'badge-red' : 'badge-orange'}`}>
                                                    {d.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="admin-btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}
                                                    onClick={() => sendReminder(d.student_id)}>
                                                    Remind
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WardenPayments;
