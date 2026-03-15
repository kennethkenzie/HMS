#!/usr/bin/env python3
"""
Backend API Testing for Hospital Management System
Focus: Consent Form Template & Fields Testing
"""

import requests
import json
import sys
from datetime import datetime, timezone
import os

# Get backend URL from environment
BACKEND_URL = "https://careportal-27.preview.emergentagent.com/api"

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}")
    if details:
        print(f"   {details}")
    print()

def test_api_health():
    """Test if API is accessible"""
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        if response.status_code == 200:
            log_test("API Health Check", "PASS", f"API is accessible: {response.json()}")
            return True
        else:
            log_test("API Health Check", "FAIL", f"Status: {response.status_code}")
            return False
    except Exception as e:
        log_test("API Health Check", "FAIL", f"Error: {str(e)}")
        return False

def get_test_data():
    """Get existing patients and doctors for testing"""
    try:
        # Get patients
        patients_response = requests.get(f"{BACKEND_URL}/patients", timeout=10)
        patients = patients_response.json() if patients_response.status_code == 200 else []
        
        # Get doctors/users
        users_response = requests.get(f"{BACKEND_URL}/users/all", timeout=10)
        users = users_response.json() if users_response.status_code == 200 else []
        doctors = [u for u in users if u.get('role') in ['doctor', 'dentist']]
        
        log_test("Test Data Retrieval", "PASS", f"Found {len(patients)} patients, {len(doctors)} doctors")
        
        return {
            'patients': patients[:5],  # Use first 5 patients
            'doctors': doctors[:5]     # Use first 5 doctors
        }
    except Exception as e:
        log_test("Test Data Retrieval", "FAIL", f"Error: {str(e)}")
        return {'patients': [], 'doctors': []}

def test_consent_form_creation_patient_signer(test_data):
    """Test Case A: Create consent form with signer_type='patient'"""
    if not test_data['patients'] or not test_data['doctors']:
        log_test("Consent Form Creation (Patient Signer)", "FAIL", "No test data available")
        return None
    
    patient = test_data['patients'][0]
    doctor = test_data['doctors'][0]
    
    consent_data = {
        "patient_id": patient['patient_id'],
        "doctor_id": doctor['id'],
        "procedure_name": "Appendectomy",
        "operation_date": "2025-01-15",
        "responsible_doctor_name": doctor['full_name'],
        "signer_type": "patient",
        "signer_name": patient['full_name'],
        "next_of_kin_name": "",  # Empty for patient signer
        "form_content": f"CONSENT FOR SURGICAL PROCEDURE\n\nI, {patient['full_name']}, hereby consent to the surgical procedure known as Appendectomy to be performed by Dr. {doctor['full_name']} on {patient['full_name']}.\n\nDate of Operation: 2025-01-15\nResponsible Doctor: {doctor['full_name']}\n\nI understand the risks and benefits of this procedure and consent to its performance.\n\nSigned: {patient['full_name']} (Patient)\nDate: {datetime.now().strftime('%Y-%m-%d')}"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/forms/consent",
            json=consent_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            # Verify all required fields are present
            required_fields = ['id', 'form_number', 'patient_id', 'doctor_id', 'procedure_name', 
                             'operation_date', 'responsible_doctor_name', 'signer_type', 
                             'signer_name', 'form_content', 'consent_date', 'created_at']
            
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                log_test("Consent Form Creation (Patient Signer)", "FAIL", 
                        f"Missing fields: {missing_fields}")
                return None
            
            # Verify signer_type and related fields
            if result['signer_type'] != 'patient':
                log_test("Consent Form Creation (Patient Signer)", "FAIL", 
                        f"Expected signer_type='patient', got '{result['signer_type']}'")
                return None
            
            if result['signer_name'] != patient['full_name']:
                log_test("Consent Form Creation (Patient Signer)", "FAIL", 
                        f"Signer name mismatch: expected '{patient['full_name']}', got '{result['signer_name']}'")
                return None
            
            # Verify next_of_kin_name is empty for patient signer
            if result.get('next_of_kin_name'):
                log_test("Consent Form Creation (Patient Signer)", "FAIL", 
                        f"next_of_kin_name should be empty for patient signer, got '{result['next_of_kin_name']}'")
                return None
            
            log_test("Consent Form Creation (Patient Signer)", "PASS", 
                    f"Form created with ID: {result['id']}, Form Number: {result['form_number']}")
            return result
        else:
            log_test("Consent Form Creation (Patient Signer)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Consent Form Creation (Patient Signer)", "FAIL", f"Error: {str(e)}")
        return None

def test_consent_form_creation_next_of_kin_signer(test_data):
    """Test Case B: Create consent form with signer_type='next_of_kin'"""
    if not test_data['patients'] or not test_data['doctors']:
        log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", "No test data available")
        return None
    
    patient = test_data['patients'][1] if len(test_data['patients']) > 1 else test_data['patients'][0]
    doctor = test_data['doctors'][1] if len(test_data['doctors']) > 1 else test_data['doctors'][0]
    
    next_of_kin_name = "Sarah Johnson"
    signer_name = "Sarah Johnson"
    
    consent_data = {
        "patient_id": patient['patient_id'],
        "doctor_id": doctor['id'],
        "procedure_name": "Cardiac Bypass Surgery",
        "operation_date": "2025-01-20",
        "responsible_doctor_name": doctor['full_name'],
        "signer_type": "next_of_kin",
        "signer_name": signer_name,
        "next_of_kin_name": next_of_kin_name,
        "form_content": f"CONSENT FOR SURGICAL PROCEDURE\n\nI, {signer_name}, as the next of kin of {patient['full_name']}, hereby consent to the surgical procedure known as Cardiac Bypass Surgery to be performed by Dr. {doctor['full_name']} on {patient['full_name']}.\n\nDate of Operation: 2025-01-20\nResponsible Doctor: {doctor['full_name']}\nNext of Kin: {next_of_kin_name}\n\nI understand the risks and benefits of this procedure and consent to its performance on behalf of the patient.\n\nSigned: {signer_name} (Next of Kin)\nDate: {datetime.now().strftime('%Y-%m-%d')}"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/forms/consent",
            json=consent_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            # Verify all required fields are present
            required_fields = ['id', 'form_number', 'patient_id', 'doctor_id', 'procedure_name', 
                             'operation_date', 'responsible_doctor_name', 'signer_type', 
                             'signer_name', 'next_of_kin_name', 'form_content', 'consent_date', 'created_at']
            
            missing_fields = [field for field in required_fields if field not in result]
            if missing_fields:
                log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", 
                        f"Missing fields: {missing_fields}")
                return None
            
            # Verify signer_type and related fields
            if result['signer_type'] != 'next_of_kin':
                log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", 
                        f"Expected signer_type='next_of_kin', got '{result['signer_type']}'")
                return None
            
            if result['signer_name'] != signer_name:
                log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", 
                        f"Signer name mismatch: expected '{signer_name}', got '{result['signer_name']}'")
                return None
            
            if result['next_of_kin_name'] != next_of_kin_name:
                log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", 
                        f"Next of kin name mismatch: expected '{next_of_kin_name}', got '{result['next_of_kin_name']}'")
                return None
            
            log_test("Consent Form Creation (Next of Kin Signer)", "PASS", 
                    f"Form created with ID: {result['id']}, Form Number: {result['form_number']}")
            return result
        else:
            log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            return None
    except Exception as e:
        log_test("Consent Form Creation (Next of Kin Signer)", "FAIL", f"Error: {str(e)}")
        return None

def test_consent_form_retrieval_by_patient(test_data, created_forms):
    """Test retrieving consent forms by patient_id"""
    if not created_forms:
        log_test("Consent Form Retrieval (By Patient)", "FAIL", "No created forms to test with")
        return
    
    patient_id = created_forms[0]['patient_id']
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/forms/consent?patient_id={patient_id}",
            timeout=10
        )
        
        if response.status_code == 200:
            forms = response.json()
            if not isinstance(forms, list):
                log_test("Consent Form Retrieval (By Patient)", "FAIL", 
                        f"Expected list, got {type(forms)}")
                return
            
            # Check if our created form is in the results
            found_form = None
            for form in forms:
                if form['id'] == created_forms[0]['id']:
                    found_form = form
                    break
            
            if not found_form:
                log_test("Consent Form Retrieval (By Patient)", "FAIL", 
                        f"Created form not found in results for patient {patient_id}")
                return
            
            # Verify no MongoDB _id field is present
            if '_id' in found_form:
                log_test("Consent Form Retrieval (By Patient)", "FAIL", 
                        "MongoDB _id field leaked in response")
                return
            
            # Verify date serialization
            date_fields = ['consent_date', 'created_at']
            for field in date_fields:
                if field in found_form and not isinstance(found_form[field], str):
                    log_test("Consent Form Retrieval (By Patient)", "FAIL", 
                            f"Date field '{field}' not serialized as string")
                    return
            
            log_test("Consent Form Retrieval (By Patient)", "PASS", 
                    f"Retrieved {len(forms)} forms for patient {patient_id}")
        else:
            log_test("Consent Form Retrieval (By Patient)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Consent Form Retrieval (By Patient)", "FAIL", f"Error: {str(e)}")

def test_consent_form_retrieval_by_doctor(test_data, created_forms):
    """Test retrieving consent forms by doctor_id"""
    if not created_forms:
        log_test("Consent Form Retrieval (By Doctor)", "FAIL", "No created forms to test with")
        return
    
    doctor_id = created_forms[0]['doctor_id']
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/forms/consent?doctor_id={doctor_id}",
            timeout=10
        )
        
        if response.status_code == 200:
            forms = response.json()
            if not isinstance(forms, list):
                log_test("Consent Form Retrieval (By Doctor)", "FAIL", 
                        f"Expected list, got {type(forms)}")
                return
            
            # Check if our created form is in the results
            found_form = None
            for form in forms:
                if form['id'] == created_forms[0]['id']:
                    found_form = form
                    break
            
            if not found_form:
                log_test("Consent Form Retrieval (By Doctor)", "FAIL", 
                        f"Created form not found in results for doctor {doctor_id}")
                return
            
            # Verify no MongoDB _id field is present
            if '_id' in found_form:
                log_test("Consent Form Retrieval (By Doctor)", "FAIL", 
                        "MongoDB _id field leaked in response")
                return
            
            log_test("Consent Form Retrieval (By Doctor)", "PASS", 
                    f"Retrieved {len(forms)} forms for doctor {doctor_id}")
        else:
            log_test("Consent Form Retrieval (By Doctor)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Consent Form Retrieval (By Doctor)", "FAIL", f"Error: {str(e)}")

def test_consent_form_retrieval_all():
    """Test retrieving all consent forms"""
    try:
        response = requests.get(f"{BACKEND_URL}/forms/consent", timeout=10)
        
        if response.status_code == 200:
            forms = response.json()
            if not isinstance(forms, list):
                log_test("Consent Form Retrieval (All)", "FAIL", 
                        f"Expected list, got {type(forms)}")
                return
            
            # Verify no MongoDB _id fields are present
            for form in forms:
                if '_id' in form:
                    log_test("Consent Form Retrieval (All)", "FAIL", 
                            "MongoDB _id field leaked in response")
                    return
            
            log_test("Consent Form Retrieval (All)", "PASS", 
                    f"Retrieved {len(forms)} total consent forms")
        else:
            log_test("Consent Form Retrieval (All)", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Consent Form Retrieval (All)", "FAIL", f"Error: {str(e)}")

def main():
    """Main test execution"""
    print("=" * 60)
    print("HOSPITAL MANAGEMENT SYSTEM - CONSENT FORM BACKEND TESTING")
    print("=" * 60)
    print()
    
    # Test API health
    if not test_api_health():
        print("❌ API is not accessible. Exiting tests.")
        sys.exit(1)
    
    # Get test data
    test_data = get_test_data()
    if not test_data['patients'] or not test_data['doctors']:
        print("❌ No test data available. Cannot proceed with consent form tests.")
        sys.exit(1)
    
    # Store created forms for retrieval tests
    created_forms = []
    
    # Test Case A: Patient signer
    patient_form = test_consent_form_creation_patient_signer(test_data)
    if patient_form:
        created_forms.append(patient_form)
    
    # Test Case B: Next of kin signer
    next_of_kin_form = test_consent_form_creation_next_of_kin_signer(test_data)
    if next_of_kin_form:
        created_forms.append(next_of_kin_form)
    
    # Test retrieval endpoints
    test_consent_form_retrieval_by_patient(test_data, created_forms)
    test_consent_form_retrieval_by_doctor(test_data, created_forms)
    test_consent_form_retrieval_all()
    
    print("=" * 60)
    print("CONSENT FORM BACKEND TESTING COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()