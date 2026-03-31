const axios = require('axios');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ user_id: 1, login_id: 'A1', role: 'Admin' }, process.env.JWT_SECRET);

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/admin/manage/hostels', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Hostels returned data:', res.data);
        
        const kpi = await axios.get('http://localhost:5000/api/admin/dashboard/kpi', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('KPI returned data:', kpi.data);
        
        const rooms = await axios.get('http://localhost:5000/api/admin/manage/rooms', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Rooms:', rooms.data.length);
        
        const students = await axios.get('http://localhost:5000/api/admin/manage/students', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Students:', students.data.length);
    } catch(e) {
        console.error('Error fetching:', e.response?.data || e.message);
    }
}

test();
