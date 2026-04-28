// Student attendance flow with live photo and GPS verification
let currentToken = null;
let currentPhotoBlob = null;
let stream = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentToken = urlParams.get('token');
    
    if (!currentToken) {
        document.getElementById('attendanceApp').innerHTML = '<div class="card error">Invalid QR code. Please scan the QR code provided by your teacher.</div>';
        return;
    }
    
    document.getElementById('nextToPhoto').onclick = startCamera;
    document.getElementById('captureBtn').onclick = capturePhoto;
    document.getElementById('submitAttendance').onclick = submitAttendance;
});

async function startCamera() {
    const studentId = document.getElementById('studentId').value;
    if (!studentId) {
        alert('Please enter your Student ID');
        return;
    }
    
    localStorage.setItem('tempStudentId', studentId);
    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        document.getElementById('camera').srcObject = stream;
    } catch (err) {
        alert('Camera access required. Please allow camera permissions.');
    }
}

function capturePhoto() {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
        currentPhotoBlob = blob;
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = `<img src="${URL.createObjectURL(blob)}" style="max-width:100%; border-radius:12px; margin-top:10px;">`;
        document.getElementById('submitAttendance').style.display = 'inline-block';
    }, 'image/jpeg', 0.8);
    
    // Stop camera stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('camera').style.display = 'none';
    }
}

async function submitAttendance() {
    const studentId = localStorage.getItem('tempStudentId');
    
    // Get GPS location
    const position = await getCurrentPosition();
    const insideSchool = position ? true : false; // You would validate against school coordinates
    
    const formData = new FormData();
    formData.append('token', currentToken);
    formData.append('studentId', studentId);
    formData.append('photo', currentPhotoBlob, 'attendance.jpg');
    formData.append('lat', position?.coords.latitude || 0);
    formData.append('lon', position?.coords.longitude || 0);
    
    // Submit to your backend (you'll need a simple server endpoint)
    const response = await fetch('/api/attendance', {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
        document.getElementById('step2').classList.remove('active');
        document.getElementById('step3').classList.add('active');
        
        document.getElementById('summaryStats').innerHTML = `
            <p>✅ Attendance marked for ${result.className}</p>
            <p>📊 Your attendance summary:</p>
            <p>Present: ${result.presentCount} | Absent: ${result.absentCount} | Excused: ${result.excusedCount}</p>
        `;
    } else {
        alert('Error: ' + result.error);
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
    });
}
