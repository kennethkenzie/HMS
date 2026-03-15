from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
# from emergentintegrations.llm.chat import LlmChat, UserMessage  # Commented out - package not available

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase: Client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

# Supabase-backed compatibility layer for the legacy Mongo-style db.* routes.
def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    return value


def _project_row(row: Dict[str, Any], projection: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not projection:
        return dict(row)
    excluded = {key for key, value in projection.items() if value == 0}
    return {key: value for key, value in row.items() if key not in excluded}


def _matches_query(row: Dict[str, Any], query: Dict[str, Any]) -> bool:
    for field, expected in query.items():
        actual = row.get(field)
        if isinstance(expected, dict):
            if "$in" in expected and actual not in expected["$in"]:
                return False
            if "$ne" in expected and actual == expected["$ne"]:
                return False
            if "$regex" in expected:
                pattern = str(expected["$regex"])
                haystack = "" if actual is None else str(actual)
                if expected.get("$options") == "i":
                    if pattern.lower() not in haystack.lower():
                        return False
                elif pattern not in haystack:
                    return False
        elif actual != expected:
            return False
    return True


class _CompatCursor:
    def __init__(self, rows: List[Dict[str, Any]], projection: Optional[Dict[str, Any]]):
        self._rows = rows
        self._projection = projection

    async def to_list(self, limit: int) -> List[Dict[str, Any]]:
        return [_project_row(row, self._projection) for row in self._rows[:limit]]


class _CompatWriteResult:
    def __init__(self, count: int, deleted: bool = False):
        self.modified_count = count
        self.deleted_count = count if deleted else 0


class _CompatCollection:
    def __init__(self, table_name: str):
        self.table_name = table_name

    def _fetch_rows(self) -> List[Dict[str, Any]]:
        result = supabase.table(self.table_name).select("*").execute()
        return result.data or []

    def _primary_key_filter(self, row: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
        if row.get("id"):
            return {"id": row["id"]}
        return {
            key: value for key, value in fallback.items()
            if not isinstance(value, dict)
        }

    async def insert_one(self, document: Dict[str, Any]) -> None:
        supabase.table(self.table_name).insert(_serialize_value(document)).execute()

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> _CompatCursor:
        rows = [row for row in self._fetch_rows() if _matches_query(row, query or {})]
        return _CompatCursor(rows, projection)

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        rows = [row for row in self._fetch_rows() if _matches_query(row, query)]
        if not rows:
            return None
        return _project_row(rows[0], projection)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> _CompatWriteResult:
        rows = [row for row in self._fetch_rows() if _matches_query(row, query)]
        if not rows:
            return _CompatWriteResult(0)

        current = rows[0]
        update_data = dict(update.get("$set", {}))
        for field, increment in update.get("$inc", {}).items():
            update_data[field] = (current.get(field) or 0) + increment

        update_data = _serialize_value(update_data)
        filters = self._primary_key_filter(current, query)
        request = supabase.table(self.table_name).update(update_data)
        for field, value in filters.items():
            request = request.eq(field, value)
        result = request.execute()
        return _CompatWriteResult(len(result.data or []))

    async def delete_one(self, query: Dict[str, Any]) -> _CompatWriteResult:
        rows = [row for row in self._fetch_rows() if _matches_query(row, query)]
        if not rows:
            return _CompatWriteResult(0, deleted=True)

        filters = self._primary_key_filter(rows[0], query)
        request = supabase.table(self.table_name).delete()
        for field, value in filters.items():
            request = request.eq(field, value)
        result = request.execute()
        return _CompatWriteResult(len(result.data or []), deleted=True)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        rows = [row for row in self._fetch_rows() if _matches_query(row, query)]
        return len(rows)


class _CompatDB:
    def __getattr__(self, table_name: str) -> _CompatCollection:
        return _CompatCollection(table_name)


db = _CompatDB()

# Create the main app without a prefix
app = FastAPI(title="Hospital Management System API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

# User & Auth Models
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    full_name: str
    role: str  # admin, doctor, dentist, nurse, lab_tech, radiologist, pharmacist, receptionist, cashier, accountant, hr_manager, patient
    phone: str
    department: Optional[str] = None
    specialization: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Patient Models
class PatientBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    patient_id: str = Field(default_factory=lambda: f"PAT{uuid.uuid4().hex[:8].upper()}")
    full_name: str
    date_of_birth: str
    gender: str
    blood_group: Optional[str] = None
    phone: str
    email: Optional[EmailStr] = None
    address: str
    emergency_contact_name: str
    emergency_contact_phone: str
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    allergies: Optional[List[str]] = []
    chronic_conditions: Optional[List[str]] = []
    current_medications: Optional[List[str]] = []
    assigned_doctor_id: Optional[str] = None
    assigned_department: Optional[str] = None

class PatientCreate(PatientBase):
    email: EmailStr
    account_password: str

class Patient(PatientBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    registration_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_visit: Optional[datetime] = None
    total_visits: int = 0
    status: str = "active"  # active, inactive, deceased
    registered_by: Optional[str] = None

# Appointment Models
class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    department: str
    appointment_type: str  # opd, dental, consultation, follow-up
    appointment_date: str
    appointment_time: str
    reason: str
    notes: Optional[str] = None

class Appointment(AppointmentCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    appointment_number: str = Field(default_factory=lambda: f"APT{uuid.uuid4().hex[:8].upper()}")
    status: str = "scheduled"  # scheduled, checked-in, in-progress, completed, cancelled
    queue_number: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Consultation/EMR Models
class ConsultationCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_id: Optional[str] = None
    chief_complaint: str
    symptoms: List[str]
    vital_signs: Dict[str, Any]  # bp, temp, pulse, weight, height, spo2
    diagnosis: str
    treatment_plan: str
    notes: Optional[str] = None

class Consultation(ConsultationCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    consultation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    follow_up_required: bool = False
    follow_up_date: Optional[str] = None

# Prescription Models
class MedicationItem(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    consultation_id: str
    medications: List[MedicationItem]
    additional_instructions: Optional[str] = None

class Prescription(PrescriptionCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prescription_number: str = Field(default_factory=lambda: f"RX{uuid.uuid4().hex[:8].upper()}")
    prescribed_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active, dispensed, expired

# Lab Test Models
class LabTestCreate(BaseModel):
    patient_id: str
    doctor_id: str
    consultation_id: Optional[str] = None
    test_name: str
    test_category: str  # blood, urine, imaging, pathology, microbiology, biochemistry
    test_panel: Optional[str] = None  # comprehensive-metabolic, lipid-panel, cbc, etc.
    urgency: str = "routine"  # routine, urgent, stat
    sample_type: Optional[str] = None  # blood, urine, stool, sputum, etc.
    notes: Optional[str] = None

class LabTest(LabTestCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str = Field(default_factory=lambda: f"LAB{uuid.uuid4().hex[:8].upper()}")
    status: str = "ordered"  # ordered, sample-collected, in-progress, completed, reported
    ordered_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sample_collected_date: Optional[datetime] = None
    sample_collected_by: Optional[str] = None
    report_date: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    result_values: Optional[List[Dict[str, Any]]] = None  # parameter, value, unit, reference_range, status
    technician_id: Optional[str] = None
    verified_by: Optional[str] = None
    verified_date: Optional[datetime] = None
    comments: Optional[str] = None
    critical_values: Optional[List[str]] = None

class LabTestResultUpdate(BaseModel):
    result_values: List[Dict[str, Any]]
    comments: Optional[str] = None
    critical_values: Optional[List[str]] = []

# Radiology/Imaging Models
class RadiologyOrderCreate(BaseModel):
    patient_id: str
    doctor_id: str
    consultation_id: Optional[str] = None
    imaging_type: str  # x-ray, ct-scan, mri, ultrasound
    body_part: str
    clinical_indication: str
    urgency: str = "routine"
    notes: Optional[str] = None

class RadiologyOrder(RadiologyOrderCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = Field(default_factory=lambda: f"RAD{uuid.uuid4().hex[:8].upper()}")
    status: str = "ordered"  # ordered, scheduled, in-progress, completed, reported
    ordered_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduled_date: Optional[datetime] = None
    report_date: Optional[datetime] = None
    findings: Optional[str] = None
    radiologist_id: Optional[str] = None

# Dental Models
class DentalRecordCreate(BaseModel):
    patient_id: str
    dentist_id: str
    chief_complaint: str
    dental_history: Optional[str] = None
    tooth_chart: Optional[Dict[str, Any]] = None
    diagnosis: str
    treatment_plan: str
    procedures_performed: List[str]
    next_appointment: Optional[str] = None
    notes: Optional[str] = None

class DentalRecord(DentalRecordCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    visit_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class DentalTreatmentPlanCreate(BaseModel):
    patient_id: str
    dentist_id: str
    procedures: List[Dict[str, Any]]  # procedure_name, tooth_number, estimated_cost, priority
    total_estimated_cost: float
    notes: Optional[str] = None

class DentalTreatmentPlan(DentalTreatmentPlanCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str = Field(default_factory=lambda: f"DTP{uuid.uuid4().hex[:8].upper()}")
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, in-progress, completed

class DentalXRayCreate(BaseModel):
    patient_id: str
    dentist_id: str
    xray_type: str  # periapical, bitewing, panoramic, cephalometric
    tooth_number: Optional[str] = None
    findings: Optional[str] = None
    image_url: Optional[str] = None

class DentalXRay(DentalXRayCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    xray_id: str = Field(default_factory=lambda: f"XRY{uuid.uuid4().hex[:8].upper()}")
    xray_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

# Pharmacy Models
class PharmacyOrderCreate(BaseModel):
    patient_id: str
    prescription_id: str
    items: List[Dict[str, Any]]  # medicine_name, quantity, unit_price
    total_amount: float
    payment_status: str = "pending"

class PharmacyOrder(PharmacyOrderCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = Field(default_factory=lambda: f"PHR{uuid.uuid4().hex[:8].upper()}")
    order_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    dispensed_by: Optional[str] = None
    status: str = "pending"  # pending, dispensed, completed

# Billing Models
class BillingCreate(BaseModel):
    patient_id: str
    bill_type: str  # opd, ipd, pharmacy, lab, radiology, dental, surgery
    items: List[Dict[str, Any]]  # description, quantity, unit_price, amount
    subtotal: float
    tax_amount: float
    discount_amount: float = 0
    total_amount: float
    payment_method: Optional[str] = None
    insurance_claim_id: Optional[str] = None
    notes: Optional[str] = None

class Billing(BillingCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bill_number: str = Field(default_factory=lambda: f"BILL{uuid.uuid4().hex[:8].upper()}")
    bill_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_status: str = "pending"  # pending, partial, paid
    paid_amount: float = 0
    balance_amount: float
    created_by: Optional[str] = None  # doctor/staff who created the bill
    collected_by: Optional[str] = None  # receptionist who collected payment
    payment_date: Optional[datetime] = None

# IPD/Admission Models
class AdmissionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    admission_reason: str
    admission_type: str  # emergency, planned
    ward: str
    room_number: str
    bed_number: str
    estimated_stay_days: int

class Admission(AdmissionCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admission_id: str = Field(default_factory=lambda: f"ADM{uuid.uuid4().hex[:8].upper()}")
    admission_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    discharge_date: Optional[datetime] = None
    status: str = "admitted"  # admitted, discharged
    total_charges: float = 0

# Emergency Models
class EmergencyVisitCreate(BaseModel):
    patient_id: str
    chief_complaint: str
    triage_level: str  # critical, urgent, semi-urgent, non-urgent
    vital_signs: Dict[str, Any]
    mode_of_arrival: str  # ambulance, walk-in, police, other
    attending_doctor_id: Optional[str] = None

class EmergencyVisit(EmergencyVisitCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    emergency_id: str = Field(default_factory=lambda: f"EMR{uuid.uuid4().hex[:8].upper()}")
    arrival_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "in-progress"  # in-progress, admitted, discharged, referred
    treatment_summary: Optional[str] = None
    discharge_time: Optional[datetime] = None

# Inventory Models
class InventoryItemCreate(BaseModel):
    item_name: str
    item_code: Optional[str] = None
    category: str  # medicine, surgical, dental, lab, consumable
    unit: str
    reorder_level: int
    supplier: str
    unit_price: float
    current_stock: Optional[int] = 0
    expiry_date: Optional[str] = None

class InventoryItem(InventoryItemCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_restocked: Optional[datetime] = None
    status: str = "in-stock"  # in-stock, low-stock, out-of-stock

# Insurance Claim Models
class InsuranceClaimCreate(BaseModel):
    patient_id: str
    insurance_provider: str
    policy_number: str
    claim_amount: float
    bill_ids: List[str]
    diagnosis: str
    treatment_details: str

class InsuranceClaim(InsuranceClaimCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    claim_id: str = Field(default_factory=lambda: f"CLM{uuid.uuid4().hex[:8].upper()}")
    claim_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "submitted"  # submitted, under-review, approved, rejected, paid
    approved_amount: float = 0
    remarks: Optional[str] = None

# Surgery Models
class SurgeryCreate(BaseModel):
    patient_id: str
    surgeon_id: str
    surgery_name: str
    surgery_type: str  # elective, emergency
    scheduled_date: str
    scheduled_time: str
    operation_theater: str
    estimated_duration: int  # in minutes
    anesthesia_type: str
    team_members: List[str]

class Surgery(SurgeryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    surgery_id: str = Field(default_factory=lambda: f"SRG{uuid.uuid4().hex[:8].upper()}")
    status: str = "scheduled"  # scheduled, in-progress, completed, cancelled
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    complications: Optional[str] = None
    post_op_notes: Optional[str] = None

# Nursing Station Models
class TriageFormCreate(BaseModel):
    patient_id: str
    nurse_id: str
    name: str
    blood_pressure: str
    spo2_pulse: str
    temperature: Optional[str] = None
    respiration: str
    weight: Optional[str] = None

class TriageForm(TriageFormCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    form_number: str = Field(default_factory=lambda: f"TRI{uuid.uuid4().hex[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NursingNoteCreate(BaseModel):
    patient_id: str
    nurse_id: str
    admission_id: Optional[str] = None
    vital_signs: Dict[str, Any]
    observations: str
    medications_administered: List[Dict[str, Any]]
    intake_output: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class NursingNote(NursingNoteCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Medical Forms Models
class ConsentFormCreate(BaseModel):
    patient_id: str
    doctor_id: str
    procedure_name: str  # Operation / procedure name
    # Legacy free-text fields (kept optional for backward compatibility)
    procedure_description: Optional[str] = None
    risks_explained: Optional[str] = None
    benefits_explained: Optional[str] = None
    alternatives_discussed: Optional[str] = None
    patient_signature: Optional[str] = None
    doctor_signature: Optional[str] = None
    witness_name: Optional[str] = None
    # New structured fields for official consent template
    operation_date: Optional[str] = None  # e.g., '2025-11-22'
    responsible_doctor_name: Optional[str] = None
    signer_type: Optional[str] = None  # 'patient' or 'next_of_kin'
    signer_name: Optional[str] = None
    next_of_kin_name: Optional[str] = None
    form_content: Optional[str] = None  # Full generated consent text
    consent_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConsentForm(ConsentFormCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    form_number: str = Field(default_factory=lambda: f"CF{uuid.uuid4().hex[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReferralFormCreate(BaseModel):
    patient_id: str
    referring_doctor_id: str
    referral_type: str  # internal, external
    referred_to_doctor: str
    referred_to_department: str
    hospital_name: Optional[str] = None  # For external referrals
    hospital_address: Optional[str] = None  # For external referrals
    hospital_contact: Optional[str] = None  # For external referrals
    reason_for_referral: str
    clinical_summary: str
    current_medications: str
    relevant_tests: Optional[str] = None
    # New fields aligned to paper referral form
    signs_and_symptoms: Optional[str] = None
    diagnosis_text: Optional[str] = None
    treatment_given: Optional[str] = None
    date_first_visit: Optional[str] = None
    referral_form_content: Optional[str] = None  # Full generated referral text
    urgency: str  # routine, urgent, emergency
    referral_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReferralForm(ReferralFormCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    form_number: str = Field(default_factory=lambda: f"RF{uuid.uuid4().hex[:8].upper()}")
    status: str = "pending"  # pending, accepted, completed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MedicalFormCreate(BaseModel):
    patient_id: str
    doctor_id: str
    chief_complaint: str
    present_illness_history: str
    past_medical_history: str
    family_history: Optional[str] = None
    social_history: Optional[str] = None
    allergies: Optional[str] = None
    current_medications: Optional[str] = None
    physical_examination: str
    vital_signs: Dict[str, Any]
    diagnosis: str
    treatment_plan: str
    follow_up: Optional[str] = None

class MedicalForm(MedicalFormCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    form_number: str = Field(default_factory=lambda: f"MF{uuid.uuid4().hex[:8].upper()}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Hospital Model for External Referrals
class HospitalCreate(BaseModel):
    hospital_name: str
    address: str
    phone: str
    email: Optional[str] = None
    specialties: Optional[str] = None

class Hospital(HospitalCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# AI Report Request
class AIReportRequest(BaseModel):
    report_type: str  # medical-summary, discharge-summary, lab-interpretation
    patient_data: Dict[str, Any]

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_inventory_code(category: Optional[str] = None) -> str:
    normalized = "".join(ch for ch in (category or "item").upper() if ch.isalnum())
    prefix = (normalized[:3] or "ITM").ljust(3, "X")
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Simple token validation (in production, use JWT)
    result = supabase.table('users').select('*').eq('id', authorization).execute()
    user = result.data[0] if result.data else None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

def get_current_patient(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Patient access required")

    result = supabase.table('patients').select('*').eq('email', current_user.get('email')).execute()
    patient = result.data[0] if result.data else None
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")
    return patient

# ==================== ROUTES ====================

# Health Check
@api_router.get("/")
async def root():
    return {"message": "Hospital Management System API", "version": "1.0.0"}

# ==================== DEPARTMENT & STAFF ROUTES ====================
@api_router.get("/departments")
async def get_departments():
    departments = [
        {"name": "Emergency", "code": "ER", "description": "Emergency Department"},
        {"name": "Cardiology", "code": "CARD", "description": "Heart and cardiovascular care"},
        {"name": "Orthopedics", "code": "ORTHO", "description": "Bone and joint care"},
        {"name": "Pediatrics", "code": "PED", "description": "Children's healthcare"},
        {"name": "Obstetrics & Gynecology", "code": "OBGYN", "description": "Women's health"},
        {"name": "Neurology", "code": "NEURO", "description": "Brain and nervous system"},
        {"name": "Oncology", "code": "ONCO", "description": "Cancer treatment"},
        {"name": "Psychiatry", "code": "PSYCH", "description": "Mental health"},
        {"name": "Dermatology", "code": "DERM", "description": "Skin care"},
        {"name": "ENT", "code": "ENT", "description": "Ear, Nose, and Throat"},
        {"name": "Ophthalmology", "code": "OPHT", "description": "Eye care"},
        {"name": "General Medicine", "code": "GEN", "description": "General medical care"},
        {"name": "Surgery", "code": "SURG", "description": "Surgical procedures"},
        {"name": "Dental", "code": "DENT", "description": "Dental care"},
        {"name": "Radiology", "code": "RAD", "description": "Medical imaging"},
        {"name": "Laboratory", "code": "LAB", "description": "Medical testing"},
        {"name": "Pharmacy", "code": "PHAR", "description": "Medication dispensing"},
    ]
    return departments

@api_router.get("/doctors")
async def get_doctors(department: Optional[str] = None):
    query = {"role": {"$in": ["doctor", "dentist"]}, "is_active": True}
    if department:
        query["department"] = department
    doctors = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
    return doctors

@api_router.get("/staff")
async def get_staff(role: Optional[str] = None):
    query = {"is_active": True}
    if role:
        query["role"] = role
    staff = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
    return staff

@api_router.get("/users/all")
async def get_all_users(include_inactive: bool = False):
    query = {} if include_inactive else {"is_active": True}
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(500)
    return users

@api_router.get("/users/{user_id}")
async def get_user_by_id(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_update: Dict[str, Any]):
    # Remove fields that shouldn't be updated directly
    user_update.pop("password_hash", None)
    user_update.pop("id", None)
    user_update.pop("created_at", None)
    
    result = await db.users.update_one({"id": user_id}, {"$set": user_update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated successfully"}

@api_router.put("/users/{user_id}/password")
async def update_user_password(user_id: str, new_password: str):
    hashed_pw = hash_password(new_password)
    result = await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hashed_pw}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password updated successfully"}

@api_router.delete("/users/{user_id}")
async def deactivate_user(user_id: str):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated successfully"}

@api_router.put("/users/{user_id}/activate")
async def activate_user(user_id: str):
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User activated successfully"}

# Department Management
@api_router.post("/departments/custom")
async def create_custom_department(department: Dict[str, Any]):
    # Store custom departments in database
    dept_obj = {
        "id": str(uuid.uuid4()),
        "name": department["name"],
        "code": department.get("code", department["name"][:4].upper()),
        "description": department.get("description", ""),
        "head_of_department": department.get("head_of_department"),
        "contact_extension": department.get("contact_extension"),
        "floor_location": department.get("floor_location"),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.departments.insert_one(dept_obj)
    return dept_obj

@api_router.get("/departments/custom")
async def get_custom_departments():
    departments = await db.departments.find({"status": "active"}, {"_id": 0}).to_list(100)
    return departments

@api_router.put("/departments/custom/{dept_id}")
async def update_department(dept_id: str, department_update: Dict[str, Any]):
    result = await db.departments.update_one({"id": dept_id}, {"$set": department_update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department updated successfully"}

@api_router.delete("/departments/custom/{dept_id}")
async def delete_department(dept_id: str):
    result = await db.departments.update_one({"id": dept_id}, {"$set": {"status": "inactive"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted successfully"}

# Roles Management
@api_router.get("/roles")
async def get_roles():
    roles = [
        {
            "name": "admin",
            "display_name": "Administrator",
            "description": "Full system access and management",
            "permissions": ["all"]
        },
        {
            "name": "doctor",
            "display_name": "Doctor",
            "description": "Medical consultations and patient care",
            "permissions": ["patients.view", "patients.create", "consultations.all", "prescriptions.all", "lab.order", "radiology.order"]
        },
        {
            "name": "dentist",
            "display_name": "Dentist",
            "description": "Dental care and procedures",
            "permissions": ["patients.view", "dental.all", "prescriptions.all"]
        },
        {
            "name": "nurse",
            "display_name": "Nurse",
            "description": "Patient care and nursing duties",
            "permissions": ["patients.view", "nursing.all", "vitals.all", "medications.administer"]
        },
        {
            "name": "receptionist",
            "display_name": "Receptionist",
            "description": "Patient registration and appointments",
            "permissions": ["patients.all", "appointments.all", "reception.all"]
        },
        {
            "name": "lab_tech",
            "display_name": "Lab Technician",
            "description": "Laboratory testing and results",
            "permissions": ["lab.all", "patients.view"]
        },
        {
            "name": "radiologist",
            "display_name": "Radiologist",
            "description": "Medical imaging and radiology",
            "permissions": ["radiology.all", "patients.view"]
        },
        {
            "name": "pharmacist",
            "display_name": "Pharmacist",
            "description": "Medication dispensing and management",
            "permissions": ["pharmacy.all", "prescriptions.view", "inventory.medicines"]
        },
        {
            "name": "cashier",
            "display_name": "Cashier",
            "description": "Billing and payment processing",
            "permissions": ["billing.all", "payments.all"]
        },
        {
            "name": "accountant",
            "display_name": "Accountant",
            "description": "Financial management and reporting",
            "permissions": ["billing.view", "payments.view", "reports.financial", "insurance.all"]
        },
        {
            "name": "hr_manager",
            "display_name": "HR Manager",
            "description": "Human resources and staff management",
            "permissions": ["staff.all", "attendance.all", "payroll.all"]
        },
        {
            "name": "inventory_manager",
            "display_name": "Inventory Manager",
            "description": "Stock and supply management",
            "permissions": ["inventory.all", "procurement.all"]
        }
    ]
    return roles

# Statistics
@api_router.get("/admin/statistics")
def get_admin_statistics():
    total_users_result = supabase.table('users').select('*', count='exact').execute()
    total_users = total_users_result.count
    active_users_result = supabase.table('users').select('*', count='exact').eq('is_active', True).execute()
    active_users = active_users_result.count
    inactive_users = total_users - active_users

    # Count by role
    roles_count = {}
    all_users_result = supabase.table('users').select('role').execute()
    all_users = all_users_result.data
    for user in all_users:
        role = user.get("role", "unknown")
        roles_count[role] = roles_count.get(role, 0) + 1

    total_patients_result = supabase.table('patients').select('*', count='exact').execute()
    total_patients = total_patients_result.count
    total_departments_result = supabase.table('departments').select('*', count='exact').eq('status', 'active').execute()
    total_departments = total_departments_result.count + 17  # 17 default + custom

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "roles_distribution": roles_count,
        "total_patients": total_patients,
        "total_departments": total_departments
    }

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register", response_model=User)
def register_user(user_input: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create staff accounts")

    # Check if user exists
    result = supabase.table('users').select('*').eq('email', user_input.email).execute()
    existing_user = result.data[0] if result.data else None
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_pw = hash_password(user_input.password)

    # Create user
    user_dict = user_input.model_dump()
    user_dict.pop('password')
    user_obj = User(**user_dict)

    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password_hash'] = hashed_pw

    supabase.table('users').insert(doc).execute()
    return user_obj

@api_router.post("/auth/login")
def login(login_req: LoginRequest):
    result = supabase.table('users').select('*').eq('email', login_req.email).execute()
    user = result.data[0] if result.data else None
    if not user or not verify_password(login_req.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "token": user['id'],
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "role": user['role'],
            "department": user.get('department')
        }
    }

@api_router.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== PATIENT ROUTES ====================
@api_router.post("/patients", response_model=Patient)
def create_patient(patient_input: PatientCreate, registered_by: Optional[str] = None):
    existing_patient = supabase.table('patients').select('id').eq('email', patient_input.email).execute()
    if existing_patient.data:
        raise HTTPException(status_code=400, detail="Patient email already exists")

    existing_user = supabase.table('users').select('id').eq('email', patient_input.email).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    patient_data = patient_input.model_dump()
    account_password = patient_data.pop('account_password')

    patient_obj = Patient(**patient_data)
    if registered_by:
        patient_obj.registered_by = registered_by
    doc = patient_obj.model_dump()
    doc['registration_date'] = doc['registration_date'].isoformat()

    patient_user = {
        "email": patient_obj.email,
        "full_name": patient_obj.full_name,
        "role": "patient",
        "phone": patient_obj.phone,
        "department": "Patient Portal",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "password_hash": hash_password(account_password)
    }

    supabase.table('users').insert(patient_user).execute()
    supabase.table('patients').insert(doc).execute()
    return patient_obj

@api_router.get("/patients", response_model=List[Patient])
def get_patients(skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = supabase.table('patients').select('*')
    if search:
        query = query.or_(f"full_name.ilike.%{search}%,patient_id.ilike.%{search}%,phone.ilike.%{search}%")

    result = query.range(skip, skip + limit - 1).execute()
    patients = result.data
    for p in patients:
        if isinstance(p.get('registration_date'), str):
            p['registration_date'] = datetime.fromisoformat(p['registration_date'])
    return patients

@api_router.get("/patients/{patient_id}", response_model=Patient)
def get_patient(patient_id: str):
    result = supabase.table('patients').select('*').eq('patient_id', patient_id).execute()
    patient = result.data[0] if result.data else None
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if isinstance(patient.get('registration_date'), str):
        patient['registration_date'] = datetime.fromisoformat(patient['registration_date'])
    return patient

@api_router.put("/patients/{patient_id}")
def update_patient(patient_id: str, patient_update: Dict[str, Any]):
    result = supabase.table('patients').update(patient_update).eq('patient_id', patient_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient updated successfully"}

# ==================== APPOINTMENT ROUTES ====================
@api_router.post("/appointments", response_model=Appointment)
def create_appointment(appt_input: AppointmentCreate):
    appt_obj = Appointment(**appt_input.model_dump())

    # Auto-assign queue number
    result = supabase.table('appointments').select('*', count='exact').eq('appointment_date', appt_input.appointment_date).eq('doctor_id', appt_input.doctor_id).execute()
    count = result.count
    appt_obj.queue_number = count + 1

    doc = appt_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    supabase.table('appointments').insert(doc).execute()
    return appt_obj

@api_router.get("/appointments", response_model=List[Appointment])
def get_appointments(date: Optional[str] = None, doctor_id: Optional[str] = None, status: Optional[str] = None):
    query = supabase.table('appointments').select('*')
    if date:
        query = query.eq('appointment_date', date)
    if doctor_id:
        query = query.eq('doctor_id', doctor_id)
    if status:
        query = query.eq('status', status)

    result = query.execute()
    appointments = result.data
    for appt in appointments:
        if isinstance(appt.get('created_at'), str):
            appt['created_at'] = datetime.fromisoformat(appt['created_at'])
    return appointments

@api_router.put("/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: str, status: str):
    result = supabase.table('appointments').update({'status': status}).eq('id', appointment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment status updated"}

# ==================== CONSULTATION/EMR ROUTES ====================
@api_router.post("/consultations", response_model=Consultation)
def create_consultation(consult_input: ConsultationCreate):
    consult_obj = Consultation(**consult_input.model_dump())
    doc = consult_obj.model_dump()
    doc['consultation_date'] = doc['consultation_date'].isoformat()
    supabase.table('consultations').insert(doc).execute()

    # Update patient last visit
    current_patient = supabase.table('patients').select('total_visits').eq('patient_id', consult_input.patient_id).execute().data[0]
    supabase.table('patients').update({
        "last_visit": datetime.now(timezone.utc).isoformat(),
        "total_visits": current_patient['total_visits'] + 1
    }).eq('patient_id', consult_input.patient_id).execute()

    return consult_obj

@api_router.get("/consultations", response_model=List[Consultation])
def get_consultations(skip: int = 0, limit: int = 100):
    result = supabase.table('consultations').select('*').range(skip, skip + limit - 1).execute()
    consultations = result.data
    for c in consultations:
        if isinstance(c.get('consultation_date'), str):
            c['consultation_date'] = datetime.fromisoformat(c['consultation_date'])
    return consultations

@api_router.get("/all-consultations", response_model=List[Consultation])
def get_all_consultations(skip: int = 0, limit: int = 100):
    return get_consultations(skip=skip, limit=limit)

@api_router.get("/consultations/patient/{patient_id}", response_model=List[Consultation])
def get_patient_consultations(patient_id: str):
    result = supabase.table('consultations').select('*').eq('patient_id', patient_id).execute()
    consultations = result.data
    for c in consultations:
        if isinstance(c.get('consultation_date'), str):
            c['consultation_date'] = datetime.fromisoformat(c['consultation_date'])
    return consultations
    

# ==================== PRESCRIPTION ROUTES ====================
@api_router.post("/prescriptions", response_model=Prescription)
async def create_prescription(presc_input: PrescriptionCreate):
    presc_obj = Prescription(**presc_input.model_dump())
    doc = presc_obj.model_dump()
    doc['prescribed_date'] = doc['prescribed_date'].isoformat()
    await db.prescriptions.insert_one(doc)
    return presc_obj

@api_router.get("/prescriptions/patient/{patient_id}", response_model=List[Prescription])
async def get_patient_prescriptions(patient_id: str):
    prescriptions = await db.prescriptions.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    for p in prescriptions:
        if isinstance(p.get('prescribed_date'), str):
            p['prescribed_date'] = datetime.fromisoformat(p['prescribed_date'])
    return prescriptions

# ==================== LAB TEST ROUTES ====================

# Test Panels/Templates
@api_router.get("/lab/test-panels")
async def get_test_panels():
    panels = [
        {
            "name": "Complete Blood Count (CBC)",
            "code": "CBC",
            "category": "Hematology",
            "tests": ["WBC", "RBC", "Hemoglobin", "Hematocrit", "Platelets", "MCV", "MCH", "MCHC"],
            "sample_type": "Blood",
            "price": 25.00
        },
        {
            "name": "Comprehensive Metabolic Panel",
            "code": "CMP",
            "category": "Biochemistry",
            "tests": ["Glucose", "Calcium", "Sodium", "Potassium", "CO2", "Chloride", "BUN", "Creatinine", "ALT", "AST", "Albumin", "Total Protein", "Bilirubin", "Alkaline Phosphatase"],
            "sample_type": "Blood",
            "price": 45.00
        },
        {
            "name": "Lipid Panel",
            "code": "LIPID",
            "category": "Biochemistry",
            "tests": ["Total Cholesterol", "HDL", "LDL", "Triglycerides", "VLDL"],
            "sample_type": "Blood",
            "price": 35.00
        },
        {
            "name": "Liver Function Test (LFT)",
            "code": "LFT",
            "category": "Biochemistry",
            "tests": ["ALT", "AST", "ALP", "Total Bilirubin", "Direct Bilirubin", "Total Protein", "Albumin", "GGT"],
            "sample_type": "Blood",
            "price": 40.00
        },
        {
            "name": "Kidney Function Test (KFT)",
            "code": "KFT",
            "category": "Biochemistry",
            "tests": ["Creatinine", "BUN", "Uric Acid", "Sodium", "Potassium", "Chloride"],
            "sample_type": "Blood",
            "price": 38.00
        },
        {
            "name": "Thyroid Profile",
            "code": "THYROID",
            "category": "Endocrinology",
            "tests": ["TSH", "T3", "T4", "Free T3", "Free T4"],
            "sample_type": "Blood",
            "price": 55.00
        },
        {
            "name": "Urinalysis Complete",
            "code": "UA",
            "category": "Clinical Pathology",
            "tests": ["Color", "Appearance", "pH", "Specific Gravity", "Protein", "Glucose", "Ketones", "Blood", "WBC", "RBC", "Bacteria"],
            "sample_type": "Urine",
            "price": 20.00
        },
        {
            "name": "HbA1c (Glycated Hemoglobin)",
            "code": "HBA1C",
            "category": "Biochemistry",
            "tests": ["HbA1c"],
            "sample_type": "Blood",
            "price": 30.00
        },
        {
            "name": "Coagulation Profile",
            "code": "COAG",
            "category": "Hematology",
            "tests": ["PT", "INR", "PTT", "Fibrinogen"],
            "sample_type": "Blood",
            "price": 42.00
        },
        {
            "name": "Electrolyte Panel",
            "code": "ELECTRO",
            "category": "Biochemistry",
            "tests": ["Sodium", "Potassium", "Chloride", "Bicarbonate"],
            "sample_type": "Blood",
            "price": 28.00
        }
    ]
    return panels

# Reference Ranges
@api_router.get("/lab/reference-ranges")
async def get_reference_ranges():
    ranges = {
        "WBC": {"value": "4.5-11.0", "unit": "x10³/µL"},
        "RBC": {"value": "4.5-5.9 (M), 4.0-5.2 (F)", "unit": "x10⁶/µL"},
        "Hemoglobin": {"value": "13.5-17.5 (M), 12.0-15.5 (F)", "unit": "g/dL"},
        "Hematocrit": {"value": "41-53 (M), 36-46 (F)", "unit": "%"},
        "Platelets": {"value": "150-400", "unit": "x10³/µL"},
        "Glucose": {"value": "70-100 (fasting)", "unit": "mg/dL"},
        "Creatinine": {"value": "0.7-1.3 (M), 0.6-1.1 (F)", "unit": "mg/dL"},
        "BUN": {"value": "7-20", "unit": "mg/dL"},
        "ALT": {"value": "7-56", "unit": "U/L"},
        "AST": {"value": "10-40", "unit": "U/L"},
        "Total Cholesterol": {"value": "<200", "unit": "mg/dL"},
        "HDL": {"value": ">40 (M), >50 (F)", "unit": "mg/dL"},
        "LDL": {"value": "<100", "unit": "mg/dL"},
        "Triglycerides": {"value": "<150", "unit": "mg/dL"},
        "TSH": {"value": "0.4-4.0", "unit": "mIU/L"},
        "HbA1c": {"value": "<5.7", "unit": "%"},
        "Sodium": {"value": "136-145", "unit": "mEq/L"},
        "Potassium": {"value": "3.5-5.0", "unit": "mEq/L"}
    }
    return ranges

@api_router.post("/lab-tests", response_model=LabTest)
async def create_lab_test(test_input: LabTestCreate):
    test_obj = LabTest(**test_input.model_dump())
    doc = test_obj.model_dump()
    doc['ordered_date'] = doc['ordered_date'].isoformat()
    await db.lab_tests.insert_one(doc)
    return test_obj

@api_router.get("/lab-tests", response_model=List[LabTest])
async def get_lab_tests(status: Optional[str] = None, patient_id: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    if patient_id:
        query['patient_id'] = patient_id
    tests = await db.lab_tests.find(query, {"_id": 0}).to_list(500)
    for t in tests:
        if isinstance(t.get('ordered_date'), str):
            t['ordered_date'] = datetime.fromisoformat(t['ordered_date'])
        if t.get('sample_collected_date') and isinstance(t.get('sample_collected_date'), str):
            t['sample_collected_date'] = datetime.fromisoformat(t['sample_collected_date'])
        if t.get('report_date') and isinstance(t.get('report_date'), str):
            t['report_date'] = datetime.fromisoformat(t['report_date'])
    return tests

@api_router.get("/lab-tests/{test_id}")
async def get_lab_test(test_id: str):
    test = await db.lab_tests.find_one({"test_id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if isinstance(test.get('ordered_date'), str):
        test['ordered_date'] = datetime.fromisoformat(test['ordered_date'])
    return test

@api_router.put("/lab-tests/{test_id}/collect-sample")
async def collect_sample(test_id: str, collected_by: str):
    update_data = {
        "status": "sample-collected",
        "sample_collected_date": datetime.now(timezone.utc).isoformat(),
        "sample_collected_by": collected_by
    }
    
    result = await db.lab_tests.update_one({"test_id": test_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"message": "Sample collected successfully"}

@api_router.put("/lab-tests/{test_id}/start-analysis")
async def start_analysis(test_id: str, technician_id: str):
    update_data = {
        "status": "in-progress",
        "technician_id": technician_id
    }
    
    result = await db.lab_tests.update_one({"test_id": test_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"message": "Analysis started"}

@api_router.put("/lab-tests/{test_id}/enter-results")
async def enter_results(test_id: str, result_update: LabTestResultUpdate):
    update_data = {
        "status": "completed",
        "result_values": result_update.result_values,
        "comments": result_update.comments,
        "critical_values": result_update.critical_values,
        "report_date": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.lab_tests.update_one({"test_id": test_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"message": "Results entered successfully"}

@api_router.put("/lab-tests/{test_id}/verify")
async def verify_results(test_id: str, verified_by: str):
    update_data = {
        "status": "reported",
        "verified_by": verified_by,
        "verified_date": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.lab_tests.update_one({"test_id": test_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Test not found")
    return {"message": "Results verified and reported"}

# AI Report Interpretation - Commented out due to missing emergentintegrations package
# @api_router.post("/lab-tests/{test_id}/ai-interpret")
# async def ai_interpret_results(test_id: str):
#     # Get test results
#     test = await db.lab_tests.find_one({"test_id": test_id}, {"_id": 0})
#     if not test:
#         raise HTTPException(status_code=404, detail="Test not found")
#
#     if not test.get('result_values'):
#         raise HTTPException(status_code=400, detail="No results to interpret")
#
#     try:
#         # Prepare data for AI
#         results_text = f"Lab Test: {test['test_name']}\n"
#         results_text += f"Patient ID: {test['patient_id']}\n"
#         results_text += "Test Results:\n"
#
#         for result in test['result_values']:
#             results_text += f"- {result['parameter']}: {result['value']} {result['unit']} (Reference: {result['reference_range']})\n"
#
#         # Call AI for interpretation
#         chat = LlmChat(
#             api_key=os.environ.get('EMERGENT_LLM_KEY'),
#             session_id=f"lab-interpret-{test_id}",
#             system_message="You are a medical laboratory specialist AI. Provide clear, concise interpretations of lab results."
#         ).with_model("openai", "gpt-4o")
#
#         prompt = f"""Analyze these lab test results and provide:
# 1. Overall interpretation (normal, abnormal, critical)
# 2. Key findings (list abnormal values)
# 3. Clinical significance
# 4. Recommended follow-up if needed
#
# {results_text}
#
# Provide a clear, professional interpretation suitable for a medical report."""
#
#         user_message = UserMessage(text=prompt)
#         interpretation = await chat.send_message(user_message)
#
#         return {
#             "test_id": test_id,
#             "interpretation": interpretation,
#             "generated_at": datetime.now(timezone.utc).isoformat()
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"AI interpretation failed: {str(e)}")

# ==================== RADIOLOGY ROUTES ====================
@api_router.post("/radiology-orders", response_model=RadiologyOrder)
async def create_radiology_order(order_input: RadiologyOrderCreate):
    order_obj = RadiologyOrder(**order_input.model_dump())
    doc = order_obj.model_dump()
    doc['ordered_date'] = doc['ordered_date'].isoformat()
    await db.radiology_orders.insert_one(doc)
    return order_obj

@api_router.get("/radiology-orders", response_model=List[RadiologyOrder])
async def get_radiology_orders(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    orders = await db.radiology_orders.find(query, {"_id": 0}).to_list(100)
    for o in orders:
        if isinstance(o.get('ordered_date'), str):
            o['ordered_date'] = datetime.fromisoformat(o['ordered_date'])
    return orders

# ==================== DENTAL ROUTES ====================
@api_router.post("/dental-records", response_model=DentalRecord)
async def create_dental_record(record_input: DentalRecordCreate):
    record_obj = DentalRecord(**record_input.model_dump())
    doc = record_obj.model_dump()
    doc['visit_date'] = doc['visit_date'].isoformat()
    await db.dental_records.insert_one(doc)
    
    # Update patient last visit
    await db.patients.update_one(
        {"patient_id": record_input.patient_id},
        {"$set": {"last_visit": datetime.now(timezone.utc).isoformat()}}
    )
    
    return record_obj

@api_router.get("/dental-records", response_model=List[DentalRecord])
async def get_all_dental_records():
    records = await db.dental_records.find({}, {"_id": 0}).to_list(100)
    for r in records:
        if isinstance(r.get('visit_date'), str):
            r['visit_date'] = datetime.fromisoformat(r['visit_date'])
    return records

@api_router.get("/dental-records/patient/{patient_id}", response_model=List[DentalRecord])
async def get_patient_dental_records(patient_id: str):
    records = await db.dental_records.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    for r in records:
        if isinstance(r.get('visit_date'), str):
            r['visit_date'] = datetime.fromisoformat(r['visit_date'])
    return records

@api_router.get("/dental/procedures")
async def get_dental_procedures():
    # Common dental procedures with prices
    procedures = [
        {"name": "Dental Cleaning", "code": "D1110", "price": 75.00, "duration": 30},
        {"name": "Dental Filling", "code": "D2140", "price": 150.00, "duration": 45},
        {"name": "Root Canal", "code": "D3310", "price": 800.00, "duration": 90},
        {"name": "Tooth Extraction", "code": "D7140", "price": 200.00, "duration": 30},
        {"name": "Crown", "code": "D2750", "price": 1200.00, "duration": 60},
        {"name": "Bridge", "code": "D6242", "price": 2500.00, "duration": 90},
        {"name": "Dental Implant", "code": "D6010", "price": 3000.00, "duration": 120},
        {"name": "Teeth Whitening", "code": "D9972", "price": 400.00, "duration": 60},
        {"name": "Braces", "code": "D8080", "price": 5000.00, "duration": 60},
        {"name": "Dentures", "code": "D5110", "price": 1800.00, "duration": 90},
        {"name": "Periodontal Treatment", "code": "D4341", "price": 300.00, "duration": 60},
        {"name": "X-Ray (Panoramic)", "code": "D0330", "price": 120.00, "duration": 15},
        {"name": "X-Ray (Bitewing)", "code": "D0274", "price": 50.00, "duration": 10},
        {"name": "Emergency Exam", "code": "D0140", "price": 100.00, "duration": 20},
    ]
    return procedures

# Treatment Plans
@api_router.post("/dental-treatment-plans", response_model=DentalTreatmentPlan)
async def create_treatment_plan(plan_input: DentalTreatmentPlanCreate):
    plan_obj = DentalTreatmentPlan(**plan_input.model_dump())
    doc = plan_obj.model_dump()
    doc['created_date'] = doc['created_date'].isoformat()
    await db.dental_treatment_plans.insert_one(doc)
    return plan_obj

@api_router.get("/dental-treatment-plans/patient/{patient_id}", response_model=List[DentalTreatmentPlan])
async def get_patient_treatment_plans(patient_id: str):
    plans = await db.dental_treatment_plans.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    for p in plans:
        if isinstance(p.get('created_date'), str):
            p['created_date'] = datetime.fromisoformat(p['created_date'])
    return plans

@api_router.put("/dental-treatment-plans/{plan_id}/status")
async def update_treatment_plan_status(plan_id: str, status: str):
    result = await db.dental_treatment_plans.update_one(
        {"plan_id": plan_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    return {"message": "Treatment plan updated"}

# X-Rays
@api_router.post("/dental-xrays", response_model=DentalXRay)
async def create_dental_xray(xray_input: DentalXRayCreate):
    xray_obj = DentalXRay(**xray_input.model_dump())
    doc = xray_obj.model_dump()
    doc['xray_date'] = doc['xray_date'].isoformat()
    await db.dental_xrays.insert_one(doc)
    return xray_obj

@api_router.get("/dental-xrays/patient/{patient_id}", response_model=List[DentalXRay])
async def get_patient_xrays(patient_id: str):
    xrays = await db.dental_xrays.find({"patient_id": patient_id}, {"_id": 0}).to_list(100)
    for x in xrays:
        if isinstance(x.get('xray_date'), str):
            x['xray_date'] = datetime.fromisoformat(x['xray_date'])
    return xrays

# ==================== PHARMACY ROUTES ====================
@api_router.post("/pharmacy-orders", response_model=PharmacyOrder)
async def create_pharmacy_order(order_input: PharmacyOrderCreate):
    order_obj = PharmacyOrder(**order_input.model_dump())
    doc = order_obj.model_dump()
    doc['order_date'] = doc['order_date'].isoformat()
    await db.pharmacy_orders.insert_one(doc)
    
    # Update inventory stock
    for item in order_input.items:
        await db.inventory.update_one(
            {"item_name": item.get("medicine_name")},
            {"$inc": {"current_stock": -item.get("quantity", 0)}}
        )
    
    return order_obj

@api_router.get("/pharmacy-orders", response_model=List[PharmacyOrder])
async def get_pharmacy_orders(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).to_list(100)
    for o in orders:
        if isinstance(o.get('order_date'), str):
            o['order_date'] = datetime.fromisoformat(o['order_date'])
    return orders

@api_router.get("/pharmacy/medicines")
async def get_pharmacy_medicines(search: Optional[str] = None):
    # Allow medicine, surgical or other categories in pharmacy POS
    query = {"status": {"$ne": "out-of-stock"}}
    if search:
        # Search by name or code (look-alike names via regex)
        query["$or"] = [
            {"item_name": {"$regex": search, "$options": "i"}},
            {"item_code": {"$regex": search, "$options": "i"}}
        ]
    medicines = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return medicines

@api_router.post("/pharmacy/pos-sale")
async def create_pos_sale(sale_data: Dict[str, Any]):
    # Create pharmacy order
    order_obj = PharmacyOrder(
        patient_id=sale_data.get("patient_id", "WALK-IN"),
        prescription_id=sale_data.get("prescription_id", "POS-" + str(uuid.uuid4().hex[:8].upper())),
        items=sale_data["items"],
        total_amount=sale_data["total_amount"],
        payment_status="paid"
    )
    
    doc = order_obj.model_dump()
    doc['order_date'] = doc['order_date'].isoformat()
    doc['status'] = "completed"
    doc['dispensed_by'] = sale_data.get("dispensed_by")
    doc['payment_method'] = sale_data.get("payment_method", "cash")
    
    await db.pharmacy_orders.insert_one(doc)
    
    # Update inventory
    for item in sale_data["items"]:
        await db.inventory.update_one(
            {"item_name": item["medicine_name"]},
            {"$inc": {"current_stock": -item["quantity"]}}
        )
    
    # Create billing record
    bill_items = [{
        "description": item["medicine_name"],
        "quantity": item["quantity"],
        "unit_price": item["unit_price"],
        "amount": item["quantity"] * item["unit_price"]
    } for item in sale_data["items"]]
    
    bill_obj = Billing(
        patient_id=sale_data.get("patient_id", "WALK-IN"),
        bill_type="pharmacy",
        items=bill_items,
        subtotal=sale_data["total_amount"],
        tax_amount=0,
        total_amount=sale_data["total_amount"],
        payment_method=sale_data.get("payment_method", "cash"),
        payment_status="paid",
        balance_amount=0
    )
    bill_obj.paid_amount = sale_data["total_amount"]
    
    bill_doc = bill_obj.model_dump()
    bill_doc['bill_date'] = bill_doc['bill_date'].isoformat()
    await db.billing.insert_one(bill_doc)
    
    return {
        "order_id": order_obj.order_id,
        "bill_number": bill_obj.bill_number,
        "total_amount": sale_data["total_amount"],
        "message": "Sale completed successfully"
    }

@api_router.get("/pharmacy/daily-report")
async def get_daily_report():
    today = datetime.now(timezone.utc).date().isoformat()
    # Query orders for today (string match on isoformat prefix)
    query = {"order_date": {"$regex": f"^{today}"}}
    orders = await db.pharmacy_orders.find(query, {"_id": 0}).to_list(1000)
    
    total_sales = sum(o.get('total_amount', 0) for o in orders)
    transaction_count = len(orders)
    
    payment_methods = {}
    item_summary = {}
    
    for o in orders:
        pm = o.get('payment_method', 'cash')
        payment_methods[pm] = payment_methods.get(pm, 0) + o.get('total_amount', 0)
        
        for item in o.get('items', []):
            name = item.get('medicine_name')
            qty = item.get('quantity', 0)
            item_summary[name] = item_summary.get(name, 0) + qty
            
    # Sort top items
    top_items = sorted(
        [{"name": k, "quantity": v} for k, v in item_summary.items()],
        key=lambda x: x['quantity'],
        reverse=True
    )[:10]
    
    return {
        "date": today,
        "total_sales": total_sales,
        "transaction_count": transaction_count,
        "payment_methods": payment_methods,
        "top_items": top_items,
        "currency": "UGX"
    }

# ==================== BILLING ROUTES ====================
@api_router.post("/billing", response_model=Billing)
async def create_bill(bill_input: BillingCreate, created_by: Optional[str] = None):
    bill_data = bill_input.model_dump()
    bill_data['balance_amount'] = bill_data['total_amount']
    if created_by:
        bill_data['created_by'] = created_by
    bill_obj = Billing(**bill_data)
    doc = bill_obj.model_dump()
    doc['bill_date'] = doc['bill_date'].isoformat()
    await db.billing.insert_one(doc)
    return bill_obj

@api_router.get("/billing", response_model=List[Billing])
async def get_bills(patient_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    if status:
        query['payment_status'] = status
    bills = await db.billing.find(query, {"_id": 0}).to_list(100)
    for b in bills:
        if isinstance(b.get('bill_date'), str):
            b['bill_date'] = datetime.fromisoformat(b['bill_date'])
    return bills

@api_router.put("/billing/{bill_id}/payment")
async def record_payment(bill_id: str, amount: float, method: str, collected_by: Optional[str] = None):
    bill = await db.billing.find_one({"bill_number": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    new_paid = bill.get('paid_amount', 0) + amount
    new_balance = bill['total_amount'] - new_paid
    status = "paid" if new_balance <= 0 else "partial"
    
    update_data = {
        "paid_amount": new_paid,
        "balance_amount": new_balance,
        "payment_status": status,
        "payment_method": method,
        "payment_date": datetime.now(timezone.utc).isoformat()
    }
    
    if collected_by:
        update_data["collected_by"] = collected_by
    
    await db.billing.update_one(
        {"bill_number": bill_id},
        {"$set": update_data}
    )
    return {"message": "Payment recorded", "balance": new_balance, "status": status}

@api_router.get("/patient-portal/overview")
async def get_patient_portal_overview(current_patient: dict = Depends(get_current_patient)):
    bills = await db.billing.find({"patient_id": current_patient["patient_id"]}, {"_id": 0}).to_list(500)

    total_billed = sum(float(bill.get("total_amount", 0) or 0) for bill in bills)
    total_paid = sum(float(bill.get("paid_amount", 0) or 0) for bill in bills)
    total_due = sum(float(bill.get("balance_amount", 0) or 0) for bill in bills)

    return {
        "patient": {
            "patient_id": current_patient["patient_id"],
            "full_name": current_patient["full_name"],
            "email": current_patient.get("email"),
            "phone": current_patient.get("phone"),
            "status": current_patient.get("status"),
        },
        "billing": {
            "total_billed": total_billed,
            "total_paid": total_paid,
            "total_due": total_due,
            "pending_bills": len([bill for bill in bills if bill.get("payment_status") == "pending"]),
            "partial_bills": len([bill for bill in bills if bill.get("payment_status") == "partial"]),
            "paid_bills": len([bill for bill in bills if bill.get("payment_status") == "paid"]),
        }
    }

@api_router.get("/patient-portal/bills", response_model=List[Billing])
async def get_patient_portal_bills(current_patient: dict = Depends(get_current_patient)):
    bills = await db.billing.find({"patient_id": current_patient["patient_id"]}, {"_id": 0}).to_list(500)
    for bill in bills:
        if isinstance(bill.get('bill_date'), str):
            bill['bill_date'] = datetime.fromisoformat(bill['bill_date'])
        if bill.get('payment_date') and isinstance(bill.get('payment_date'), str):
            bill['payment_date'] = datetime.fromisoformat(bill['payment_date'])
    return bills

@api_router.put("/patient-portal/bills/{bill_id}/payment")
async def pay_patient_bill(
    bill_id: str,
    amount: float,
    method: str,
    current_patient: dict = Depends(get_current_patient)
):
    bill = await db.billing.find_one({"bill_number": bill_id}, {"_id": 0})
    if not bill or bill.get("patient_id") != current_patient["patient_id"]:
        raise HTTPException(status_code=404, detail="Bill not found")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")
    if amount > float(bill.get("balance_amount", 0) or 0):
        raise HTTPException(status_code=400, detail="Payment amount cannot exceed balance due")

    new_paid = float(bill.get('paid_amount', 0) or 0) + amount
    new_balance = float(bill.get('total_amount', 0) or 0) - new_paid
    status = "paid" if new_balance <= 0 else "partial"

    await db.billing.update_one(
        {"bill_number": bill_id},
        {"$set": {
            "paid_amount": new_paid,
            "balance_amount": max(new_balance, 0),
            "payment_status": status,
            "payment_method": method,
            "payment_date": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"message": "Payment recorded", "balance": max(new_balance, 0), "status": status}

# ==================== IPD/ADMISSION ROUTES ====================
@api_router.post("/admissions", response_model=Admission)
async def create_admission(adm_input: AdmissionCreate):
    adm_obj = Admission(**adm_input.model_dump())
    doc = adm_obj.model_dump()
    doc['admission_date'] = doc['admission_date'].isoformat()
    await db.admissions.insert_one(doc)
    return adm_obj

@api_router.get("/admissions", response_model=List[Admission])
async def get_admissions(status: Optional[str] = "admitted"):
    query = {}
    if status:
        query['status'] = status
    admissions = await db.admissions.find(query, {"_id": 0}).to_list(100)
    for a in admissions:
        if isinstance(a.get('admission_date'), str):
            a['admission_date'] = datetime.fromisoformat(a['admission_date'])
    return admissions

@api_router.put("/admissions/{admission_id}/discharge")
async def discharge_patient(admission_id: str, discharge_summary: str):
    result = await db.admissions.update_one(
        {"admission_id": admission_id},
        {"$set": {"status": "discharged", "discharge_date": datetime.now(timezone.utc).isoformat(), "discharge_summary": discharge_summary}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Admission not found")
    return {"message": "Patient discharged"}

# ==================== EMERGENCY ROUTES ====================
@api_router.post("/emergency", response_model=EmergencyVisit)
async def create_emergency_visit(visit_input: EmergencyVisitCreate):
    visit_obj = EmergencyVisit(**visit_input.model_dump())
    doc = visit_obj.model_dump()
    doc['arrival_time'] = doc['arrival_time'].isoformat()
    await db.emergency_visits.insert_one(doc)
    return visit_obj

@api_router.get("/emergency", response_model=List[EmergencyVisit])
async def get_emergency_visits(status: Optional[str] = "in-progress"):
    query = {}
    if status:
        query['status'] = status
    visits = await db.emergency_visits.find(query, {"_id": 0}).to_list(100)
    for v in visits:
        if isinstance(v.get('arrival_time'), str):
            v['arrival_time'] = datetime.fromisoformat(v['arrival_time'])
    return visits

# ==================== INVENTORY ROUTES ====================
@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item_input: InventoryItemCreate):
    item_data = item_input.model_dump()
    if not (item_data.get("item_code") or "").strip():
        item_data["item_code"] = generate_inventory_code(item_data.get("category"))
    item_obj = InventoryItem(**item_data)
    doc = item_obj.model_dump()
    await db.inventory.insert_one(doc)
    return item_obj

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(category: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if category:
        query['category'] = category
    if status:
        query['status'] = status
    items = await db.inventory.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.put("/inventory/{item_id}/stock")
async def update_stock(item_id: str, quantity: int, operation: str):
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    new_stock = item['current_stock'] + quantity if operation == "add" else item['current_stock'] - quantity
    status = "in-stock"
    if new_stock <= item['reorder_level']:
        status = "low-stock"
    if new_stock <= 0:
        status = "out-of-stock"
    
    await db.inventory.update_one(
        {"id": item_id},
        {"$set": {"current_stock": new_stock, "status": status, "last_restocked": datetime.now(timezone.utc)}}
    )
    return {"message": "Stock updated", "new_stock": new_stock, "status": status}

@api_router.put("/inventory/{item_id}")
async def update_inventory_item(item_id: str, item_update: InventoryItemCreate):
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.inventory.update_one(
        {"id": item_id},
        {"$set": item_update.model_dump()}
    )
    return {"message": "Item updated successfully"}

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str):
    result = await db.inventory.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# ==================== INSURANCE ROUTES ====================
@api_router.post("/insurance-claims", response_model=InsuranceClaim)
async def create_insurance_claim(claim_input: InsuranceClaimCreate):
    claim_obj = InsuranceClaim(**claim_input.model_dump())
    doc = claim_obj.model_dump()
    doc['claim_date'] = doc['claim_date'].isoformat()
    await db.insurance_claims.insert_one(doc)
    return claim_obj

@api_router.get("/insurance-claims", response_model=List[InsuranceClaim])
async def get_insurance_claims(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    claims = await db.insurance_claims.find(query, {"_id": 0}).to_list(100)
    for c in claims:
        if isinstance(c.get('claim_date'), str):
            c['claim_date'] = datetime.fromisoformat(c['claim_date'])
    return claims

# ==================== SURGERY ROUTES ====================
@api_router.post("/surgeries", response_model=Surgery)
async def create_surgery(surgery_input: SurgeryCreate):
    surgery_obj = Surgery(**surgery_input.model_dump())
    doc = surgery_obj.model_dump()
    await db.surgeries.insert_one(doc)
    return surgery_obj

@api_router.get("/surgeries", response_model=List[Surgery])
async def get_surgeries(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    surgeries = await db.surgeries.find(query, {"_id": 0}).to_list(100)
    return surgeries

# ==================== TRIAGE ROUTES ====================
@api_router.post("/nursing/triage", response_model=TriageForm)
def create_triage_form(form_input: TriageFormCreate):
    form_obj = TriageForm(**form_input.model_dump())
    doc = form_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    supabase.table('triage_forms').insert(doc).execute()
    return form_obj

@api_router.get("/nursing/triage", response_model=List[TriageForm])
def get_triage_forms(patient_id: Optional[str] = None):
    query = supabase.table('triage_forms').select('*')
    if patient_id:
        query = query.eq('patient_id', patient_id)
    result = query.execute()
    forms = result.data
    return forms


# ==================== NURSING ROUTES ====================
@api_router.post("/nursing-notes", response_model=NursingNote)
def create_nursing_note(note_input: NursingNoteCreate):
    note_obj = NursingNote(**note_input.model_dump())
    doc = note_obj.model_dump()
    doc['recorded_at'] = doc['recorded_at'].isoformat()
    supabase.table('nursing_notes').insert(doc).execute()
    return note_obj

@api_router.get("/nursing-notes/patient/{patient_id}", response_model=List[NursingNote])
def get_nursing_notes(patient_id: str):
    result = supabase.table('nursing_notes').select('*').eq('patient_id', patient_id).execute()
    notes = result.data
    for n in notes:
        if isinstance(n.get('recorded_at'), str):
            n['recorded_at'] = datetime.fromisoformat(n['recorded_at'])
    return notes

# ==================== MEDICAL FORMS ROUTES ====================
@api_router.post("/forms/consent", response_model=ConsentForm)
async def create_consent_form(form_input: ConsentFormCreate):
    form_obj = ConsentForm(**form_input.model_dump())
    doc = form_obj.model_dump()
    doc['consent_date'] = doc['consent_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.consent_forms.insert_one(doc)
    return form_obj

@api_router.get("/forms/consent", response_model=List[ConsentForm])
async def get_consent_forms(patient_id: Optional[str] = None, doctor_id: Optional[str] = None):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    if doctor_id:
        query['doctor_id'] = doctor_id
    forms = await db.consent_forms.find(query, {"_id": 0}).to_list(1000)
    return forms

@api_router.post("/forms/referral", response_model=ReferralForm)
async def create_referral_form(form_input: ReferralFormCreate):
    form_obj = ReferralForm(**form_input.model_dump())
    doc = form_obj.model_dump()
    doc['referral_date'] = doc['referral_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.referral_forms.insert_one(doc)
    return form_obj

@api_router.get("/forms/referral", response_model=List[ReferralForm])
async def get_referral_forms(patient_id: Optional[str] = None, doctor_id: Optional[str] = None):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    if doctor_id:
        query['referring_doctor_id'] = doctor_id
    forms = await db.referral_forms.find(query, {"_id": 0}).to_list(1000)
    return forms

@api_router.post("/forms/medical", response_model=MedicalForm)
async def create_medical_form(form_input: MedicalFormCreate):
    form_obj = MedicalForm(**form_input.model_dump())
    doc = form_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.medical_forms.insert_one(doc)
    return form_obj

@api_router.get("/forms/medical", response_model=List[MedicalForm])
async def get_medical_forms(patient_id: Optional[str] = None, doctor_id: Optional[str] = None):
    query = {}
    if patient_id:
        query['patient_id'] = patient_id
    if doctor_id:
        query['doctor_id'] = doctor_id
    forms = await db.medical_forms.find(query, {"_id": 0}).to_list(1000)
    return forms

@api_router.put("/forms/referral/{form_id}/status")
async def update_referral_status(form_id: str, status: str):
    await db.referral_forms.update_one(
        {"id": form_id},
        {"$set": {"status": status}}
    )
    return {"message": "Status updated", "status": status}

# ==================== HOSPITAL MANAGEMENT ====================
@api_router.post("/hospitals", response_model=Hospital)
async def create_hospital(hospital_input: HospitalCreate):
    hospital_obj = Hospital(**hospital_input.model_dump())
    doc = hospital_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.hospitals.insert_one(doc)
    return hospital_obj

@api_router.get("/hospitals", response_model=List[Hospital])
async def get_hospitals():
    hospitals = await db.hospitals.find({}, {"_id": 0}).to_list(1000)
    return hospitals

@api_router.delete("/hospitals/{hospital_id}")
async def delete_hospital(hospital_id: str):
    result = await db.hospitals.delete_one({"id": hospital_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return {"message": "Hospital deleted successfully"}

# ==================== AI FEATURES ====================
# Commented out due to missing emergentintegrations package
# @api_router.post("/ai/generate-report")
# async def generate_ai_report(request: AIReportRequest):
#     try:
#         chat = LlmChat(
#             api_key=os.environ.get('EMERGENT_LLM_KEY'),
#             session_id=f"ai-report-{uuid.uuid4()}",
#             system_message="You are a medical AI assistant helping generate clinical reports."
#         ).with_model("openai", "gpt-4o")
#
#         prompt = f"Generate a {request.report_type} based on this patient data: {request.patient_data}"
#         user_message = UserMessage(text=prompt)
#         response = await chat.send_message(user_message)
#
#         return {"report": response, "generated_at": datetime.now(timezone.utc).isoformat()}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# Commented out due to missing emergentintegrations package
# @api_router.post("/ai/auto-triage")
# async def auto_triage(symptoms: List[str], vital_signs: Dict[str, Any]):
#     try:
#         chat = LlmChat(
#             api_key=os.environ.get('EMERGENT_LLM_KEY'),
#             session_id=f"triage-{uuid.uuid4()}",
#             system_message="You are a medical triage AI. Assess patient urgency level."
#         ).with_model("openai", "gpt-4o")
#
#         prompt = f"Triage level for patient with symptoms: {symptoms} and vitals: {vital_signs}. Respond with: critical, urgent, semi-urgent, or non-urgent."
#         user_message = UserMessage(text=prompt)
#         response = await chat.send_message(user_message)
#
#         return {"triage_level": response.strip(), "reasoning": "AI-powered assessment"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Triage failed: {str(e)}")

# ==================== DASHBOARD & ANALYTICS ====================
@api_router.get("/dashboard/admin")
def admin_dashboard():
    total_patients_result = supabase.table('patients').select('*', count='exact').execute()
    total_patients = total_patients_result.count
    today = datetime.now(timezone.utc).date().isoformat()
    today_appointments_result = supabase.table('appointments').select('*', count='exact').eq('appointment_date', today).execute()
    today_appointments = today_appointments_result.count
    pending_bills_result = supabase.table('billing').select('*', count='exact').eq('payment_status', 'pending').execute()
    pending_bills = pending_bills_result.count
    current_admissions_result = supabase.table('admissions').select('*', count='exact').eq('status', 'admitted').execute()
    current_admissions = current_admissions_result.count

    return {
        "total_patients": total_patients,
        "today_appointments": today_appointments,
        "pending_bills": pending_bills,
        "current_admissions": current_admissions
    }

@api_router.get("/dashboard/doctor/{doctor_id}")
async def doctor_dashboard(doctor_id: str):
    today = datetime.now(timezone.utc).date().isoformat()
    today_appointments = await db.appointments.count_documents({
        "doctor_id": doctor_id,
        "appointment_date": today
    })
    pending_appointments = await db.appointments.count_documents({
        "doctor_id": doctor_id,
        "status": "scheduled"
    })
    
    return {
        "today_appointments": today_appointments,
        "pending_appointments": pending_appointments
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
