import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { FiSearch } from "react-icons/fi";
import "./StudentPayments.css";

const categoryColors = {
  Hostel: "#3b82f6",
  Mess: "#10b981",
  Electricity: "#f59e0b",
  Fine: "#ef4444",
  Other: "#6b7280",
};

const categories = ["All", "Hostel", "Mess", "Electricity", "Fine", "Other"];

const WardenAllPayments = () => {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/warden/payment/all");
        setPayments(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("WardenAllPayments load error:", err);
        setMsg({ type: "error", text: err.response?.data?.message || "Failed to load payments" });
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, []);

  const filteredPayments = payments.filter((p) => {
    return filter === "All" || p.category === filter;
  });

  return (
    <div className="pay-page" style={{ marginBottom: "32px" }}>
      <div className="pay-page-header">
        <div>
          <h1>All Payments</h1>
          <p>View and filter all student payments across all categories.</p>
        </div>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ minWidth: '220px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Category</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <div style={{ color: '#4b5563', fontSize: '0.95rem' }}><FiSearch style={{ marginRight: '6px', verticalAlign: 'middle' }} />Records: {filteredPayments.length}</div>
        </div>
      </div>

      {msg.text && <div className={`pay-alert ${msg.type}`}>{msg.text}</div>}

      <div className="pay-due-table" style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
        <table className="pay-table" style={{ minWidth: '860px' }}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>Loading payments...</td></tr>
            ) : filteredPayments.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>No payments found for selected filter.</td></tr>
            ) : (
              filteredPayments.map((pay, idx) => (
                <tr key={idx}>
                  <td>{pay.student_name || 'Unknown'}</td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      background: categoryColors[pay.category] || categoryColors.Other,
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {pay.category || 'Other'}
                    </span>
                  </td>
                  <td>₹{Number(pay.amount).toLocaleString()}</td>
                  <td>{pay.method || '-'}</td>
                  <td>{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : '-'}</td>
                  <td>{pay.status || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WardenAllPayments;
