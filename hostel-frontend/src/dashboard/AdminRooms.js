import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiPlus, FiEdit, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiX, FiCheck } from 'react-icons/fi';
import './AdminShared.css';

const fetchRooms = () => axios.get('/admin/manage/rooms');

const AdminRooms = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [hostels, setHostels] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formError, setFormError] = useState('');

    const [roomNumber, setRoomNumber] = useState('');
    const [hostelId, setHostelId] = useState('');
    const [capacity, setCapacity] = useState('');
    const [status, setStatus] = useState('Available');
    const [occupiedCount, setOccupiedCount] = useState(0);

    const loadRooms = useCallback(() => {
        fetchRooms()
            .then(res => setRooms(res.data))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        loadRooms();
    }, [loadRooms]);

    useEffect(() => {
        axios.get('/admin/manage/hostels')
            .then(res => setHostels(res.data))
            .catch(err => console.error(err));
    }, []);

    const resetForm = () => {
        setRoomNumber('');
        setHostelId('');
        setCapacity('');
        setStatus('Available');
        setOccupiedCount(0);
        setEditingId(null);
        setFormError('');
    };

    const handleAddClick = () => {
        resetForm();
        setShowForm(true);
    };

    const handleEditClick = (r) => {
        setFormError('');
        setEditingId(r.room_id);
        setRoomNumber(String(r.room_number ?? ''));
        setHostelId(String(r.hostel_id ?? ''));
        setCapacity(String(r.capacity ?? ''));
        setStatus(r.status === 'Maintenance' ? 'Maintenance' : 'Available');
        setOccupiedCount(Number(r.occupied) || 0);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        const payload = {
            room_number: Number(roomNumber),
            capacity: Number(capacity),
            hostel_id: Number(hostelId),
            status
        };

        try {
            if (editingId) {
                await axios.put(`/admin/manage/rooms/${editingId}`, payload);
            } else {
                await axios.post('/admin/manage/rooms', payload);
            }
            setShowForm(false);
            resetForm();
            loadRooms();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Request failed';
            setFormError(typeof msg === 'string' ? msg : 'Request failed');
        }
    };

    const primaryHeaderAction = () => {
        if (showForm && !editingId) {
            setShowForm(false);
            resetForm();
        } else {
            handleAddClick();
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
                    <h1>Manage Rooms</h1>
                    <p>Track room capacities and maintenance statuses</p>
                </div>
                <button type="button" className="admin-btn-primary" onClick={primaryHeaderAction}>
                    {showForm && !editingId ? <><FiX /> Cancel</> : <><FiPlus /> Add New Room</>}
                </button>
            </div>

            {showForm && (
                <div className="admin-card bg-light" style={{ marginBottom: '20px' }}>
                    <h3 className="admin-card-title">{editingId ? 'Edit Room' : 'Add New Room'}</h3>
                    {formError && (
                        <p style={{ color: '#b91c1c', marginBottom: '12px', fontSize: '0.9rem' }}>{formError}</p>
                    )}
                    <form className="admin-grid-2" onSubmit={handleSubmit}>
                        <div className="admin-form-group">
                            <label>Room number</label>
                            <input
                                type="number"
                                value={roomNumber}
                                onChange={e => setRoomNumber(e.target.value)}
                                min="1"
                                required
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>Hostel</label>
                            <select
                                value={hostelId}
                                onChange={e => setHostelId(e.target.value)}
                                required
                                disabled={occupiedCount > 0}
                                title={occupiedCount > 0 ? 'Clear assignments before changing hostel' : undefined}
                            >
                                <option value="">Select hostel</option>
                                {hostels.map(h => (
                                    <option key={h.hostelId} value={h.hostelId}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label>Capacity (beds)</label>
                            <input
                                type="number"
                                value={capacity}
                                onChange={e => setCapacity(e.target.value)}
                                min={occupiedCount > 0 ? occupiedCount : 1}
                                required
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>Room status</label>
                            <select value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="Available">Available</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div className="admin-form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                            <button type="submit" className="admin-btn-primary">
                                <FiCheck /> {editingId ? 'Save Changes' : 'Create Room'}
                            </button>
                            <button
                                type="button"
                                className="admin-btn-secondary"
                                onClick={() => { setShowForm(false); resetForm(); }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="admin-card">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Room No</th>
                                <th>Hostel</th>
                                <th>Capacity</th>
                                <th>Occupied</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.length > 0 ? rooms.map((r, i) => (
                                <tr key={r.room_id || i}>
                                    <td>{r.room_number}</td>
                                    <td>{r.hostel_name}</td>
                                    <td>{r.capacity}</td>
                                    <td>{r.occupied}</td>
                                    <td>
                                        {r.status === 'Maintenance'
                                            ? <span className="admin-badge badge-orange"><FiAlertCircle /> Maintenance</span>
                                            : r.occupied >= r.capacity
                                                ? <span className="admin-badge badge-red"><FiCheckCircle /> Full</span>
                                                : <span className="admin-badge badge-green"><FiCheckCircle /> Available</span>
                                        }
                                    </td>
                                    <td>
                                        <button type="button" className="admin-action-btn" onClick={() => handleEditClick(r)}>
                                            <FiEdit /> Edit
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', color: '#64748b' }}>No rooms found in database.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminRooms;
