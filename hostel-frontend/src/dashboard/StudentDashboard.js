/**
 * STUDENT DASHBOARD COMPONENT
 *
 * Main dashboard for students showing their hostel information, dues, payments, and notifications.
 * This is the first page students see after logging in.
 *
 * Features:
 * - Profile overview (name, room, hostel)
 * - Dues summary with payment status
 * - Recent complaints and notifications
 * - Image gallery of hostel facilities
 * - Quick action buttons for common tasks
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';

// ICON IMPORTS - Using React Icons for consistent UI
import {
  FiUser, FiDollarSign, FiAlertCircle, FiBell,
  FiArrowRight, FiCreditCard, FiTool, FiHome,
  FiCalendar, FiChevronLeft, FiChevronRight, FiX,
  FiCoffee, FiZap
} from 'react-icons/fi';

// STYLES
import './StudentDashboard.css';

// IMAGE ASSETS
import roomImg from '../assets/room.png';
import messImg from '../assets/mess.png';

/* ── HOSTEL GALLERY IMAGES ── */
// Static images and Unsplash URLs for hostel facilities
const gallerySlides = [
  { src: roomImg, label: 'Your Hostel Room', sub: 'Fully furnished double-sharing' },
  { src: messImg, label: 'Dining Hall', sub: 'Three meals · Mon – Sun' },
  {
    src: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=900&q=80',
    label: 'Campus Life',
    sub: 'Student events & activities'
  },
  {
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80',
    label: 'Library',
    sub: 'Open 7 AM – 11 PM daily'
  },
];

/* ── NOTIFICATION TYPE CONFIGURATION ── */
// Maps notification types to icons and colors for UI display
const NOTIF_CONFIG = {
  fee: { icon: <FiDollarSign />, color: '#b45309', bg: '#fef3c7' },      // Orange for fees
  complaint: { icon: <FiTool />, color: '#d97706', bg: '#ffedd5' },    // Yellow for complaints
  room: { icon: <FiHome />, color: '#047857', bg: '#dcfce7' },         // Green for room changes
  general: { icon: <FiBell />, color: '#6b7280', bg: '#f3f4f6' },      // Gray for general
};

const StudentDashboard = () => {
  // HOOKS
  const { user } = useAuth();        // Get authenticated user info
  const navigate = useNavigate();    // For programmatic navigation

  // COMPONENT STATE
  const [profile, setProfile] = useState(null);  // Student profile information
  const [duesSummary, setDuesSummary] = useState({
    total_due: 0,
    pending_months: 0,
    paid_months: 0,
    total_months: 0,
    detailedMonths: []  // Detailed breakdown by month
  });
  const [isDuesModalOpen, setIsDuesModalOpen] = useState(false);  // Modal visibility
  const [paymentHistory, setPaymentHistory] = useState([]);       // Recent payments
  const [complaints, setComplaints] = useState([]);               // Active complaints
  const [notifications, setNotifications] = useState([]);         // Unread notifications
  const [unreadCount, setUnreadCount] = useState(0);              // Notification count
  const [showAllNotifications, setShowAllNotifications] = useState(false); // Show all notifs
  const [slide, setSlide] = useState(0);                          // Current gallery slide
  const [isLoading, setIsLoading] = useState(true);               // Loading state

  // LOAD DATA ON COMPONENT MOUNT
  useEffect(() => {
    // Fetch all dashboard data in parallel for better performance
    Promise.all([
      axios.get('/students/details').then(r => setProfile(r.data)).catch(() => {}),
      axios.get('/student/dues-summary').then(res => setDuesSummary(res.data)).catch(() => {}),
      axios.get('/student/payment/').then(r => setPaymentHistory(r.data || [])).catch(() => {}),
      axios.get('/complaints/my').then(r => setComplaints(r.data || [])).catch(() => {}),
      axios.get('/notifications/me').then(r => setNotifications(r.data || [])).catch(() => {}),
      axios.get('/notifications/unread-count/me').then(r => setUnreadCount(r.data?.unreadCount || 0)).catch(() => {})
    ]).finally(() => {
      // Hide loading spinner once all requests complete
      setIsLoading(false);
    });
  }, []);

  // Periodically refresh notification list and unread count so dashboard stays up-to-date
  useEffect(() => {
    const refreshNotifications = async () => {
      try {
        const [notifRes, countRes] = await Promise.all([
          axios.get('/notifications/me'),
          axios.get('/notifications/unread-count/me')
        ]);
        setNotifications(notifRes.data || []);
        setUnreadCount(countRes.data?.unreadCount || 0);
      } catch (refreshErr) {
        console.error('[StudentDashboard] notification refresh failed:', refreshErr.message);
      }
    };

    // Fetch once immediately and then poll every 20 seconds
    refreshNotifications();
    const intervalId = setInterval(refreshNotifications, 20000);
    return () => clearInterval(intervalId);
  }, []);

  // GALLERY AUTO-ADVANCE FUNCTIONALITY
  // Automatically change gallery slide every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide(s => (s + 1) % gallerySlides.length);
    }, 4500); // 4.5 seconds

    // Cleanup timer on component unmount
    return () => clearInterval(timer);
  }, []);

  // GALLERY NAVIGATION FUNCTIONS
  const prevSlide = () => setSlide(s => (s - 1 + gallerySlides.length) % gallerySlides.length);
  const nextSlide = () => setSlide(s => (s + 1) % gallerySlides.length);

  // CALCULATE DASHBOARD METRICS
  const pendingCount = duesSummary.pending_months;
  const overdueCount = duesSummary.overdue_count || 0;

  // Calculate payment completion percentage
  const paidPercent = duesSummary.total_months > 0
    ? Math.round((duesSummary.paid_months / duesSummary.total_months) * 100)
    : 0;

  // DETERMINE DUES STATUS AND COLORS
  // Dynamic styling based on payment status
  let duesColor = '#10b981'; // Green - all paid
  let duesBg = '#f0fdf4';    // Light green background
  let duesStatus = 'Cleared'; // Default status

  if (overdueCount > 0) {
    // Red theme for overdue payments
    duesColor = '#ef4444'; // Red
    duesBg = '#fef2f2';    // Light red background
    duesStatus = `${overdueCount} Overdue`;
  } else if (pendingCount > 0) {
    // Yellow theme for pending payments
    duesColor = '#f59e0b'; // Yellow/Orange
    duesBg = '#fffbeb';    // Light yellow background
    duesStatus = `${pendingCount} Pending`;
  }

  const openTicketsCount = complaints.filter(c => c.status?.toLowerCase() !== 'resolved').length;
  const latestComplaint = complaints.length > 0 ? complaints[0].description : '';

  /* KPI CARDS CONFIGURATION */
  // Four main metric cards displayed at the top of the dashboard
  const kpiCards = [
    {
      icon: <FiHome />,
      label: 'Room',
      value: profile?.room_number || '—',
      sub: profile?.capacity ? `${profile.occupants} / ${profile.capacity} Occupied` : (profile?.hostel_name || 'Loading…'),
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      icon: <FiDollarSign />,
      label: 'Pending Dues',
      value: duesSummary.total_due > 0 ? `₹${duesSummary.total_due} ${duesStatus}` : 'Cleared ✓',
      sub: (
        <div className="sd-dues-sub">
          <span>{duesSummary.total_due > 0 ? duesStatus : 'All dues paid'}</span>
          <div className="sd-progress-bar">
            <div className="sd-progress-fill" style={{ width: `${paidPercent}%`, background: duesColor }}></div>
          </div>
          <span style={{ fontSize: '11px' }}>{paidPercent}% Paid</span>
          {duesSummary.total_due > 0 && (
            <button className="sd-btn-inline" onClick={(e) => { e.stopPropagation(); navigate('/student/payments'); }}>
              Pay Now
            </button>
          )}
        </div>
      ),
      color: duesColor,
      bg: duesBg,
      onClick: duesSummary.total_due > 0 ? () => setIsDuesModalOpen(true) : null,
      clickable: duesSummary.total_due > 0
    },
    {
      icon: <FiTool />,
      label: 'Open Tickets',
      value: openTicketsCount,
      sub: openTicketsCount > 0 && latestComplaint ? `Latest Issue: "${latestComplaint.substring(0, 20)}..."` : '0 open tickets',
      color: '#8b5cf6',
      bg: '#f5f3ff',
    },
    {
      icon: <FiBell />,
      label: 'Notifications',
      value: unreadCount,
      sub: notifications.length > 0 ? `${notifications.length} total` : 'Up to date',
      color: '#ef4444',
      bg: '#fef2f2',
    },
  ];

  /* QUICK ACTION BUTTONS */
  // Navigation shortcuts for common student tasks
  const quickActions = [
    { label: 'View Profile', icon: <FiUser />, path: '/student/profile', cls: 'qa-blue' },
    { label: `Pay Fees ${pendingCount > 0 ? `(⚠ ${pendingCount} pending)` : ''}`, icon: <FiCreditCard />, path: '/student/payments', cls: 'qa-green' },
    { label: `Raise Issue ${openTicketsCount > 0 ? `(${openTicketsCount} open tickets)` : ''}`, icon: <FiTool />, path: '/student/complaints', cls: 'qa-orange' },
  ];

  const paidThisYear = paymentHistory.reduce((sum, txn) => sum + txn.amount, 0);
  const lastPayment = paymentHistory.length > 0 ? paymentHistory[0] : null;

  // LOADING STATE
  // Show spinner while fetching dashboard data
  if (isLoading) {
    return (
      <div className="sd-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="sd-page">

      {/* ── Greeting Banner ── */}
      <div className="sd-banner">
        <div>
          <h1 className="sd-greeting">Welcome back, <span>{user?.login_id || 'Student'}</span> 👋</h1>
          <p className="sd-sub">Here's what's happening at your hostel today.</p>
        </div>
        <div className="sd-smart-status">
          {overdueCount > 0 ? (
            <span className="status-overdue">⚠ {overdueCount} dues overdue - Pay immediately</span>
          ) : pendingCount > 0 ? (
            <span className="status-warn">⚠ You have {pendingCount} pending dues</span>
          ) : (
            <span className="status-success">✔ All dues cleared</span>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="sd-kpi-grid">
        {kpiCards.map((kpi, i) => (
          <div
            className={`kpi-card ${kpi.clickable ? 'clickable-kpi' : ''}`}
            key={i}
            style={{ '--kpi-color': kpi.color, '--kpi-bg': kpi.bg }}
            onClick={kpi.onClick}
          >
            <div className="kpi-icon">{kpi.icon}</div>
            <div className="kpi-body">
              <span className="kpi-label">{kpi.label}</span>
              <strong className="kpi-value">{kpi.value}</strong>
              <span className="kpi-sub">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lower Grid ── */}
      <div className="sd-bottom-grid">

        {/* Notifications */}
        <div className="sd-card notif-card">
          <div className="sd-card-header">
            <h3><FiBell className="hdr-icon" /> Notifications</h3>            <div className="notif-header-actions">
              {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} unread</span>}
              <button className="notif-mini-btn" onClick={() => setShowAllNotifications((prev) => !prev)}>
                {showAllNotifications ? 'Show top 5' : 'View all'}
              </button>
              <button className="notif-mini-btn" disabled={unreadCount === 0} onClick={async () => {
                const unread = notifications.filter((n) => !n.is_read);
                if (unread.length === 0) return;
                await Promise.all(unread.map((n) => axios.put(`/notifications/read/${n.notification_id}`).catch(() => {})));
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                setUnreadCount(0);
              }}>
                Mark all read
              </button>
            </div>          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">No notifications at the moment.</p>
            ) : (
              (showAllNotifications ? notifications : notifications.slice(0, 5)).map((n, i) => {
                const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.general;
                const date = new Date(n.created_at).toLocaleString();

                return (
                  <div className={`notif-item ${n.is_read ? 'read' : 'unread'}`} key={i}>
                    <div className="notif-icon" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
                    <div className="notif-body">
                      <h4>{n.title || 'Update'}</h4>
                      <span className="notif-time"><FiCalendar /> {date}</span>
                      <p>{n.message}</p>
                    </div>
                    <button
                      className="notif-mark-read-btn"
                      onClick={async () => {
                        await axios.put(`/notifications/read/${n.notification_id}`);
                        setNotifications((prev) => prev.map((x) => x.notification_id === n.notification_id ? { ...x, is_read: true } : x));
                        setUnreadCount((cnt) => Math.max(0, cnt - 1));
                      }}
                      disabled={n.is_read}
                    >
                      {n.is_read ? 'Read' : 'Mark read'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions & Financial */}
        <div className="sd-card qa-card">
          <div className="sd-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="qa-list">
            {quickActions.map((qa, i) => (
              <button
                key={i}
                className={`qa-btn ${qa.cls}`}
                onClick={() => navigate(qa.path)}
              >
                <span className="qa-icon">{qa.icon}</span>
                <span className="qa-label">{qa.label}</span>
                <FiArrowRight className="qa-arrow" />
              </button>
            ))}
          </div>

          <div className="sd-financial-summary">
            <h4>Financial Summary</h4>
            <div className="fin-row">
              <span>Paid this year:</span>
              <strong>₹{paidThisYear}</strong>
            </div>
            <div className="fin-row fin-pending">
              <span>Pending Dues:</span>
              <strong>₹{duesSummary.total_due}</strong>
            </div>
            {lastPayment && (
              <div className="fin-last-payment">
                <span>Last Payment:</span> {lastPayment.payment_month} (₹{lastPayment.amount})
              </div>
            )}
          </div>
        </div>

        {/* Campus Gallery Carousel */}
        <div className="sd-card gallery-card">
          <div className="sd-card-header">
            <h3><FiHome className="hdr-icon" /> Campus Experience</h3>
          </div>
          <div className="carousel">
            <div className="carousel-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {gallerySlides.map((s, i) => (
                <div className="carousel-slide" key={i}>
                  <img src={s.src} alt={s.label} />
                  <div className="carousel-caption">
                    <h4>{s.label}</h4>
                    <p>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="carousel-btn prev" onClick={prevSlide}><FiChevronLeft /></button>
            <button className="carousel-btn next" onClick={nextSlide}><FiChevronRight /></button>

            <div className="carousel-dots">
              {gallerySlides.map((_, i) => (
                <button key={i} className={`dot ${i === slide ? 'active' : ''}`} onClick={() => setSlide(i)} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Pending Dues Modal ── */}
      {isDuesModalOpen && (
        <div className="sd-modal-overlay" onClick={() => setIsDuesModalOpen(false)}>
          <div className="sd-modal-content" onClick={e => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3>Pending Hostel Fees</h3>
              <button className="sd-modal-close" onClick={() => setIsDuesModalOpen(false)}>
                <FiX />
              </button>
            </div>
            <div className="sd-modal-body">
              <p className="sd-modal-desc">
                You have {duesSummary.detailedMonths.length} month(s) in the dues ledger.
              </p>

              <div className="sd-modal-scroll-area">
                {duesSummary.detailedMonths.map((m, idx) => (
                  <div key={idx} className="dues-month-group">
                    <h4 className="dues-month-heading">{m.month}</h4>
                    <ul className="sd-modal-list dues-detailed-list">
                      <li className="dues-list-item">
                        <span className="dues-type-label">Hostel Fee</span>
                        <span className="dues-amount">₹{m.hostel_fee}</span>
                      </li>
                      <li className="dues-list-item">
                        <span className="dues-type-label">Electricity Fee</span>
                        <span className="dues-amount">₹{m.electricity_fee}</span>
                      </li>
                      <li className="dues-list-item">
                        <span className="dues-type-label">Total</span>
                        <span className="dues-amount">₹{m.total_amount}</span>
                      </li>
                      <li className="dues-list-item">
                        <span className="dues-type-label">Status</span>
                        <span className={`dues-status ${m.status}`}>{m.status === 'paid' ? 'Paid ✔' : 'Unpaid'}</span>
                      </li>
                    </ul>
                  </div>
                ))}
              </div>

              <div className="dues-total-sec">
                <span>Total Due:</span>
                <span className="dues-total-amount">₹{duesSummary.total_due}</span>
              </div>
            </div>
            <div className="sd-modal-footer">
              <button
                className="sd-modal-btn sd-btn-primary"
                onClick={() => navigate('/student/payments')}
              >
                Pay Full Amount
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
