import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { FiUser, FiPhone, FiMail, FiHome, FiKey, FiArrowLeft } from 'react-icons/fi';
import './StudentProfile.css';

const Field = ({ icon, label, value }) => (
    <div className="sp-field">
        <div className="sp-field-icon">{icon}</div>
        <div>
            <span className="sp-field-label">{label}</span>
            <p className="sp-field-value">{value || '—'}</p>
        </div>
    </div>
);

const StudentProfile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get('/students/details')
            .then(r => setProfile(r.data))
            .catch(() => setError('Unable to load profile. Please try again.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="sp-center"><div className="sp-spinner" /></div>;
    if (error) return <div className="sp-center sp-error">{error}</div>;

    return (
        <div className="sp-page">
            <div className="sp-page-header">
                <div>
                    <h1>My Profile</h1>
                    <p>View your personal and hostel allocation details</p>
                </div>
                <button className="page-close-btn" onClick={() => navigate('/student')} title="Back to Dashboard">×</button>
            </div>

            <div className="sp-grid">
                {/* Personal card */}
                <div className="sp-card">
                    <div className="sp-card-head">
                        <div className="sp-avatar">{profile.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                            <h2>{profile.name}</h2>
                            <span>ID: {profile.student_id}</span>
                        </div>
                    </div>
                    <div className="sp-fields">
                        <Field icon={<FiUser />} label="Gender" value={profile.gender} />
                        <Field icon={<FiMail />} label="Email" value={profile.email} />
                        <Field icon={<FiPhone />} label="Phone" value={profile.phone} />
                    </div>
                </div>

                {/* Hostel card */}
                <div className="sp-card">
                    <div className="sp-section-title">Hostel Allocation</div>
                    <div className="sp-alloc">
                        <div className="sp-alloc-item">
                            <div className="sp-alloc-icon"><FiHome /></div>
                            <div>
                                <span>Hostel Block</span>
                                <strong>{profile.hostel_name}</strong>
                            </div>
                        </div>
                        <div className="sp-alloc-item">
                            <div className="sp-alloc-icon"><FiKey /></div>
                            <div>
                                <span>Room Number</span>
                                <strong>{profile.room_number}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
