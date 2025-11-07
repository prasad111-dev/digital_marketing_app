from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
import json
import uuid
from datetime import datetime
import secrets

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change in production

# Ensure directories exist
os.makedirs('data', exist_ok=True)
os.makedirs('temp', exist_ok=True)

# Initialize data files
def init_data_files():
    admin_file = 'data/admin.json'
    clients_file = 'data/clients.json'
    
    # Create admin file if not exists
    if not os.path.exists(admin_file):
        with open(admin_file, 'w') as f:
            json.dump({
                "username": "admin",
                "password": "admin123"
            }, f)
    
    # Create clients file if not exists
    if not os.path.exists(clients_file):
        with open(clients_file, 'w') as f:
            json.dump([], f)

init_data_files()

# Helper functions
def load_admin_credentials():
    with open('data/admin.json', 'r') as f:
        return json.load(f)

def load_clients():
    with open('data/clients.json', 'r') as f:
        return json.load(f)

def save_clients(clients):
    with open('data/clients.json', 'w') as f:
        json.dump(clients, f, indent=2)

def save_uploaded_file(file):
    """Save uploaded file to temp directory and return filename"""
    if file.filename == '':
        return None
    
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join('temp', filename)
    file.save(filepath)
    return filename

# Authentication middleware
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        admin_creds = load_admin_credentials()
        
        if username == admin_creds['username'] and password == admin_creds['password']:
            session['logged_in'] = True
            session['username'] = username
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'})
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

# API Routes
@app.route('/api/clients', methods=['GET', 'POST'])
@login_required
def api_clients():
    if request.method == 'GET':
        clients = load_clients()
        return jsonify(clients)
    
    elif request.method == 'POST':
        data = request.get_json()
        clients = load_clients()
        
        # Generate unique client ID
        client_id = str(uuid.uuid4().hex)[:8]
        
        new_client = {
            'client_id': client_id,
            'name': data['name'],
            'email': data.get('email', ''),
            'tokens': {
                'instagram': data.get('instagram_token', ''),
                'facebook': data.get('facebook_token', ''),
                'linkedin': data.get('linkedin_token', ''),
                'youtube': data.get('youtube_token', '')
            },
            'created_at': datetime.now().isoformat()
        }
        
        clients.append(new_client)
        save_clients(clients)
        
        return jsonify({'success': True, 'client': new_client})

@app.route('/api/upload', methods=['POST'])
@login_required
def api_upload():
    """Handle temporary file uploads"""
    if 'files[]' not in request.files:
        return jsonify({'success': False, 'error': 'No files uploaded'})
    
    files = request.files.getlist('files[]')
    uploaded_files = []
    
    for file in files:
        if file and file.filename:
            filename = save_uploaded_file(file)
            if filename:
                uploaded_files.append({
                    'original_name': file.filename,
                    'temp_name': filename,
                    'size': os.path.getsize(os.path.join('temp', filename))
                })
    
    return jsonify({'success': True, 'files': uploaded_files})

@app.route('/api/post', methods=['POST'])
@login_required
def api_post():
    """Handle posting to social media platforms (mock implementation)"""
    data = request.get_json()
    
    client_id = data.get('client_id')
    platforms = data.get('platforms', [])
    media_files = data.get('media_files', [])
    
    # Mock API responses
    results = {}
    
    for platform in platforms:
        # Simulate API calls with random success/failure
        import random
        success = random.choice([True, True, False])  # 66% success rate
        
        if success:
            results[platform] = {
                'status': 'success',
                'message': f'Posted successfully to {platform}',
                'post_id': f'{platform}_{uuid.uuid4().hex[:8]}'
            }
        else:
            results[platform] = {
                'status': 'error',
                'message': f'Failed to post to {platform} (mock error)',
                'error_code': 'MOCK_ERROR_001'
            }
    
    # Clean up temporary files
    for media_file in media_files:
        temp_path = os.path.join('temp', media_file['temp_name'])
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    return jsonify({
        'success': True,
        'results': results,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True)