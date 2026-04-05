import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiDollarSign, FiDownload, FiInfo , FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

const AdminPayments = () => {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [loading, setLoading] = useState(true);

    // Generate form state
    const [hostels, setHostels] = useState([]);
    const [selectedHostel, setSelectedHostel] = useState('');
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear] = useState(new Date().getFullYear());
    const [hostelFee, setHostelFee] = useState(5200);
    const [elecFee, setElecFee] = useState(2600);
    const [generating, setGenerating] = useState(false);
    const [genMsg, setGenMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchPaymentData = async () => {
            try {
                // Fetch stats and history parallelly from new endpoints
                const [kpiRes, historyRes, hostelsRes] = await Promise.all([
                    axios.get('/payments/total'),
                    axios.get('/payments'),
                    axios.get('/admin/manage/hostels')
                ]);

                const total = kpiRes.data.total ?? kpiRes.data.total_revenue ?? 0;
                console.log("Payments API total response:", kpiRes.data);
                console.log("Payments API history response length:", (historyRes.data || []).length);

                setTotalRevenue(total);
                setPayments(Array.isArray(historyRes.data) ? historyRes.data : []);
                setHostels(hostelsRes.data || []);
            } catch (error) {
                console.error("Error fetching admin payments data:", error);
                setPayments([]);
                setHostels([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPaymentData();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenMsg({ type: '', text: '' });

        if (!selectedHostel || !month || !year || hostelFee == null || elecFee == null) {
            setGenMsg({ type: 'error', text: 'All fields are required.' });
            return;
        }

        if (isNaN(hostelFee) || isNaN(elecFee) || hostelFee < 0 || elecFee < 0) {
            setGenMsg({ type: 'error', text: 'Fees must be non-negative numbers.' });
            return;
        }

        setGenerating(true);
        try {
            const payload = {
                hostel_id: selectedHostel,
                month,
                year: Number(year),
                hostel_fee: Number(hostelFee),
                electricity_fee: Number(elecFee)
            };

            const res = await axios.post('/admin/payment/generate', payload);
            setGenMsg({ type: 'success', text: res.data.message });
            // Refresh payments if needed
        } catch (err) {
            setGenMsg({ type: 'error', text: err.response?.data?.message || 'Failed to generate dues.' });
        } finally {
            setGenerating(false);
        }
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
                    <h1>Payment Reports</h1>
                    <p>System-wide view of all student fee transactions</p>
                </div>
                <button className="admin-btn-secondary">
                    <FiDownload /> Export CSV
                </button>
            </div>

            <div className="admin-stats-row">
                <div className="admin-stat-card">
                    <div className="stat-icon"><FiDollarSign /></div>
                    <div className="stat-data">
                        <span>Total Collected</span>
                        <strong>{loading ? '...' : formatCurrency(totalRevenue)}</strong>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <h3>Generate Monthly Dues</h3>
                {genMsg.text && (
                    <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', background: genMsg.type === 'success' ? '#dcfce7' : '#fee2e2', color: genMsg.type === 'success' ? '#166534' : '#991b1b' }}>
                        {genMsg.text}
                    </div>
                )}
                <form onSubmit={handleGenerate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Hostel</label>
                        <select value={selectedHostel} onChange={e => setSelectedHostel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required>
                            <option value="">Select Hostel</option>
                            {hostels.map(h => (
                                <option key={h.hostelId} value={h.hostelId}>{h.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Month</label>
                        <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required>
                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Year</label>
                        <input type="number" min={2024} value={year} onChange={e => setYear(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Hostel Fee (₹)</label>
                        <input type="number" min={0} value={hostelFee} onChange={e => setHostelFee(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Electricity Fee (₹)</label>
                        <input type="number" min={0} value={elecFee} onChange={e => setElecFee(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} required />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end' }}>
                        <button type="submit" disabled={generating} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            {generating ? 'Generating...' : 'Generate Dues'}
                        </button>
                    </div>
                </form>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Total per student: ₹{(Number(hostelFee) + Number(elecFee)).toLocaleString()}</p>
            </div>

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Refreshing History...</div>
                    ) : payments.length === 0 ? (
                        <div className="empty-state">
                            <FiInfo size={40} />
                            <h3>No payments found</h3>
                            <p>No transactions have been recorded in the system yet.</p>
                        </div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Student</th>
                                    <th>Month</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, i) => (
                                    <tr key={i}>
                                        <td>#{p.transaction_id || `TXN-800${i}`}</td>
                                        <td>{p.student_name}</td>
                                        <td>{p.month}</td>
                                        <td>{p.category || 'Hostel'}</td>
                                        <td>{formatCurrency(p.amount)}</td>
                                        <td>{p.method}</td>
                                        <td>
                                            <span className={`admin-badge ${p.status === 'Paid' ? 'badge-green' : 'badge-orange'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>{formatDate(p.payment_date)}</td>
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

export default AdminPayments;
