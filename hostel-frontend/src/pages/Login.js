import React, { useState } from "react";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
    const [login_id, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [rememberMe, setRememberMe] = useState(false);

    // Forgot Password Modal State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotLoginId, setForgotLoginId] = useState("");
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [tempPassword, setTempPassword] = useState("");

    // Contact Admin Modal State
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactMessage, setContactMessage] = useState("");
    const [contactError, setContactError] = useState("");
    const [contactSuccess, setContactSuccess] = useState("");
    const [contactLoading, setContactLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Check if rememberMe data exists on mount
    React.useEffect(() => {
        const savedId = localStorage.getItem("remembered_login_id");
        if (savedId) {
            setLoginId(savedId);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await axios.post("/auth/login", {
                login_id,
                password,
            });

            if (rememberMe) {
                localStorage.setItem("remembered_login_id", login_id);
            } else {
                localStorage.removeItem("remembered_login_id");
            }

            login(res.data);
            navigate(`/${res.data.role.toLowerCase()}`);
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.error || "Invalid credentials. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Forgot Password Handler
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotError("");
        setForgotSuccess("");
        setTempPassword("");
        setForgotLoading(true);

        try {
            const res = await axios.post("/auth/forgot-password", {
                login_id: forgotLoginId,
            });

            setTempPassword(res.data.tempPassword);
            setForgotSuccess(res.data.message);
            setForgotLoginId("");
        } catch (err) {
            setForgotError(err.response?.data?.message || "Failed to process forgot password request");
        } finally {
            setForgotLoading(false);
        }
    };

    // Contact Admin Handler
    const handleContactAdmin = async (e) => {
        e.preventDefault();
        setContactError("");
        setContactSuccess("");
        setContactLoading(true);

        try {
            const res = await axios.post("/auth/contact-admin", {
                name: contactName,
                email: contactEmail,
                message: contactMessage,
            });

            setContactSuccess(res.data.message);
            setContactName("");
            setContactEmail("");
            setContactMessage("");

            // Close modal after 2 seconds
            setTimeout(() => {
                setShowContactModal(false);
                setContactSuccess("");
            }, 2000);
        } catch (err) {
            setContactError(err.response?.data?.message || "Failed to send message");
        } finally {
            setContactLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="glass-panel">
                <div className="login-header">
                    <div className="brand-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                        </svg>
                    </div>
                    <h2>Hostel Management</h2>
                    <p className="subtitle">Welcome back! Please login to your account.</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    {error && (
                        <div className="error-message">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            {error}
                        </div>
                    )}

                    <div className="input-group">
                        <label>Login ID / Roll No</label>
                        <div className="input-icon-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Enter your ID"
                                value={login_id}
                                onChange={(e) => setLoginId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-icon-wrapper">
                            <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            <input
                                type="password"
                                className="glass-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="remember-forgot-row">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            Remember me
                        </label>
                        <button
                            type="button"
                            className="forgot-password"
                            onClick={() => setShowForgotModal(true)}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? <div className="spinner"></div> : "Sign In"}
                    </button>

                    <div className="login-footer">
                        Having trouble logging in? 
                        <button
                            type="button"
                            className="contact-admin-link"
                            onClick={() => setShowContactModal(true)}
                        >
                            Contact Admin
                        </button>
                    </div>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Reset Password</h3>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => {
                                    setShowForgotModal(false);
                                    setForgotError("");
                                    setForgotSuccess("");
                                    setTempPassword("");
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {!tempPassword ? (
                            <form onSubmit={handleForgotPassword} className="modal-form">
                                {forgotError && (
                                    <div className="error-message">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        {forgotError}
                                    </div>
                                )}

                                <div className="input-group">
                                    <label>Login ID / Roll Number</label>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        placeholder="Enter your login ID"
                                        value={forgotLoginId}
                                        onChange={(e) => setForgotLoginId(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="login-btn" disabled={forgotLoading}>
                                    {forgotLoading ? <div className="spinner"></div> : "Generate Password"}
                                </button>
                            </form>
                        ) : (
                            <div className="modal-success">
                                <div className="success-message">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9.08" /><path d="M23 3H1v7.5" /><polyline points="6 12.5 10.5 16 18 8.5"></polyline></svg>
                                    <h4>Password Reset Successfully</h4>
                                </div>

                                <div className="temp-password-section">
                                    <p className="label">Your Temporary Password:</p>
                                    <div className="password-display">{tempPassword}</div>
                                    <p className="hint">Use this password to login. Change it immediately after logging in.</p>
                                </div>

                                <button
                                    type="button"
                                    className="login-btn"
                                    onClick={() => {
                                        setShowForgotModal(false);
                                        setForgotSuccess("");
                                        setTempPassword("");
                                    }}
                                >
                                    Back to Login
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Contact Admin Modal */}
            {showContactModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Contact Admin</h3>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => {
                                    setShowContactModal(false);
                                    setContactError("");
                                    setContactSuccess("");
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {!contactSuccess ? (
                            <form onSubmit={handleContactAdmin} className="modal-form">
                                {contactError && (
                                    <div className="error-message">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        {contactError}
                                    </div>
                                )}

                                <div className="input-group">
                                    <label>Name</label>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        placeholder="Your name"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="glass-input"
                                        placeholder="your@email.com"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Message</label>
                                    <textarea
                                        className="glass-input message-textarea"
                                        placeholder="Describe your issue or question..."
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        rows="4"
                                        required
                                    ></textarea>
                                </div>

                                <button type="submit" className="login-btn" disabled={contactLoading}>
                                    {contactLoading ? <div className="spinner"></div> : "Send Message"}
                                </button>
                            </form>
                        ) : (
                            <div className="modal-success">
                                <div className="success-message">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9.08" /><path d="M23 3H1v7.5" /><polyline points="6 12.5 10.5 16 18 8.5"></polyline></svg>
                                    <h4>Message Sent Successfully</h4>
                                </div>
                                <p className="success-text">Your message has been sent to the admin. We'll get back to you soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;
