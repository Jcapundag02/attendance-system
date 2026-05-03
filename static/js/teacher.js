var user = sessionStorage.getItem('user');
if (!user) { window.location.href = '/'; }
user = JSON.parse(user);

var students = [];
var statusMap = {};

document.getElementById('userName').textContent = user.name;

var dateInput = document.getElementById('dateInput');
var today = new Date();
dateInput.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

var studentsList = document.getElementById('studentsList');
var tableBody = document.getElementById('tableBody');
var emptyState = document.getElementById('emptyState');
var saveBtn = document.getElementById('saveBtn');

function renderStudentList() {
    if (students.length === 0) {
        studentsList.innerHTML = '<p class="no-students">No students yet. Add students above to get started.</p>';
        emptyState.style.display = 'flex';
        saveBtn.style.display = 'none';
        document.getElementById('attendanceTable').style.display = 'none';
    } else {
        studentsList.innerHTML = '';
        students.forEach(function (stu, index) {
            var div = document.createElement('div');
            div.className = 'student-item';
            div.innerHTML =
                '<span class="student-num">' + (index + 1) + '</span>' +
                '<span class="student-name">' + stu.name + '</span>' +
                '<button class="delete-student-btn" data-id="' + stu.id + '" title="Remove student"><i class="fas fa-trash-alt"></i></button>';
            studentsList.appendChild(div);
        });
        emptyState.style.display = 'none';
        saveBtn.style.display = 'flex';
        document.getElementById('attendanceTable').style.display = 'table';
        buildTable();
    }
    updateStats();
}

function buildTable() {
    tableBody.innerHTML = '';
    students.forEach(function (stu, index) {
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + (index + 1) + '</td>' +
            '<td>' + stu.name + '</td>' +
            '<td><div class="status-group" data-id="' + stu.id + '">' +
                '<button type="button" class="status-btn" data-status="present">Present</button>' +
                '<button type="button" class="status-btn" data-status="absent">Absent</button>' +
                '<button type="button" class="status-btn" data-status="late">Late</button>' +
            '</div></td>';
        tableBody.appendChild(tr);

        if (statusMap[stu.id]) {
            tr.querySelectorAll('.status-btn').forEach(function (b) {
                if (b.getAttribute('data-status') === statusMap[stu.id]) b.classList.add('active-' + statusMap[stu.id]);
            });
        }
    });
    updateStats();
}

studentsList.addEventListener('click', function (e) {
    var btn = e.target.closest('.delete-student-btn');
    if (!btn) return;
    var studentId = parseInt(btn.getAttribute('data-id'));
    var item = btn.closest('.student-item');

    if (!confirm('Remove this student? This will also delete their attendance records.')) return;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    fetch('/api/students/' + student_id + '?teacher_id=' + user.id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + user.id }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        if (data.success) {
            students = students.filter(function (s) { return s.id !== studentId; });
            delete statusMap[studentId];
            renderStudentList();
            showToast('Student removed', 'info');
        } else {
            btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            btn.disabled = false;
            showToast(data.message, 'error');
        }
    })
    .catch(function () {
        btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        btn.disabled = false;
        showToast('Server error.', 'error');
    });
});

document.getElementById('addStudentBtn').addEventListener('click', function () {
    var nameInput = document.getElementById('newStudentName');
    var name = nameInput.value.trim();
    if (!name) { showToast('Enter student name', 'error'); nameInput.focus(); return; }

    var btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + user.id },
        body: JSON.stringify({ name: name, teacher_id: user.id })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        nameInput.value = '';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Add';
        if (data.success) {
            students.push(data.student);
            renderStudentList();
            showToast('Student added', 'success');
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(function () {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Add';
        showToast('Server error.', 'error');
    });
});

document.getElementById('newStudentName').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('addStudentBtn').click();
});

tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.status-btn');
    if (!btn) return;
    var group = btn.closest('.status-group');
    var studentId = parseInt(group.getAttribute('data-id'));
    var status = btn.getAttribute('data-status');
    group.querySelectorAll('.status-btn').forEach(function (b) { b.classList.remove('active-present', 'active-absent', 'active-late'); });
    btn.classList.add('active-' + status);
    statusMap[studentId] = status;
    updateStats();
});

function updateStats() {
    var present = 0, absent = 0, late = 0;
    for (var key in statusMap) {
        if (statusMap[key] === 'present') present++;
        else if (statusMap[key] === 'absent') absent++;
        else if (statusMap[key] === 'late') late++;
    }
    document.getElementById('statTotal').textContent = students.length;
    document.getElementById('statPresent').textContent = present;
    document.getElementById('statAbsent').textContent = absent;
    document.getElementById('statLate').textContent = late;
}

saveBtn.addEventListener('click', function () {
    var count = 0;
    for (var key in statusMap) count++;
    if (count === 0) { showToast('Mark attendance first', 'error'); return; }
    if (count < students.length) { showToast('Some students are not marked yet', 'info'); return; }

    var records = [];
    for (var id in statusMap) { records.push({ student_id: parseInt(id), status: statusMap[id] }); }

    var btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    fetch('/api/save_attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + user.id },
        body: JSON.stringify({ date: dateInput.value, teacher_id: user.id, records: records })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
        if (data.success) {
            statusMap = {};
            renderStudentList();
            showToast('Attendance saved for ' + dateInput.value, 'success');
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(function () {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
        showToast('Server error.', 'error');
    });
});

document.getElementById('logoutBtn').addEventListener('click', function () { sessionStorage.removeItem('user'); window.location.href = '/'; });

function showToast(message, type) {
    type = type || 'info';
    var icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<i class="fas ' + icons[type] + '"></i> ' + message;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(function () { t.classList.add('removing'); setTimeout(function () { t.remove(); }, 250); }, 3000);
}

fetch('/api/students?teacher_id=' + user.id, {
    headers: { 'Authorization': 'Bearer ' + user.id }
}).then(function (res) { return res.json(); })
.then(function (data) {
    if (data.success) { students = data.students; renderStudentList(); }
}).catch(function () { showToast('Failed to load students.', 'error'); });