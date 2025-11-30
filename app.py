"""
InnovateHive Landing Page - Flask Backend
Handles form submissions, database operations, and routing
"""

from flask import Flask, render_template, request, jsonify
from datetime import datetime
import sqlite3
import json
import os
import re

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')

# Database configuration
DATABASE = 'database.db'

# ====================
# Database Functions
# ====================

def get_db_connection():
    """Create database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create newsletter subscribers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

# Initialize database on startup
init_db()

# ====================
# Helper Functions
# ====================

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def sanitize_input(text):
    """Basic input sanitization"""
    if not text:
        return ""
    # Remove any potential HTML/script tags
    text = re.sub(r'<[^>]*>', '', text)
    return text.strip()

# ====================
# Routes
# ====================

@app.route('/')
def index():
    """Render landing page"""
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit_contact():
    """Handle contact form submission"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Validate required fields
        if not data or not all(key in data for key in ['name', 'email', 'message']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Extract and sanitize data
        name = sanitize_input(data.get('name'))
        email = sanitize_input(data.get('email'))
        message = sanitize_input(data.get('message'))
        
        # Validate inputs
        if not name or len(name) < 2:
            return jsonify({'error': 'Name must be at least 2 characters'}), 400
        
        if not validate_email(email):
            return jsonify({'error': 'Invalid email address'}), 400
        
        if not message or len(message) < 10:
            return jsonify({'error': 'Message must be at least 10 characters'}), 400
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO contacts (name, email, message)
            VALUES (?, ?, ?)
        ''', (name, email, message))
        
        conn.commit()
        contact_id = cursor.lastrowid
        conn.close()
        
        # Log submission (in production, send email notification)
        print(f"New contact submission (ID: {contact_id})")
        print(f"Name: {name}")
        print(f"Email: {email}")
        print(f"Message: {message[:50]}...")
        
        return jsonify({
            'success': True,
            'message': 'Thank you for contacting us! We will get back to you soon.',
            'id': contact_id
        }), 200
        
    except Exception as e:
        print(f"Error in contact form submission: {str(e)}")
        return jsonify({'error': 'Internal server error. Please try again later.'}), 500

@app.route('/newsletter', methods=['POST'])
def subscribe_newsletter():
    """Handle newsletter subscription"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        # Validate email
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = sanitize_input(data.get('email'))
        
        if not validate_email(email):
            return jsonify({'error': 'Invalid email address'}), 400
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO newsletter_subscribers (email)
                VALUES (?)
            ''', (email,))
            conn.commit()
            subscriber_id = cursor.lastrowid
            
            print(f"New newsletter subscriber (ID: {subscriber_id}): {email}")
            
            return jsonify({
                'success': True,
                'message': 'Successfully subscribed to newsletter!',
                'id': subscriber_id
            }), 200
            
        except sqlite3.IntegrityError:
            # Email already exists
            return jsonify({'error': 'This email is already subscribed'}), 400
        finally:
            conn.close()
            
    except Exception as e:
        print(f"Error in newsletter subscription: {str(e)}")
        return jsonify({'error': 'Internal server error. Please try again later.'}), 500

@app.route('/contacts')
def view_contacts():
    """View all contact submissions (admin only - add authentication in production)"""
    try:
        conn = get_db_connection()
        contacts = conn.execute('''
            SELECT id, name, email, message, created_at
            FROM contacts
            ORDER BY created_at DESC
        ''').fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        contacts_list = [dict(contact) for contact in contacts]
        
        return jsonify({
            'success': True,
            'count': len(contacts_list),
            'contacts': contacts_list
        }), 200
        
    except Exception as e:
        print(f"Error fetching contacts: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/subscribers')
def view_subscribers():
    """View all newsletter subscribers (admin only - add authentication in production)"""
    try:
        conn = get_db_connection()
        subscribers = conn.execute('''
            SELECT id, email, subscribed_at, is_active
            FROM newsletter_subscribers
            WHERE is_active = 1
            ORDER BY subscribed_at DESC
        ''').fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        subscribers_list = [dict(subscriber) for subscriber in subscribers]
        
        return jsonify({
            'success': True,
            'count': len(subscribers_list),
            'subscribers': subscribers_list
        }), 200
        
    except Exception as e:
        print(f"Error fetching subscribers: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ====================
# Error Handlers
# ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

# ====================
# Health Check
# ====================

@app.route('/health')
def health_check():
    """Health check endpoint for deployment monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

# ====================
# Main Entry Point
# ====================

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000, debug=True)

