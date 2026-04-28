// If you want a full backend, run this with Node.js
const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
    'https://YOUR_PROJECT.supabase.co',
    'YOUR_SERVICE_ROLE_KEY' // Get from Supabase Settings → API
);

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Student attendance endpoint
app.post('/api/attendance', upload.single('photo'), async (req, res) => {
    try {
        const { token, studentId, lat, lon } = req.body;
        const photo = req.file;
        
        // Verify QR session
        const { data: session, error: sessionError } = await supabase
            .from('attendance_sessions')
            .select('*, classes!inner(*)')
            .eq('qr_token', token)
            .gt('expires_at', new Date().toISOString())
            .single();
        
        if (!session) {
            return res.status(400).json({ error: 'QR code expired or invalid' });
        }
        
        // Verify student
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('class_id', session.class_id)
            .eq('student_id_number', studentId)
            .single();
        
        if (!student) {
            return res.status(400).json({ error: 'Student ID not found in this class' });
        }
        
        // Upload photo to Supabase Storage
        const fileName = `${session.id}_${student.id}_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('attendance-photos')
            .upload(fileName, photo.buffer, { contentType: 'image/jpeg' });
        
        const photoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/attendance-photos/${fileName}`;
        
        // Create attendance record
        const { data: record, error: recordError } = await supabase
            .from('attendance_records')
            .insert({
                session_id: session.id,
                student_id: student.id,
                photo_url: photoUrl,
                verified_inside: true, // You'd validate GPS here
                status: 'present'
            })
            .select();
        
        // Get student's attendance summary
        const { data: allRecords } = await supabase
            .from('attendance_records')
            .select('status')
            .eq('student_id', student.id);
        
        const summary = {
            presentCount: allRecords?.filter(r => r.status === 'present').length || 0,
            absentCount: allRecords?.filter(r => r.status === 'absent').length || 0,
            excusedCount: allRecords?.filter(r => r.status === 'excused').length || 0
        };
        
        res.json({
            success: true,
            className: session.classes.class_name,
            ...summary
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
