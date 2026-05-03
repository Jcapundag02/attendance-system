import pymysql
import bcrypt

connection = pymysql.connect(
    host='localhost',
    user='root',
    password='attendance2025',
    database='attendance_db'
)

cursor = connection.cursor()

users = [
    ('Admin Teacher', 'admin@school.edu', 'admin123', 'teacher'),
    ('Demo Teacher', 'demo@school.edu', 'demo123', 'teacher'),
    ('Demo Student', 'demo@school.edu', 'demo123', 'student')
]

for name, email, password, role in users:
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (name, email, hashed, role)
        )
        print(f"  OK: {email} ({role})")
    except pymysql.IntegrityError:
        print(f"  SKIP: {email} (exists)")

connection.commit()
cursor.close()
connection.close()

print("\nDone. Run: python app.py")