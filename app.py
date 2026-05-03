from flask import Flask, request, jsonify, render_template
import pymysql
from functools import wraps
import bcrypt

app = Flask(__name__)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Capundagjoven200410',
    'database': 'attendance_db',
    'cursorclass': pymysql.cursors.DictCursor
}

def get_db():
    return pymysql.connect(**DB_CONFIG)

def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, email, role FROM users WHERE id = %s", (int(token),))
            user = cursor.fetchone()
            cursor.close()
            conn.close()
            if not user:
                return jsonify({'success': False, 'message': 'User not found'}), 401
        except:
            return jsonify({'success': False, 'message': 'Server error'}), 500
        return f(*args, **kwargs)
    return wrapped

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register')
def register():
    return render_template('register.html')

@app.route('/teacher')
def teacher():
    return render_template('teacher.html')

@app.route('/student')
def student():
    return render_template('student.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    if not email or not password:
        return jsonify({'success': False, 'message': 'Fill in all fields'})
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password, role FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            cursor.close()
            conn.close()
            return jsonify({
                'success': True,
                'user': {
                    'id': user['id'],
                    'name': user['name'],
                    'email': user['email'],
                    'role': user['role']
                }
            })
        cursor.close()
        conn.close()
        return jsonify({'success': False, 'message': 'Invalid email or password'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'student')
    if not name or not email or not password or len(password) < 6:
        return jsonify({'success': False, 'message': 'Please fill all fields correctly'})
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Email already exists'})
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (name, email, hashed, role)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Account created successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/students')
@login_required
def api_students():
    user_id = request.args.get('teacher_id', '')
    try:
        conn = get_db()
        cursor = conn.cursor()
        if user_id:
            cursor.execute("SELECT * FROM students WHERE teacher_id = %s ORDER BY id", (int(user_id),))
        else:
            cursor.execute("SELECT * FROM students ORDER BY id")
        students = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'students': students})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/students', methods=['POST'])
@login_required
def api_add_student():
    data = request.get_json()
    name = data.get('name', '').strip()
    teacher_id = data.get('teacher_id', '')
    if not name or not teacher_id:
        return jsonify({'success': False, 'message': 'Missing student name'})
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO students (name, teacher_id) VALUES (%s, %s)",
            (name, int(teacher_id))
        )
        conn.commit()
        student_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'student': {'id': student_id, 'name': name}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
@login_required
def api_delete_student(student_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT teacher_id FROM students WHERE id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Student not found'})
        if str(student['teacher_id']) != str(request.args.get('teacher_id', '')):
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Cannot delete this student'})
        cursor.execute("DELETE FROM attendance WHERE student_id = %s", (student_id,))
        cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Student deleted'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/save_attendance', methods=['POST'])
@login_required
def api_save_attendance():
    data = request.get_json()
    date = data.get('date', '')
    teacher_id = data.get('teacher_id', 0)
    records = data.get('records', [])
    if not date or not teacher_id or not records:
        return jsonify({'success': False, 'message': 'Missing data'})
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM attendance WHERE date = %s AND teacher_id = %s", (date, teacher_id))
        for rec in records:
            cursor.execute(
                "INSERT INTO attendance (student_id, date, status, teacher_id) VALUES (%s, %s, %s, %s)",
                (rec['student_id'], date, rec['status'], teacher_id)
            )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Attendance saved for ' + date})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/attendance')
@login_required
def api_attendance():
    user_id = request.args.get('user_id', '')
    if not user_id:
        return jsonify({'success': False, 'message': 'Missing user_id'})
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM students WHERE name = (SELECT name FROM users WHERE id = %s)",
            (int(user_id),)
        )
        student = cursor.fetchone()
        if not student:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Student not found'})
        cursor.execute(
            "SELECT date, status FROM attendance WHERE student_id = %s ORDER BY date DESC",
            (student['id'],)
        )
        records = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'records': records})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    print("=" * 40)
    print("  ATTENDANCE SYSTEM")
    print("  http://localhost:5000")
    print("=" * 40)
    app.run(debug=True, port=5000)