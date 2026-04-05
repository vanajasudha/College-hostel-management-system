import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiArrowLeft, FiCheck, FiInfo } from 'react-icons/fi';
import './AdminShared.css';

const WardenAllocate = () => {
    const navigate = useNavigate();
    
    // State
    const [rooms, setRooms] = useState([]);
    const [students, setStudents] = useState([]);
    
    // Form Selection State
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAllocationData();
    }, []);

    const fetchAllocationData = async () => {
        try {
            const [roomsRes, studentsRes] = await Promise.all([
                axios.get('/warden/allocate/rooms'),
                axios.get('/warden/allocate/students')
            ]);
            setRooms(roomsRes.data);
            setStudents(studentsRes.data);
        } catch (err) {
            console.error("Error fetching allocation data", err);
        }
    };

    const handleAllocate = async (e) => {
        e.preventDefault();
        
        if (!selectedStudent || !selectedRoom) {
            alert("Please select both a student and an available room.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.put('/warden/allocate/assign', {
                student_id: selectedStudent,
                new_room_id: selectedRoom
            });
            
            alert(res.data.message || "Room assigned successfully!");
            
            // Clear selections & Refresh Data live
            setSelectedStudent('');
            setSelectedRoom('');
            fetchAllocationData();
            
        } catch (err) {
            alert(err.response?.data?.message || "Failed to allocate room.");
        } finally {
            setIsSubmitting(false);
        }
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
                    <h1>Room Allocation</h1>
                    <p>Assign and transfer students securely within your hostel boundaries.</p>
                </div>
            </div>

            <div className="admin-grid-2">
                
                {/* ── ASSIGNMENT FORM ── */}
                <div className="admin-card">
                    <h3 className="admin-card-title">Transfer Student manually</h3>
                    <form className="admin-form" onSubmit={handleAllocate}>
                        
                        <div className="admin-form-group">
                            <label>Select Resident Student</label>
                            <select 
                                value={selectedStudent} 
                                onChange={e => setSelectedStudent(e.target.value)} 
                                required
                            >
                                <option value="">-- Choose Student --</option>
                                {students.map((s) => (
                                    <option key={s.student_id} value={s.student_id}>
                                        {s.name} ({s.roll_number}) 
                                        {s.room_id ? ' - Currently Assigned' : ' - Needs Room'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <label>Select Destination Room</label>
                            <select 
                                value={selectedRoom} 
                                onChange={e => setSelectedRoom(e.target.value)} 
                                required
                            >
                                <option value="">-- Choose Available Room --</option>
                                {rooms.map((r) => {
                                    const isFull = r.occupied_beds >= r.capacity;
                                    const isMaint = r.status === 'Maintenance';
                                    const disabled = isFull || isMaint;
                                    
                                    return (
                                        <option key={r.room_id} value={r.room_id} disabled={disabled}>
                                            Room {r.room_number} 
                                            {isMaint ? ' (Maintenance)' : isFull ? ' (Full/Waitlist)' : ` (${r.capacity - r.occupied_beds} Beds Open)`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <button 
                            type="submit" 
                            className="admin-btn-primary full-width"
                            disabled={isSubmitting}
                            style={{ opacity: isSubmitting ? 0.7 : 1 }}
                        >
                            <FiCheck /> {isSubmitting ? 'Transferring...' : 'Confirm Room Transfer'}
                        </button>
                    </form>
                </div>

                {/* ── RULES & VALIDATION ── */}
                <div className="admin-card bg-light">
                    <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiInfo color="#3b82f6" /> Allocation Guardrails
                    </h3>
                    <ul className="admin-rules-list" style={{ marginTop: '15px' }}>
                        <li><strong>Strict Capacity Checks:</strong> If a room is full, it cannot be legally selected from the dropdown menu.</li>
                        <li><strong>Safe Transactions:</strong> Choosing a new room automatically drops the student's slot in their old room securely.</li>
                        <li><strong>Hostel Lock:</strong> As Warden, you can only allocate combinations mapped inside your actual hostel assignment boundary. You cannot move a student to another Warden's building.</li>
                    </ul>
                </div>

            </div>

            {/* ── HOSTEL ROOM OVERVIEW TABLE ── */}
            <div className="admin-card" style={{ marginTop: '20px' }}>
                <h3 className="admin-card-title">Current Room Capacities</h3>
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Room Number</th>
                                <th>Total Capacity</th>
                                <th>Occupied Beds</th>
                                <th>Beds Available</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.length > 0 ? rooms.map((r) => (
                                <tr key={r.room_id}>
                                    <td><strong>{r.room_number}</strong></td>
                                    <td>{r.capacity} Beds</td>
                                    <td>{r.occupied_beds} Assigned</td>
                                    <td>
                                        {r.status === 'Maintenance' 
                                            ? <span style={{ color: '#ef4444' }}>Offline</span>
                                            : <strong>{r.capacity - r.occupied_beds}</strong>
                                        }
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            backgroundColor: r.status === 'Maintenance' ? '#fee2e2' : r.capacity <= r.occupied_beds ? '#ffedd5' : '#dcfce7',
                                            color: r.status === 'Maintenance' ? '#b91c1c' : r.capacity <= r.occupied_beds ? '#c2410c' : '#15803d'
                                        }}>
                                            {r.status === 'Maintenance' ? 'Maintenance' : r.capacity <= r.occupied_beds ? 'Full' : 'Available'}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                                        Loading capacity data...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default WardenAllocate;
