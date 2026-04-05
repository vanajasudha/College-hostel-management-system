import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiSearch, FiArrowLeft, FiUser, FiHome, FiDollarSign, FiAlertCircle, FiX } from 'react-icons/fi';
import './AdminShared.css';

const WardenStudents = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalView, setModalView] = useState(''); // 'profile', 'reassign', 'dues', 'complaints'
    const [activeStudent, setActiveStudent] = useState(null);
    const [detailedData, setDetailedData] = useState(null);
    
    // Reassign Specific State
    const [availableRooms, setAvailableRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/warden/students');
            setStudents(res.data);
        } catch (err) {
            console.error("Error fetching warden's students", err);
        }
    };

    const openModal = async (student, view) => {
        setActiveStudent(student);
        setModalView(view);
        setModalOpen(true);
        setDetailedData(null);
        
        try {
            const res = await axios.get(`/warden/students/${student.student_id}`);
            setDetailedData(res.data);
            
            if (view === 'reassign') {
                const roomRes = await axios.get('/warden/allocate/rooms');
                setAvailableRooms(roomRes.data.filter(r => r.occupied_beds < r.capacity && r.status !== 'Maintenance'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReassign = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await axios.put('/warden/allocate/assign', {
                student_id: activeStudent.student_id,
                new_room_id: selectedRoom
            });
            alert('Room Reassigned Successfully');
            setModalOpen(false);
            fetchStudents();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to assign room");
        } finally {
            setUpdating(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const term = searchTerm.toLowerCase();
        return (
            (s.name && s.name.toLowerCase().includes(term)) ||
            (s.student_id && s.student_id.toString().toLowerCase().includes(term)) ||
            (s.room_number && s.room_number.toString().toLowerCase().includes(term))
        );
    });

    return (
        <div className="admin-page" style={{ position: 'relative' }}>
            <div className="admin-page-header">
                <div>
                    <button onClick={() => navigate('/warden')} style={{ background: 'transparent', border: 'none', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', padding: '0', marginBottom: '10px' }}>
                        <FiArrowLeft /> Back to Dashboard
                    </button>
                    <h1>Manage Students</h1>
                    <p>Deep dive profiles, financials, and spatial configurations</p>
                </div>
                <div className="admin-search-bar" style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <FiSearch style={{ color: '#94a3b8', marginRight: '8px' }} />
                    <input type="text" placeholder="Search name, ID or room..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', width: '250px' }} />
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Student Name</th>
                                <th>Room</th>
                                <th>Contact</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((s, i) => (
                                    <tr key={i}>
                                        <td><strong>{s.student_id}</strong></td>
                                        <td>{s.name}</td>
                                        <td>{s.room_number ? s.room_number : <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                                        <td>{s.phone}</td>
                                        <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => openModal(s, 'profile')} style={{ padding: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="View Profile"><FiUser size={16}/></button>
                                            <button onClick={() => openModal(s, 'reassign')} style={{ padding: '6px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Reassign Room"><FiHome size={16}/></button>
                                            <button onClick={() => openModal(s, 'dues')} style={{ padding: '6px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="View Dues"><FiDollarSign size={16}/></button>
                                            <button onClick={() => openModal(s, 'complaints')} style={{ padding: '6px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="View Complaints"><FiAlertCircle size={16}/></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>No matching students found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Overlay */}
            {modalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', width: '500px', borderRadius: '12px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                        <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><FiX size={24} /></button>
                        
                        <h2 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>{activeStudent.name}</h2>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>{modalView.toUpperCase()} PANEL • Room: {activeStudent.room_number || 'None'}</p>

                        {!detailedData ? <p>Loading metadata...</p> : (
                            <>
                                {modalView === 'profile' && (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px' }}><small style={{color:'#64748b', display:'block'}}>Email</small>{detailedData.email}</div>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px' }}><small style={{color:'#64748b', display:'block'}}>Phone</small>{detailedData.phone}</div>
                                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px' }}><small style={{color:'#64748b', display:'block'}}>Active Room</small>{detailedData.room_number || 'Unallocated'}</div>
                                    </div>
                                )}

                                {modalView === 'reassign' && (
                                    <form onSubmit={handleReassign}>
                                        <p style={{ marginBottom: '12px', color: '#334155' }}>Select an available room to reallocate the student.</p>
                                        <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                                            <option value="" disabled>-- Available Rooms --</option>
                                            {availableRooms.map(r => (
                                                <option key={r.room_id} value={r.room_id}>Room {r.room_number} (Capacity: {r.occupied_beds}/{r.capacity})</option>
                                            ))}
                                        </select>
                                        <button type="submit" disabled={updating} style={{ width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            {updating ? 'Committing...' : 'Confirm Reassignment'}
                                        </button>
                                    </form>
                                )}

                                {modalView === 'dues' && (
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {detailedData.dues.length === 0 ? <p>No financial history mapped.</p> :
                                            detailedData.dues.map((d, i) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                                    <div>
                                                        <span style={{ display: 'block', fontWeight: 'bold', color: '#1e293b' }}>{d.category}</span>
                                                        <small style={{ color: '#64748b' }}>{d.month} {d.year}</small>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ display: 'block', color: d.status === 'paid' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>₹{d.amount}</span>
                                                        <small style={{ color: '#64748b', textTransform: 'capitalize' }}>{d.status}</small>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}

                                {modalView === 'complaints' && (
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {detailedData.complaints.length === 0 ? <p>No complaints history mapped.</p> :
                                            detailedData.complaints.map((c, i) => (
                                                <div key={i} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{new Date(c.complaint_date).toLocaleDateString()}</span>
                                                        <span style={{ background: c.status === 'Resolved' ? '#dcfce7' : '#fef3c7', color: c.status === 'Resolved' ? '#166534' : '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>{c.status}</span>
                                                    </div>
                                                    <p style={{ margin: 0, color: '#475569', fontSize: '13px' }}>{c.description}</p>
                                                    <small style={{ color: '#ef4444', fontWeight: '500' }}>Priority: {c.priority}</small>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WardenStudents;
