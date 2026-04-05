import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck , FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

const AdminAllocate = () => {
    const navigate = useNavigate();
    const [student, setStudent] = useState('');
    const [hostel, setHostel] = useState('');
    const [room, setRoom] = useState('');

    const handleAllocate = (e) => {
        e.preventDefault();
        alert('Room allocation simulated');
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
                    <h1>Allocate Rooms</h1>
                    <p>Assign or reassign students to specific rooms</p>
                </div>
            </div>

            <div className="admin-grid-2">
                <div className="admin-card">
                    <h3 className="admin-card-title">New Allocation</h3>
                    <form className="admin-form" onSubmit={handleAllocate}>
                        <div className="admin-form-group">
                            <label>Select Student</label>
                            <select value={student} onChange={e => setStudent(e.target.value)} required>
                                <option value="">-- Choose Student --</option>
                                <option value="CSE2023001">Rahul Sharma (CSE2023001)</option>
                                <option value="ECE2023045">Priya Patel (ECE2023045)</option>
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <label>Select Hostel</label>
                            <select value={hostel} onChange={e => setHostel(e.target.value)} required>
                                <option value="">-- Choose Hostel --</option>
                                <option value="H1">Boys Hostel Block A</option>
                                <option value="H2">Girls Hostel Block B</option>
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <label>Select Available Room</label>
                            <select value={room} onChange={e => setRoom(e.target.value)} required>
                                <option value="">-- Choose Room --</option>
                                <option value="101">101 (2 Beds Available)</option>
                                <option value="102">102 (1 Bed Available)</option>
                            </select>
                        </div>

                        <button type="submit" className="admin-btn-primary full-width">
                            <FiCheck /> Confirm Allocation
                        </button>
                    </form>
                </div>

                <div className="admin-card bg-light">
                    <h3 className="admin-card-title">Allocation Rules</h3>
                    <ul className="admin-rules-list">
                        <li>Students can only be assigned to hostels matching their gender.</li>
                        <li>Rooms marked as 'Maintenance' cannot be allocated.</li>
                        <li>Reassigning a student will automatically free up their previous bed.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminAllocate;
