var user = sessionStorage.getItem('user');
if (!user) { window.location.href = '/'; }
user = JSON.parse(user);

document.getElementById('userName').textContent = user.name;
document.getElementById('welcomeMsg').textContent = 'Welcome, ' + user.name + '!';
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

fetch('/api/attendance?user_id=' + user.id, {
    headers: { 'Authorization': 'Bearer ' + user.id }
}).then(function (res) { return res.json(); })
.then(function (data) {
    if (!data.success) {
        document.getElementById('percentDesc').textContent = 'No records yet.';
        return;
    }

    var records = data.records;
    var total = records.length, present = 0, absent = 0, late = 0;
    records.forEach(function (r) {
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'late') late++;
    });

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPresent').textContent = present;
    document.getElementById('statAbsent').textContent = absent;
    document.getElementById('statLate').textContent = late;

    if (total === 0) return;

    var percent = Math.round(((present + late) / total) * 100);
    document.getElementById('percentText').textContent = percent + '%';

    var deg = (percent / 100) * 360;
    var circle = document.getElementById('percentCircle');
    var color = percent >= 75 ? 'var(--success)' : percent >= 50 ? 'var(--late-color)' : 'var(--danger)';
    circle.style.background = 'conic-gradient(' + color + ' ' + deg + 'deg, rgba(255,255,255,0.06) ' + deg + 'deg)';

    var desc = '';
    if (percent >= 90) desc = 'Excellent! Almost perfect attendance.';
    else if (percent >= 75) desc = 'Good job. Keep it up.';
    else if (percent >= 50) desc = 'Needs improvement.';
    else desc = 'Warning: Too many absences.';
    document.getElementById('percentDesc').textContent = desc;

    var tbody = document.getElementById('recordsBody');
    records.forEach(function (r) {
        var tr = document.createElement('tr');
        var parts = r.date.split('-');
        var formatted = months[parseInt(parts[1]) - 1] + ' ' + parseInt(parts[2]) + ', ' + parts[0];
        var statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);
        tr.innerHTML = '<td>' + formatted + '</td><td><span class="badge badge-' + r.status + '">' + statusLabel + '</span></td>';
        tbody.appendChild(tr);
    });
}).catch(function () {
    document.getElementById('percentDesc').textContent = 'Failed to load records.';
});

document.getElementById('logoutBtn').addEventListener('click', function () { sessionStorage.removeItem('user'); window.location.href = '/'; });