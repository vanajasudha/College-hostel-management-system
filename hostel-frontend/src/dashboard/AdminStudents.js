import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiPlus, FiEye, FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

const AdminStudents = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);

    useEffect(() => {
        axios.get('/admin/manage/students')
            .then(res => setStudents(res.data))
            .catch(err => console.error(err));
    }, []);

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
                    <h1>Manage Students</h1>
                    <p>View all student records and allocations system-wide</p>
                </div>
                <button className="admin-btn-primary">
                    <FiPlus /> Register Student
                </button>
            </div>

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Hostel</th>
                                <th>Room</th>
                                <th>Contact</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length > 0 ? students.map((s, i) => (
                                <tr key={s.student_id || i}>
                                    <td>{s.student_id}</td>
                                    <td>{s.name}</td>
                                    <td>{s.hostel_name || <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                                    <td>{s.room_number || '—'}</td>
                                    <td>{s.phone}</td>
                                    <td>
                                        <button className="admin-action-btn"><FiEye /> View</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>No students found in database.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminStudents;
