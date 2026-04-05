import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiSearch, FiFilter, FiArrowLeft, FiEdit3, FiX } from 'react-icons/fi';
import './AdminShared.css';

const WardenComplaints = () => {
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // Modal state
    const [activeComplaint, setActiveComplaint] = useState(null);
    const [formData, setFormData] = useState({ status: 'Pending', priority: 'low', assigned_to: '', remarks: '' });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const res = await axios.get('/warden/complaints');
            setComplaints(res.data);
        } catch (err) {
            console.error("Error fetching warden's complaints", err);
        }
    };

    const openModal = (c) => {
        setActiveComplaint(c);
        setFormData({
            status: c.status || 'Pending',
            priority: c.priority || 'low',
            assigned_to: c.assigned_to || '',
            remarks: c.remarks || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await axios.put(`/warden/complaints/${activeComplaint.complaint_id}`, formData);
            setActiveComplaint(null);
            fetchComplaints();
        } catch (err) {
            console.error(err);
            alert("Failed to update complaint constraints.");
        } finally {
            setUpdating(false);
        }
    };

    const filteredComplaints = complaints.filter(c => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.complaint_id && c.complaint_id.toString().toLowerCase().includes(term)) ||
            (c.room_number && c.room_number.toString().toLowerCase().includes(term)) ||
            (c.description && c.description.toLowerCase().includes(term));

        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getPriorityColor = (p) => {
        if(p === 'high') return '#ef4444';
        if(p === 'medium') return '#f59e0b';
        return '#10b981';
    };

    return (
        <div className="admin-page" style={{ position: 'relative' }}>
            <div className="admin-page-header">
                <div>
                    <button onClick={() => navigate('/warden')} style={{ background: 'transparent', border: 'none', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', padding: '0', marginBottom: '10px' }}>
                        <FiArrowLeft /> Back to Dashboard
                    </button>
                    <h1>Complaints Control</h1>
                    <p>Assign tasks, set priorities, and track resolution metrics</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="admin-search-bar" style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <FiSearch style={{ color: '#94a3b8', marginRight: '8px' }} />
                        <input type="text" placeholder="Search issues, IDs, rooms..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', width: '220px' }} />
                    </div>
                    <div className="admin-filter" style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <FiFilter style={{ color: '#94a3b8', marginRight: '8px' }} />
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', color: '#334155' }}>
                            <option value="All">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Resident</th>
                                <th>Room</th>
                                <th>Priority</th>
                                <th style={{ width: '30%' }}>Nature of Issue</th>
                                <th>Assigned To</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredComplaints.length > 0 ? (
                                filteredComplaints.map((c, i) => (
                                    <tr key={i}>
                                        <td><strong>#{c.complaint_id}</strong></td>
                                        <td>{c.name}</td>
                                        <td>{c.room_number ? c.room_number : <span style={{ color: '#94a3b8' }}>N/A</span>}</td>
                                        <td><span style={{ color: getPriorityColor(c.priority), fontWeight: 'bold', textTransform: 'capitalize' }}>{c.priority || 'Unset'}</span></td>
                                        <td>{c.description}</td>
                                        <td><span style={{ color: c.assigned_to ? '#1e293b' : '#94a3b8' }}>{c.assigned_to || 'Unassigned'}</span></td>
                                        <td>
                                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: c.status === 'Resolved' ? '#dcfce7' : '#fef3c7', color: c.status === 'Resolved' ? '#166534' : '#d97706' }}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button onClick={() => openModal(c)} style={{ padding: '6px 12px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FiEdit3 /> Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                                        {complaints.length === 0 ? "Fantastic! No active complaints logged." : "No matching complaints found."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resolution Modal Overlay */}
            {activeComplaint && (
                 <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ background: '#fff', width: '500px', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                         <button onClick={() => setActiveComplaint(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={24} /></button>
                         
                         <h2 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>Complaint #{activeComplaint.complaint_id}</h2>
                         <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>Resident: {activeComplaint.name} (Room {activeComplaint.room_number})</p>

                         <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', color: '#334155' }}>
                             <strong>Issue:</strong> {activeComplaint.description}
                         </div>

                         <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                     <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Status</label>
                                     <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                         <option>Pending</option>
                                         <option>Resolved</option>
                                     </select>
                                 </div>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                     <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Priority Level</label>
                                     <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                         <option value="low">Low</option>
                                         <option value="medium">Medium</option>
                                         <option value="high">Urgent</option>
                                     </select>
                                 </div>
                             </div>

                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                 <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Assign Technician / Staff</label>
                                 <input type="text" value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} placeholder="e.g. John (Plumber)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                             </div>

                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                 <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Internal Remarks</label>
                                 <textarea value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} placeholder="Add resolution notes..." rows="3" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}></textarea>
                             </div>

                             <button type="submit" disabled={updating} style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                                 {updating ? 'Saving...' : 'Commit Changes'}
                             </button>
                         </form>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default WardenComplaints;
