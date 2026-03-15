from supabase import create_client
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(url, key)

def check_consultations():
    result = supabase.table('consultations').select('*').execute()
    print(f"Total consultations: {len(result.data)}")
    for c in result.data:
        print(c)

if __name__ == "__main__":
    check_consultations()
