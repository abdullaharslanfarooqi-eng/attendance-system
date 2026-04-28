// This is the complete teacher dashboard functionality
let currentClassId = null;
let currentSessionId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    if (!localStorage.getItem('teacherLoggedIn')) {
        window.location.href = 'login.html';
    }
    
    await loadClasses();
    
    document.getElementById('addClassBtn').onclick = addNewClass;
    document.getElementById('generateQRBtn').onclick = generateQRCode;
    document.getElementById('exportCSVBtn').onclick = exportAttendance;
    document.getElementById('logoutBtn').onclick = () => {
        localStorage.clear();
        window.location.href = 'login.html';
    };
});

async function loadClasses() {
    const supabase = await initSupabase();
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (classes) {
        const container = document.getElementById('classesList');
        container.innerHTML = classes.map(c => `
            <div class="class-item" onclick="selectClass('${c.id}')">
                <strong>${c.class_name}</strong>
            </div>
        `).join('');
    }
}

async function selectClass(classId) {
    currentClassId = classId;
    document.getElementById('selectedClassInfo').innerHTML = `<h4>Class: ${classId}</h4>`;
    document.getElementById('generateQRBtn').style.display = 'inline-block';
    document.getElementById('addStudentBtn').style.display = 'inline-block';
    document.getElementById('bulkUploadBtn').style.display = 'inline-block';
    await loadStudents();
    await loadAttendanceRecords();
}

async function generateQRCode() {
    if (!currentClassId) {
        alert('Please select a class first');
        return;
    }
    
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    
    const supabase = await initSupabase();
    const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
            class_id: currentClassId,
            qr_token: token,
            expires_at: expiresAt
        })
        .select();
    
    if (data) {
        currentSessionId = data[0].id;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/attend.html?token=' + token)}`;
        document.getElementById('qrDisplay').style.display = 'block';
        document.getElementById('qrCodeImg').innerHTML = `<img src="${qrUrl}" alt="QR Code">`;
        document.getElementById('qrDisplay').innerHTML += `<p>Expires: ${new Date(expiresAt).toLocaleTimeString()}</p>`;
        
        // Auto-refresh after 10 minutes
        setTimeout(() => {
            document.getElementById('qrDisplay').innerHTML = '<p>⏰ QR Code expired. Generate a new one.</p>';
        }, 10 * 60000);
    }
}

async function loadStudents() {
    const supabase = await initSupabase();
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', currentClassId);
    
    if (students) {
        document.getElementById('studentsPanel').innerHTML = `
            <table>
                <tr><th>ID</th><th>Name</th><th>Nickname</th></tr>
                ${students.map(s => `
                    <tr>
                        <td>${s.student_id_number}</td>
                        <td>${s.full_name}</td>
                        <td>${s.nickname || '-'}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }
}

async function loadAttendanceRecords() {
    const supabase = await initSupabase();
    const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
            *,
            students (full_name, student_id_number, nickname),
            attendance_sessions (created_at)
        `)
        .eq('attendance_sessions.class_id', currentClassId)
        .order('recorded_at', { ascending: false });
    
    if (records) {
        const tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Photo</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td>${r.students?.full_name || 'Unknown'}</td>
                            <td class="status-${r.status}">${r.status}</td>
                            <td>${new Date(r.recorded_at).toLocaleString()}</td>
                            <td><a href="${r.photo_url}" target="_blank">View</a></td>
                            <td>
                                <button onclick="updateStatus('${r.id}', 'present')" class="btn-small">✅ Present</button>
                                <button onclick="updateStatus('${r.id}', 'excused')" class="btn-small">📝 Excused</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('attendanceTable').innerHTML = tableHtml;
    }
}

async function updateStatus(recordId, newStatus) {
    const supabase = await initSupabase();
    const { data, error } = await supabase
        .from('attendance_records')
        .update({ status: newStatus })
        .eq('id', recordId);
    
    if (!error) {
        await loadAttendanceRecords();
        alert('Status updated!');
    }
}

async function exportAttendance() {
    const supabase = await initSupabase();
    const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
            *,
            students (full_name, student_id_number),
            attendance_sessions (created_at)
        `)
        .eq('attendance_sessions.class_id', currentClassId);
    
    if (records) {
        let csv = "Student Name,Student ID,Status,Date,Photo URL\n";
        records.forEach(r => {
            csv += `"${r.students?.full_name}",${r.students?.student_id_number},${r.status},${r.recorded_at},${r.photo_url}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString()}.csv`;
        a.click();
    }
}

async function addNewClass() {
    const className = prompt('Enter class name:');
    if (!className) return;
    
    const supabase = await initSupabase();
    const { data, error } = await supabase
        .from('classes')
        .insert({ class_name: className, teacher_id: 'YOUR_TEACHER_ID' });
    
    if (!error) {
        await loadClasses();
        alert('Class added!');
    }
}
