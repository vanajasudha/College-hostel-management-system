import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiPlus, FiEdit, FiX, FiCheck, FiArrowLeft } from 'react-icons/fi';
import './AdminShared.css';

const AdminHostels = () => {
    const navigate = useNavigate();
    const [hostels, setHostels] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form States
    const [hostelId, setHostelId] = useState('');
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [gender, setGender] = useState('Boys');
    const [capacity, setCapacity] = useState('');
    const [warden, setWarden] = useState('');

    useEffect(() => {
        axios.get('/admin/manage/hostels')
            .then(res => setHostels(res.data))
            .catch(err => console.error("Error fetching admin hostels", err));
    }, []);

    const handleAddClick = () => {
        setHostelId(''); setName(''); setLocation(''); setGender('Boys'); setCapacity(''); setWarden('');
        setEditingId(null);
        setShowForm(true);
    };

    const handleEditClick = (h) => {
        setHostelId(h.hostelId);
        setName(h.name);
        setLocation(h.location);
        setGender(h.gender);
        setCapacity(h.capacity);
        setWarden(h.warden);
        setEditingId(h.hostelId);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // UI-only optimistic update for demo purposes
        const newHostelData = {
            hostelId: hostelId || `H${hostels.length + 1}`,
            name,
            location,
            gender,
            capacity: Number(capacity),
            warden
        };

        if (editingId) {
            setHostels(hostels.map(h => h.hostelId === editingId ? newHostelData : h));
        } else {
            setHostels([...hostels, newHostelData]);
        }
        setShowForm(false);
        setEditingId(null);
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
                    <h1>Manage Hostels</h1>
                    <p>Add, edit, and organize all hostel buildings</p>
                </div>
                <button className="admin-btn-primary" onClick={showForm && !editingId ? () => setShowForm(false) : handleAddClick}>
                    {showForm && !editingId ? <><FiX /> Cancel</> : <><FiPlus /> Add New Hostel</>}
                </button>
            </div>

            {/* Add/Edit Hostel Form Modal / Card */}
            {showForm && (
                <div className="admin-card bg-light" style={{ marginBottom: '20px' }}>
                    <h3 className="admin-card-title">{editingId ? 'Edit Hostel Details' : 'Register New Hostel'}</h3>
                    <form className="admin-grid-2" onSubmit={handleSubmit}>
                        <div className="admin-form-group">
                            <label>Hostel ID (e.g., H1)</label>
                            <input type="text" value={hostelId} onChange={e => setHostelId(e.target.value)} required={!editingId} disabled={!!editingId} />
                        </div>
                        <div className="admin-form-group">
                            <label>Hostel Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="admin-form-group">
                            <label>Target Gender</label>
                            <select value={gender} onChange={e => setGender(e.target.value)}>
                                <option value="Boys">Boys</option>
                                <option value="Girls">Girls</option>
                            </select>
                        </div>
                        <div className="admin-form-group">
                            <label>Location</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} required />
                        </div>
                        <div className="admin-form-group">
                            <label>Total Capacity (Beds)</label>
                            <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min="1" required />
                        </div>
                        <div className="admin-form-group">
                            <label>Assigned Warden (Optional)</label>
                            <input type="text" value={warden} onChange={e => setWarden(e.target.value)} />
                        </div>
                        <div className="admin-form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                            <button type="submit" className="admin-btn-primary">
                                <FiCheck /> {editingId ? 'Save Changes' : 'Save Hostel'}
                            </button>
                            <button type="button" className="admin-btn-secondary" onClick={() => setShowForm(false)}>
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
                                <th>Hostel ID</th>
                                <th>Hostel Name</th>
                                <th>Gender</th>
                                <th>Location</th>
                                <th>Total Capacity</th>
                                <th>Warden Assigned</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hostels.length > 0 ? (
                                hostels.map((h, i) => (
                                    <tr key={h.hostelId || i}>
                                        <td>{h.hostelId}</td>
                                        <td><strong>{h.name}</strong></td>
                                        <td><span className={`admin-badge ${h.gender === 'Girls' ? 'badge-orange' : 'badge-blue'}`}>{h.gender}</span></td>
                                        <td>{h.location}</td>
                                        <td>{h.capacity}</td>
                                        <td>{h.warden || <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                                        <td>
                                            <button className="admin-action-btn" onClick={() => handleEditClick(h)}><FiEdit /> Edit</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>No hostels found in database.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminHostels;
