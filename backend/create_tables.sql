-- Create tables for Hospital Management System

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    specialization VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    password_hash TEXT
);

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    blood_group VARCHAR(5),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    insurance_provider VARCHAR(255),
    insurance_number VARCHAR(100),
    allergies TEXT[],
    chronic_conditions TEXT[],
    current_medications TEXT[],
    assigned_doctor_id UUID REFERENCES users(id),
    assigned_department VARCHAR(100),
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ,
    total_visits INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    registered_by UUID REFERENCES users(id)
);

-- Admissions table
CREATE TABLE admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    admission_reason TEXT,
    admission_type VARCHAR(20),
    ward VARCHAR(50),
    room_number VARCHAR(10),
    bed_number VARCHAR(10),
    estimated_stay_days INTEGER,
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    discharge_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'admitted',
    total_charges DECIMAL(10,2) DEFAULT 0
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    department VARCHAR(100),
    appointment_type VARCHAR(50),
    appointment_date DATE,
    appointment_time TIME,
    reason TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'scheduled',
    queue_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consultations table
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    appointment_id UUID REFERENCES appointments(id),
    chief_complaint TEXT,
    symptoms TEXT[],
    vital_signs JSONB,
    diagnosis TEXT,
    treatment_plan TEXT,
    notes TEXT,
    consultation_date TIMESTAMPTZ DEFAULT NOW(),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    consultation_id UUID REFERENCES consultations(id),
    medications JSONB,
    additional_instructions TEXT,
    prescribed_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Lab tests table
CREATE TABLE lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    consultation_id UUID REFERENCES consultations(id),
    test_name VARCHAR(255),
    test_category VARCHAR(50),
    test_panel VARCHAR(100),
    urgency VARCHAR(20) DEFAULT 'routine',
    sample_type VARCHAR(50),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ordered',
    ordered_date TIMESTAMPTZ DEFAULT NOW(),
    sample_collected_date TIMESTAMPTZ,
    sample_collected_by UUID REFERENCES users(id),
    report_date TIMESTAMPTZ,
    result JSONB,
    result_values JSONB,
    technician_id UUID REFERENCES users(id),
    verified_by UUID REFERENCES users(id),
    verified_date TIMESTAMPTZ,
    comments TEXT,
    critical_values TEXT[]
);

-- Radiology orders table
CREATE TABLE radiology_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    consultation_id UUID REFERENCES consultations(id),
    imaging_type VARCHAR(50),
    body_part VARCHAR(100),
    clinical_indication TEXT,
    urgency VARCHAR(20) DEFAULT 'routine',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ordered',
    ordered_date TIMESTAMPTZ DEFAULT NOW(),
    scheduled_date DATE,
    report_date TIMESTAMPTZ,
    findings TEXT,
    radiologist_id UUID REFERENCES users(id)
);

-- Dental records table
CREATE TABLE dental_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    dentist_id UUID REFERENCES users(id),
    chief_complaint TEXT,
    dental_history TEXT,
    tooth_chart JSONB,
    diagnosis TEXT,
    treatment_plan TEXT,
    procedures_performed TEXT[],
    next_appointment DATE,
    notes TEXT,
    visit_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed'
);

-- Pharmacy orders table
CREATE TABLE pharmacy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    prescription_id VARCHAR(20),
    items JSONB,
    total_amount DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending',
    order_date TIMESTAMPTZ DEFAULT NOW(),
    dispensed_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20),
    reorder_level INTEGER,
    supplier VARCHAR(255),
    unit_price DECIMAL(10,2),
    current_stock INTEGER DEFAULT 0,
    last_restocked TIMESTAMPTZ,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'in-stock'
);

-- Triage forms table
CREATE TABLE triage_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    nurse_id UUID REFERENCES users(id),
    name VARCHAR(255),
    blood_pressure VARCHAR(20),
    spo2_pulse VARCHAR(20),
    temperature VARCHAR(10),
    respiration VARCHAR(10),
    weight VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nursing notes table
CREATE TABLE nursing_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    nurse_id UUID REFERENCES users(id),
    admission_id UUID REFERENCES admissions(id),
    vital_signs JSONB,
    observations TEXT,
    medications_administered JSONB,
    intake_output JSONB,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing table
CREATE TABLE billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    bill_type VARCHAR(50),
    items JSONB,
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    payment_method VARCHAR(50),
    insurance_claim_id UUID,
    notes TEXT,
    bill_date TIMESTAMPTZ DEFAULT NOW(),
    payment_status VARCHAR(20) DEFAULT 'pending',
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2),
    created_by UUID REFERENCES users(id),
    collected_by UUID REFERENCES users(id),
    payment_date TIMESTAMPTZ
);

-- Emergency visits table
CREATE TABLE emergency_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emergency_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    chief_complaint TEXT,
    triage_level VARCHAR(20),
    vital_signs JSONB,
    mode_of_arrival VARCHAR(50),
    attending_doctor_id UUID REFERENCES users(id),
    arrival_time TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'in-progress',
    treatment_summary TEXT,
    discharge_time TIMESTAMPTZ
);

-- Insurance claims table
CREATE TABLE insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    insurance_provider VARCHAR(255),
    policy_number VARCHAR(100),
    claim_amount DECIMAL(10,2),
    bill_ids UUID[],
    diagnosis TEXT,
    treatment_details TEXT,
    claim_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'submitted',
    approved_amount DECIMAL(10,2) DEFAULT 0,
    remarks TEXT
);

-- Surgeries table
CREATE TABLE surgeries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    surgery_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    surgeon_id UUID REFERENCES users(id),
    surgery_name VARCHAR(255),
    surgery_type VARCHAR(20),
    scheduled_date DATE,
    scheduled_time TIME,
    operation_theater VARCHAR(50),
    estimated_duration INTEGER,
    anesthesia_type VARCHAR(50),
    team_members UUID[],
    status VARCHAR(20) DEFAULT 'scheduled',
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    complications TEXT,
    post_op_notes TEXT
);

-- Consent forms table
CREATE TABLE consent_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    procedure_name TEXT,
    procedure_description TEXT,
    risks_explained TEXT,
    benefits_explained TEXT,
    alternatives_discussed TEXT,
    patient_signature TEXT,
    doctor_signature TEXT,
    witness_name VARCHAR(255),
    operation_date DATE,
    responsible_doctor_name VARCHAR(255),
    signer_type VARCHAR(20),
    signer_name VARCHAR(255),
    next_of_kin_name VARCHAR(255),
    form_content TEXT,
    consent_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral forms table
CREATE TABLE referral_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    referring_doctor_id UUID REFERENCES users(id),
    referral_type VARCHAR(20),
    referred_to_doctor VARCHAR(255),
    referred_to_department VARCHAR(100),
    hospital_name VARCHAR(255),
    hospital_address TEXT,
    hospital_contact VARCHAR(50),
    reason_for_referral TEXT,
    clinical_summary TEXT,
    current_medications TEXT,
    relevant_tests TEXT,
    signs_and_symptoms TEXT,
    diagnosis_text TEXT,
    treatment_given TEXT,
    date_first_visit DATE,
    referral_form_content TEXT,
    urgency VARCHAR(20),
    referral_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical forms table
CREATE TABLE medical_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    doctor_id UUID REFERENCES users(id),
    chief_complaint TEXT,
    present_illness_history TEXT,
    past_medical_history TEXT,
    family_history TEXT,
    social_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    physical_examination TEXT,
    vital_signs JSONB,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hospitals table
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    specialties TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10),
    description TEXT,
    head_of_department UUID REFERENCES users(id),
    contact_extension VARCHAR(10),
    floor_location VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dental treatment plans table
CREATE TABLE dental_treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    dentist_id UUID REFERENCES users(id),
    procedures JSONB,
    total_estimated_cost DECIMAL(10,2),
    notes TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Dental xrays table
CREATE TABLE dental_xrays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    xray_id VARCHAR(20) UNIQUE NOT NULL,
    patient_id VARCHAR(20) REFERENCES patients(patient_id),
    dentist_id UUID REFERENCES users(id),
    xray_type VARCHAR(50),
    tooth_number VARCHAR(10),
    findings TEXT,
    image_url TEXT,
    xray_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'completed'
);

-- Enable Row Level Security if needed
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;