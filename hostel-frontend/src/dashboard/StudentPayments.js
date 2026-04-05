import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiCreditCard, FiCalendar, FiCheckCircle, FiAlertCircle, FiTag } from 'react-icons/fi';
import './StudentPayments.css';

const StudentPayments = () => {
    const navigate = useNavigate();

    const [dues, setDues] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDue, setSelectedDue] = useState('');
    const [paymentType, setPaymentType] = useState('Monthly Dues');
    const [customAmount, setCustomAmount] = useState('');
    const [paymentCategory, setPaymentCategory] = useState('Hostel');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [processing, setProcessing] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const fetchData = async () => {
        setLoading(true);
        setMsg({ type: '', text: '' });
        try {
            const [duesRes, histRes] = await Promise.all([
                axios.get('/student/payment/due'),
                axios.get('/student/payment/'),
            ]);
            const duesList = duesRes.data.dueMonths || [];
            setDues(duesList);
            setHistory(histRes.data || []);

            const firstUnpaid = duesList.find(d => d.status === 'unpaid');
            setSelectedDue(firstUnpaid ? `${firstUnpaid.month}-${firstUnpaid.year}` : '');
        } catch (error) {
            console.error('StudentPayments fetchData error', error);
            setMsg({ type: 'error', text: 'Failed to load dues and payment data. Please try refreshing the page.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handlePay = async (e) => {
        e.preventDefault();

        if (!selectedDue || !paymentMethod) {
            setMsg({ type: 'error', text: 'Select a month and payment method.' });
            return;
        }

        const [month, year] = selectedDue.split('-');
        const due = dues.find(d => d.month === month && d.year === Number(year));
        if (!due) {
            setMsg({ type: 'error', text: 'Selected due is invalid.' });
            return;
        }

        if (due.status === 'paid') {
            setMsg({ type: 'error', text: 'Already paid.' });
            return;
        }

        if (!paymentType) {
            setMsg({ type: 'error', text: 'Select payment type.' });
            return;
        }

        if (paymentType === 'Custom Payment') {
            if (!customAmount || Number(customAmount) <= 0 || Number.isNaN(Number(customAmount))) {
                setMsg({ type: 'error', text: 'Enter a valid custom amount greater than 0.' });
                return;
            }

            if (!paymentCategory) {
                setMsg({ type: 'error', text: 'Select a payment category for custom payments.' });
                return;
            }
        }

        setProcessing(true);
        setMsg({ type: '', text: '' });

        try {
            const payload = {
                month,
                year: Number(year),
                method: paymentMethod,
                payment_type: paymentType,
                category: paymentType === 'Custom Payment' ? paymentCategory : 'Hostel',
            };
            if (paymentType === 'Custom Payment') {
                payload.amount = Number(customAmount);
            }

            const res = await axios.post('/student/payment/', payload);

            const amountPaid = res.data.amount ?? 0;
            const paymentDesc = paymentType === 'Custom Payment' ? 'custom payment' : 'monthly dues';
            setMsg({ type: 'success', text: `Payment of ₹${amountPaid} for ${res.data.month} ${res.data.year} (${paymentDesc}) successful! TXN: ${res.data.transaction_id}` });
            setPaymentType('Monthly Dues');
            setCustomAmount('');
            setPaymentMethod('');
            await fetchData();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.message || 'Payment failed. Try again.' });
        } finally { setProcessing(false); }
    };

    if (loading) return <div className="pay-center"><div className="pay-spinner" /></div>;

    return (
        <div className="pay-page">
            <div className="pay-page-header">
                <div>
                    <h1>Fee Payments</h1>
                    <p>Manage your hostel fee dues and view transaction history</p>
                </div>
                <button className="page-close-btn" onClick={() => navigate('/student')} title="Back to Dashboard">×</button>
            </div>

            <div className="pay-grid">
                {/* Pay Form */}
                <div className="pay-card">
                    <div className="pay-card-title">
                        <FiCreditCard /> Pay Dues
                    </div>

                    <form className="pay-form" onSubmit={handlePay}>
                        {msg.text && (
                            <div className={`pay-alert ${msg.type}`}>
                                {msg.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
                                {msg.text}
                            </div>
                        )}

                        <div className="pay-field">
                            <label>Month</label>
                            <select value={selectedDue} onChange={e => setSelectedDue(e.target.value)} required>
                                <option value="" disabled>Select month to pay</option>
                                {dues.filter(d => d.status !== 'paid').map(d => {
                                    const isOverdue = d.status === 'overdue';
                                    const dueDateText = d.due_date ? new Date(d.due_date).toLocaleDateString() : 'N/A';
                                    return (
                                        <option key={`${d.month}-${d.year}`} value={`${d.month}-${d.year}`}>
                                            {d.month} {d.year} - ₹{d.total_amount} {isOverdue ? '(OVERDUE)' : ''} - Due: {dueDateText}
                                        </option>
                                    );
                                })}
                                {dues.filter(d => d.status !== 'paid').length === 0 && (
                                    <option value="" disabled>All dues cleared ✓</option>
                                )}
                            </select>
                        </div>
                        <div className="pay-field">
                            <label>Payment Type</label>
                            <select value={paymentType} onChange={e => setPaymentType(e.target.value)} required>
                                <option value="Monthly Dues">Monthly Dues</option>
                                <option value="Custom Payment">Custom Payment</option>
                            </select>
                        </div>

                        {paymentType === 'Custom Payment' && (
                            <>
                                <div className="pay-field">
                                    <label>Custom Amount (₹)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                        placeholder="Enter custom amount"
                                        required
                                    />
                                </div>
                                <div className="pay-field">
                                    <label>Payment Category</label>
                                    <select value={paymentCategory} onChange={e => setPaymentCategory(e.target.value)} required>
                                        <option value="" disabled>Select category</option>
                                        <option value="Hostel">Hostel</option>
                                        <option value="Mess">Mess</option>
                                        <option value="Electricity">Electricity</option>
                                        <option value="Fine">Fine</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="pay-field">
                            <label>Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                                <option value="" disabled>Select method</option>
                                <option value="UPI">UPI / QR Code</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Debit Card">Debit Card</option>
                                <option value="Net Banking">Net Banking</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="pay-submit-btn"
                            disabled={processing || !selectedDue}
                        >
                            {processing ? 'Processing…' : dues.filter(d => d.status !== 'paid').length ?
                                (dues.find(d => `${d.month}-${d.year}` === selectedDue)?.status === 'overdue' ? 'Pay Overdue Amount' : 'Pay Now')
                                : 'All Dues Cleared ✓'}
                        </button>
                    </form>
                    <div className="pay-due-table">
                        <table className="pay-table">
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Hostel Fee</th>
                                    <th>Electricity</th>
                                    <th>Total</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dues.map((d) => {
                                    const hostelItem = d.items?.find(i => i.category === 'hostel');
                                    const elecItem = d.items?.find(i => i.category === 'electricity');
                                    const isOverdue = d.status === 'overdue';
                                    const isUnpaid = d.status === 'unpaid';
                                    return (
                                        <tr key={`${d.month}-${d.year}`}>
                                            <td>{d.month} {d.year}</td>
                                            <td>₹{hostelItem ? hostelItem.amount : 0}</td>
                                            <td>₹{elecItem ? elecItem.amount : 0}</td>
                                            <td>₹{d.total_amount}</td>
                                            <td>{d.due_date ? new Date(d.due_date).toLocaleDateString() : 'N/A'}</td>
                                            <td>
                                                {d.status === 'paid' ? (
                                                    <span style={{ color: '#4caf50' }}>Paid ✔</span>
                                                ) : isOverdue ? (
                                                    <span style={{ color: '#f44336', fontWeight: 'bold' }}>OVERDUE</span>
                                                ) : (
                                                    <span style={{ color: '#ff9800' }}>Unpaid</span>
                                                )}
                                            </td>
                                            <td>
                                                {isUnpaid || isOverdue ? (
                                                    <button type="button" onClick={() => setSelectedDue(`${d.month}-${d.year}`)}>
                                                        Pay Now
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#4caf50' }}>Done</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* History Table */}
                <div className="pay-card history-card">
                    <div className="pay-card-title">
                        <FiCalendar /> Transaction History
                    </div>
                    {history.length === 0 ? (
                        <p className="pay-empty">No transactions yet.</p>
                    ) : (
                        <div className="pay-table-wrap">
                            <table className="pay-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Month</th>
                                        <th>Payment Type</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>TXN ID</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((row, i) => (
                                        <tr key={i}>
                                            <td>{new Date(row.payment_date).toLocaleDateString()}</td>
                                            <td>{row.payment_month}</td>
                                            <td>
                                                <span className="pay-type-badge">
                                                    <FiTag style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                                    {row.payment_type || 'Hostel Fee'}
                                                </span>
                                            </td>
                                            <td>{row.category || 'Hostel'}</td>
                                            <td className="pay-amount">₹{row.amount}</td>
                                            <td>{row.method}</td>
                                            <td><code>{row.transaction_id}</code></td>
                                            <td>
                                                <span className={`pay-badge ${row.status?.toLowerCase()}`}>{row.status}</span>
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

export default StudentPayments;
