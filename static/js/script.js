var loginForm = document.getElementById('loginForm');
var emailInput = document.getElementById('email');
var pwInput = document.getElementById('password');
var submitBtn = document.getElementById('submitBtn');
var toastContainer = document.getElementById('toastContainer');

function getRole() {
    var c = document.querySelector('input[name="role"]:checked');
    return c ? c.value : 'student';
}

document.querySelector('.toggle-pw').addEventListener('click', function () {
    var icon = this.querySelector('i');
    if (pwInput.type === 'password') { pwInput.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { pwInput.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
});

function showError(el, id, msg) { el.classList.add('error'); document.getElementById(id).querySelector('span').textContent = msg; document.getElementById(id).classList.add('visible'); }
function clearError(el, id) { el.classList.remove('error'); document.getElementById(id).classList.remove('visible'); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function showToast(message, type) {
    type = type || 'info';
    var icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<i class="fas ' + icons[type] + '"></i> ' + message;
    toastContainer.appendChild(t);
    setTimeout(function () { t.classList.add('removing'); setTimeout(function () { t.remove(); }, 250); }, 3000);
}

emailInput.addEventListener('input', function () { if (this.classList.contains('error')) clearError(this, 'emailErr'); });
pwInput.addEventListener('input', function () { if (this.classList.contains('error')) clearError(this, 'pwErr'); });

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;
    var email = emailInput.value.trim();
    var pw = pwInput.value;
    if (!email) { showError(emailInput, 'emailErr', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { showError(emailInput, 'emailErr', 'Invalid email format'); valid = false; }
    else { clearError(emailInput, 'emailErr'); }
    if (!pw) { showError(pwInput, 'pwErr', 'Password is required'); valid = false; }
    else { clearError(pwInput, 'pwErr'); }
    if (!valid) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: pw })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        if (data.success) {
            sessionStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = data.user.role === 'teacher' ? '/teacher' : '/student';
        } else {
            showError(pwInput, 'pwErr', 'Invalid email or password');
            showToast(data.message, 'error');
        }
    })
    .catch(function () {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showToast('Server error.', 'error');
    });
});