#!/usr/bin/env python3

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

supabase: Client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Create default admin user
admin_user = {
    "email": "admin@sacdentalcare.com",
    "full_name": "System Administrator",
    "role": "admin",
    "phone": "+1234567890",
    "department": "Administration",
    "is_active": True,
    "password_hash": hash_password("123456Pp")
}

try:
    result = supabase.table('users').insert(admin_user).execute()
    print("Admin user created successfully!")
    print("Email: admin@sacdentalcare.com")
    print("Password: 123456Pp")
except Exception as e:
    print(f"Error creating admin user: {e}")