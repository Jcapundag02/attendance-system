var registerForm = document.getElementById('registerForm');
var nameInput = document.getElementById('regName');
var emailInput = document.getElementById('regEmail');
var pwInput = document.getElementById('regPw');
var pw2Input = document.getElementById('regPwConfirm');
var submitBtn = document.getElementById('submitBtn');
var toastContainer = document.getElementById('toastContainer');

function getRole() { var c = document.querySelector('input[name="role"]:checked'); return c ? c.value : 'student'; }

document.querySelectorAll('.toggle-pw').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var input = this.parentElement.querySelector('input');
        var icon = this.querySelector('i');
        if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
        else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
    });
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

nameInput.addEventListener('input', function () { if (this.classList.contains('error')) clearError(this, 'nameErr'); });
emailInput.addEventListener('input', function () { if (this.classList.contains('error')) clearError(this, 'emailErr'); });
pwInput.addEventListener('input', function () { if (this.classList.contains('error')) clearError(this, 'pwErr'); });
pw2Input.addEventListener('input', function () { if (this.classList.contains('error')) clearError(this, 'pw2Err'); });

registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var valid = true;
    var name = nameInput.value.trim();
    var email = emailInput.value.trim();
    var pw = pwInput.value;
    var pw2 = pw2Input.value;
    var role = getRole();

    if (!name) { showError(nameInput, 'nameErr', 'Name is required'); valid = false; }
    else if (name.length < 2) { showError(nameInput, 'nameErr', 'Name is too short'); valid = false; }
    else { clearError(nameInput, 'nameErr'); }

    if (!email) { showError(emailInput, 'emailErr', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { showError(emailInput, 'emailErr', 'Invalid email format'); valid = false; }
    else { clearError(emailInput, 'emailErr'); }

    if (!pw) { showError(pwInput, 'pwErr', 'Password is required'); valid = false; }
    else if (pw.length < 6) { showError(pwInput, 'pwErr', 'Minimum 6 characters'); valid = false; }
    else { clearError(pwInput, 'pwErr'); }

    if (!pw2) { showError(pw2Input, 'pw2Err', 'Please confirm password'); valid = false; }
    else if (pw !== pw2) { showError(pw2Input, 'pw2Err', 'Passwords do not match'); valid = false; }
    else { clearError(pw2Input, 'pw2Err'); }

    if (!valid) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: pw, role: role })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        if (data.success) {
            showToast('Account created successfully!', 'success');
            registerForm.reset();
            setTimeout(function () { window.location.href = '/'; }, 1500);
        } else {
            if (data.message.indexOf('exists') > -1) showError(emailInput, 'emailErr', 'Email already taken');
            else showToast(data.message, 'error');
        }
    })
    .catch(function () {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showToast('Server error.', 'error');
    });
});