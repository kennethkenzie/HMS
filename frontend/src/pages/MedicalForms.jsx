import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FileText, FilePlus, FileCheck, UserCheck, Send, Eye, Plus } from "lucide-react";

const MedicalForms = ({ user, onLogout }) => {
  const [consentForms, setConsentForms] = useState([]);
  const [referralForms, setReferralForms] = useState([]);
  const [medicalForms, setMedicalForms] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAddHospital, setOpenAddHospital] = useState(false);
  const [openConsentDialog, setOpenConsentDialog] = useState(false);
  const [openReferralDialog, setOpenReferralDialog] = useState(false);
  const [openMedicalDialog, setOpenMedicalDialog] = useState(false);
  const [viewForm, setViewForm] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);

  const [consentForm, setConsentForm] = useState({
    patient_id: "",
    procedure_name: "",
    operation_date: "",
    responsible_doctor_name: "",
    signer_type: "patient", // patient or next_of_kin
    signer_name: "",
    next_of_kin_name: ""
  });

  const [referralForm, setReferralForm] = useState({
    patient_id: "",
    referral_type: "internal",
    referred_to_doctor: "",
    referred_to_department: "",
    hospital_name: "",
    hospital_address: "",
    hospital_contact: "",
    reason_for_referral: "",
    clinical_summary: "",
    current_medications: "",
    relevant_tests: "",
    signs_and_symptoms: "",
    diagnosis_text: "",
    treatment_given: "",
    date_first_visit: "",
    urgency: "routine"
  });

  const [hospitalForm, setHospitalForm] = useState({
    hospital_name: "",
    address: "",
    phone: "",
    email: "",
    specialties: ""
  });

  const [medicalForm, setMedicalForm] = useState({
    patient_id: "",
    chief_complaint: "",
    present_illness_history: "",
    past_medical_history: "",
    family_history: "",
    social_history: "",
    allergies: "",
    current_medications: "",
    physical_examination: "",
    vital_signs: {
      bp: "",
      temp: "",
      pulse: "",
      respiratory_rate: "",
      spo2: ""
    },
    diagnosis: "",
    treatment_plan: "",
    follow_up: ""
  });

  useEffect(() => {
    fetchAllForms();
    fetchPatients();
    fetchDoctors();
    fetchHospitals();
  }, []);

  const fetchAllForms = async () => {
    setLoading(true);
    try {
      const [consent, referral, medical] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/forms/consent?doctor_id=${user.id}`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/forms/referral?doctor_id=${user.id}`),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/forms/medical?doctor_id=${user.id}`)
      ]);
      setConsentForms(consent.data || []);
      setReferralForms(referral.data || []);
      setMedicalForms(medical.data || []);
    } catch (error) {
      console.error("Failed to fetch forms");
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/patients`);
      setPatients(response.data || []);
    } catch (error) {
      console.error("Failed to fetch patients");
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/doctors`);
      setDoctors(response.data || []);
    } catch (error) {
      console.error("Failed to fetch doctors");
    }
  };

  const fetchHospitals = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/hospitals`);
      setHospitals(response.data || []);
    } catch (error) {
      console.error("Failed to fetch hospitals");
    }
  };

  const generateConsentContent = (patientName) => {
    const header = `SIR ALBERT COOK MEDICAL CENTRE - MENGO\n"We treat God Heals"\nGeneral medicine, minor surgery e.g. circumcision, Pediatrics, Gynecology and Obstetrics. Maternity and Antenatal care, Immunization, Laboratory services, Dental services, Ultra Sound Scan, HIV Counseling and Testing, Family planning services.\nLocated at Mengo-sentema road, Tel: 0773545721, 0759076257`;

    const title = `\n\nPATIENTS CONSENT FORM\nSIR ALBERT COOK MEDICIAL CENTRE SURGICAL TEAM\nPATIENTS CONSENT`;

    const body = `\n\nI ${patientName || "________________"} hereby consent to undergo the operation ${consentForm.procedure_name || "________________"} on ${consentForm.operation_date || "________________"}. The effect and nature of which has been explained to me by the doctor in charge. I as well consent to any further or alternative operative measures that may be found necessary during the administration of local anesthesia for any of the foregoing purposes. I understand that Dr ${consentForm.responsible_doctor_name || user.full_name || "________________"} will be in charge of the procedure and my medical care during my recovery period.`;

    const note = `\n\nNOTE: In case the patient is unable to consent because of his/her condition; the next of kin can consent and sign on his/her behalf. By appending my signature, I have voluntarily taken the decision in a sober state and have not been forced by any party.`;

    const signatures = `\n\nSIGN: ${consentForm.signer_name || "________________"} (${consentForm.signer_type === "next_of_kin" ? "Next of kin" : "Patient"})`;

    return `${header}${title}${body}${note}${signatures}`;
  };

  const handleCreateConsentForm = async (e) => {
    e.preventDefault();
    try {
      const patient = patients.find(p => p.patient_id === consentForm.patient_id);
      const patientName = patient?.full_name || "";
      const formContent = generateConsentContent(patientName);

      const data = {
        ...consentForm,
        doctor_id: user.id,
        doctor_signature: user.full_name,
        patient_signature: consentForm.signer_name,
        next_of_kin_name: consentForm.next_of_kin_name,
        signer_type: consentForm.signer_type,
        signer_name: consentForm.signer_name,
        form_content: formContent
      };

      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/forms/consent`, data);
      toast.success("Consent form created successfully!");
      setOpenConsentDialog(false);
      resetConsentForm();
      fetchAllForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create consent form");
    }
  };

  const generateReferralContent = (patient) => {
    const clinicHeader = `SIR ALBERT COOK MEDICAL CENTRE - MENGO\n"We treat God Heals"\nGeneral medicine, minor surgery e.g. circumcision, Pediatrics, Gynecology and Obstetrics. Maternity and Antenatal care, Immunization, Laboratory services, Dental services, Ultra Sound Scan, HIV Counseling and Testing, Family planning services.\nLocated at Mengo - Sentema road TEL (+256 702 050 201, +256 709 967 205)`;

    const title = `\n\nPATIENT'S REFERRAL FORM`;

    const toLine = `\nTo; ${referralForm.referral_type === "external" ? (referralForm.hospital_name || "________________") : (referralForm.referred_to_department || "________________")}   Date; ${new Date().toLocaleDateString()}`;
    const fromLine = `\nFROM; Health unit: SIR ALBERT COOK MEDICAL CENTRE - MENGO   Reference number: _________________`;

    const patientInfo = `\n\nREF:\nPatients Name ${patient?.full_name || "________________"}\nPatient/ client number: ${patient?.patient_id || "________________"}\nDate of first visit: ${referralForm.date_first_visit || "________________"}`;

    const intro = `\n\nPlease attend to the above person who is referred to your health unit for further action.`;

    const signs = `\n\nSigns and Symptoms ${referralForm.signs_and_symptoms || ""}`;
    const diagnosis = `\n\nDiagnosis ${referralForm.diagnosis_text || ""}`;
    const treatment = `\n\nTreatment given ${referralForm.treatment_given || ""}`;
    const reason = `\n\nReason for referral ${referralForm.reason_for_referral || ""}`;

    const closing = `\n\nPlease complete this and return it to the patient\n\nYours faithfully: ______________________ In charge ______________________\n(To be completed at referral site)`;

    return `${clinicHeader}${title}${toLine}${fromLine}${patientInfo}${intro}${signs}${diagnosis}${treatment}${reason}${closing}`;
  };

  const handleCreateReferralForm = async (e) => {
    e.preventDefault();
    try {
      const patient = patients.find(p => p.patient_id === referralForm.patient_id);
      const referral_form_content = generateReferralContent(patient);

      const data = {
        ...referralForm,
        referring_doctor_id: user.id,
        referral_form_content
      };
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/forms/referral`, data);
      toast.success("Referral form created successfully!");
      setOpenReferralDialog(false);
      resetReferralForm();
      fetchAllForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create referral form");
    }
  };

  const handleCreateMedicalForm = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...medicalForm,
        doctor_id: user.id
      };
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/forms/medical`, data);
      toast.success("Medical form created successfully!");
      setOpenMedicalDialog(false);
      resetMedicalForm();
      fetchAllForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create medical form");
    }
  };

  const resetConsentForm = () => {
    setConsentForm({
      patient_id: "",
      procedure_name: "",
      operation_date: "",
      responsible_doctor_name: user.full_name || "",
      signer_type: "patient",
      signer_name: "",
      next_of_kin_name: ""
    });
  };

  const handleAddHospital = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/hospitals`, hospitalForm);
      toast.success("Hospital added successfully!");
      setOpenAddHospital(false);
      setHospitalForm({ hospital_name: "", address: "", phone: "", email: "", specialties: "" });
      fetchHospitals();
    } catch (error) {
      toast.error("Failed to add hospital");
    }
  };

  const resetReferralForm = () => {
    setReferralForm({
      patient_id: "",
      referral_type: "internal",
      referred_to_doctor: "",
      referred_to_department: "",
      hospital_name: "",
      hospital_address: "",
      hospital_contact: "",
      reason_for_referral: "",
      clinical_summary: "",
      current_medications: "",
      relevant_tests: "",
      signs_and_symptoms: "",
      diagnosis_text: "",
      treatment_given: "",
      date_first_visit: "",
      urgency: "routine"
    });
  };

  const resetMedicalForm = () => {
    setMedicalForm({
      patient_id: "",
      chief_complaint: "",
      present_illness_history: "",
      past_medical_history: "",
      family_history: "",
      social_history: "",
      allergies: "",
      current_medications: "",
      physical_examination: "",
      vital_signs: { bp: "", temp: "", pulse: "", respiratory_rate: "", spo2: "" },
      diagnosis: "",
      treatment_plan: "",
      follow_up: ""
    });
  };

  const viewFormDetails = (form, type) => {
    setViewForm({ ...form, type });
    setOpenViewDialog(true);
  };

  const printForm = () => {
    window.print();
  };

  const stats = {
    totalConsent: consentForms.length,
    totalReferrals: referralForms.length,
    totalMedical: medicalForms.length,
    pendingReferrals: referralForms.filter(f => f.status === "pending").length
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="medical-forms-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Medical Forms & Documents</h1>
          <p className="text-gray-600 mt-1">Consent forms, referrals, and patient medical records</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Consent Forms</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalConsent}</p>
                </div>
                <FileCheck className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Referral Forms</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalReferrals}</p>
                </div>
                <Send className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Medical Forms</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalMedical}</p>
                </div>
                <FileText className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Referrals</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.pendingReferrals}</p>
                </div>
                <UserCheck className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="consent" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="consent">
              <FileCheck className="w-4 h-4 mr-2" />
              Consent Forms
            </TabsTrigger>
            <TabsTrigger value="referral">
              <Send className="w-4 h-4 mr-2" />
              Referral Forms
            </TabsTrigger>
            <TabsTrigger value="medical">
              <FileText className="w-4 h-4 mr-2" />
              Medical Forms
            </TabsTrigger>
          </TabsList>

          {/* Consent Forms Tab */}
          <TabsContent value="consent">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Patient Consent Forms</CardTitle>
                  <Dialog open={openConsentDialog} onOpenChange={setOpenConsentDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <FilePlus className="w-4 h-4 mr-2" />
                        Create Consent Form
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Patient Consent Form</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateConsentForm} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Patient *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={consentForm.patient_id}
                              onChange={(e) => setConsentForm({ ...consentForm, patient_id: e.target.value })}
                              required
                            >
                              <option value="">Select patient</option>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.patient_id}>
                                  {patient.patient_id} - {patient.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label>Procedure / Operation Name *</Label>
                            <Input
                              value={consentForm.procedure_name}
                              onChange={(e) => setConsentForm({ ...consentForm, procedure_name: e.target.value })}
                              required
                              placeholder="e.g., Circumcision"
                            />
                          </div>
                          <div>
                            <Label>Operation Date *</Label>
                            <Input
                              type="date"
                              value={consentForm.operation_date}
                              onChange={(e) => setConsentForm({ ...consentForm, operation_date: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Responsible Doctor *</Label>
                            <Input
                              value={consentForm.responsible_doctor_name || user.full_name}
                              onChange={(e) => setConsentForm({ ...consentForm, responsible_doctor_name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Signer Type *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={consentForm.signer_type}
                              onChange={(e) => setConsentForm({ ...consentForm, signer_type: e.target.value })}
                              required
                            >
                              <option value="patient">Patient</option>
                              <option value="next_of_kin">Next of kin (on behalf of patient)</option>
                            </select>
                          </div>
                          {consentForm.signer_type === "next_of_kin" && (
                            <div>
                              <Label>Next of Kin Name *</Label>
                              <Input
                                value={consentForm.next_of_kin_name}
                                onChange={(e) => setConsentForm({ ...consentForm, next_of_kin_name: e.target.value })}
                                required={consentForm.signer_type === "next_of_kin"}
                                placeholder="Next of kin full name"
                              />
                            </div>
                          )}
                          <div className="col-span-2">
                            <Label>Signature (Typed Name) *</Label>
                            <Input
                              value={consentForm.signer_name}
                              onChange={(e) => setConsentForm({ ...consentForm, signer_name: e.target.value })}
                              required
                              placeholder="Name of person signing (patient or next of kin)"
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                          Create Consent Form
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {consentForms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No consent forms created yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Form Number</th>
                          <th className="text-left py-3 px-4">Patient ID</th>
                          <th className="text-left py-3 px-4">Procedure</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-center py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consentForms.map((form) => (
                          <tr key={form.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm font-semibold">{form.form_number}</td>
                            <td className="py-3 px-4">{form.patient_id}</td>
                            <td className="py-3 px-4">{form.procedure_name}</td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(form.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewFormDetails(form, 'consent')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Forms Tab */}
          <TabsContent value="referral">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Referral Forms</CardTitle>
                  <Dialog open={openReferralDialog} onOpenChange={setOpenReferralDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <FilePlus className="w-4 h-4 mr-2" />
                        Create Referral
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Patient Referral Form</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateReferralForm} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Patient *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={referralForm.patient_id}
                              onChange={(e) => setReferralForm({ ...referralForm, patient_id: e.target.value })}
                              required
                            >
                              <option value="">Select patient</option>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.patient_id}>
                                  {patient.patient_id} - {patient.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label>Referral Type *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={referralForm.referral_type}
                              onChange={(e) => setReferralForm({ ...referralForm, referral_type: e.target.value })}
                              required
                            >
                              <option value="internal">Internal (Within This Hospital)</option>
                              <option value="external">External (To Another Hospital)</option>
                            </select>
                          </div>

                          {referralForm.referral_type === "external" && (
                            <>
                              <div className="col-span-2">
                                <div className="flex justify-between items-center mb-2">
                                  <Label>External Hospital *</Label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setOpenAddHospital(true)}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add New Hospital
                                  </Button>
                                </div>
                                <select
                                  className="w-full px-3 py-2 border rounded-md"
                                  value={referralForm.hospital_name}
                                  onChange={(e) => {
                                    const hospital = hospitals.find(h => h.hospital_name === e.target.value);
                                    setReferralForm({ 
                                      ...referralForm, 
                                      hospital_name: e.target.value,
                                      hospital_address: hospital?.address || "",
                                      hospital_contact: hospital?.phone || ""
                                    });
                                  }}
                                  required
                                >
                                  <option value="">Select hospital</option>
                                  {hospitals.map((hospital) => (
                                    <option key={hospital.id} value={hospital.hospital_name}>
                                      {hospital.hospital_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {referralForm.hospital_name && (
                                <div className="col-span-2 p-3 bg-green-50 rounded text-sm">
                                  <p><strong>Address:</strong> {referralForm.hospital_address}</p>
                                  <p><strong>Contact:</strong> {referralForm.hospital_contact}</p>
                                </div>
                              )}
                            </>
                          )}

                          <div>
                            <Label>Referred To Doctor *</Label>
                            <Input
                              value={referralForm.referred_to_doctor}
                              onChange={(e) => setReferralForm({ ...referralForm, referred_to_doctor: e.target.value })}
                              required
                              placeholder="Dr. Name or Specialist"
                            />
                          </div>
                          <div>
                            <Label>Referred To Department *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={referralForm.referred_to_department}
                              onChange={(e) => setReferralForm({ ...referralForm, referred_to_department: e.target.value })}
                              required
                            >
                              <option value="">Select department</option>
                              <option value="Cardiology">Cardiology</option>
                              <option value="Neurology">Neurology</option>
                              <option value="Orthopedics">Orthopedics</option>
                              <option value="Oncology">Oncology</option>
                              <option value="Surgery">Surgery</option>
                              <option value="Pediatrics">Pediatrics</option>
                              <option value="Psychiatry">Psychiatry</option>
                              <option value="Radiology">Radiology</option>
                            </select>
                          </div>
                          <div>
                            <Label>Urgency *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={referralForm.urgency}
                              onChange={(e) => setReferralForm({ ...referralForm, urgency: e.target.value })}
                            >
                              <option value="routine">Routine</option>
                              <option value="urgent">Urgent</option>
                              <option value="emergency">Emergency</option>
                            </select>
                          </div>
                          <div>
                            <Label>Date of First Visit</Label>
                            <Input
                              type="date"
                              value={referralForm.date_first_visit}
                              onChange={(e) => setReferralForm({ ...referralForm, date_first_visit: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Current Medications</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={referralForm.current_medications}
                              onChange={(e) => setReferralForm({ ...referralForm, current_medications: e.target.value })}
                              placeholder="List all current medications..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Signs and Symptoms</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={referralForm.signs_and_symptoms}
                              onChange={(e) => setReferralForm({ ...referralForm, signs_and_symptoms: e.target.value })}
                              placeholder="Signs and symptoms..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Diagnosis</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={referralForm.diagnosis_text}
                              onChange={(e) => setReferralForm({ ...referralForm, diagnosis_text: e.target.value })}
                              placeholder="Diagnosis..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Treatment Given</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={referralForm.treatment_given}
                              onChange={(e) => setReferralForm({ ...referralForm, treatment_given: e.target.value })}
                              placeholder="Treatment given..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Reason for Referral</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={referralForm.reason_for_referral}
                              onChange={(e) => setReferralForm({ ...referralForm, reason_for_referral: e.target.value })}
                              placeholder="Why is this patient being referred..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Clinical Summary</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={referralForm.clinical_summary}
                              onChange={(e) => setReferralForm({ ...referralForm, clinical_summary: e.target.value })}
                              placeholder="Brief clinical summary and history..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Relevant Tests/Results</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={referralForm.relevant_tests}
                              onChange={(e) => setReferralForm({ ...referralForm, relevant_tests: e.target.value })}
                              placeholder="Lab results, imaging, etc..."
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                          Create Referral Form
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {referralForms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No referral forms created yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Form Number</th>
                          <th className="text-left py-3 px-4">Patient ID</th>
                          <th className="text-center py-3 px-4">Type</th>
                          <th className="text-left py-3 px-4">Referred To</th>
                          <th className="text-left py-3 px-4">Hospital/Dept</th>
                          <th className="text-center py-3 px-4">Urgency</th>
                          <th className="text-center py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-center py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referralForms.map((form) => (
                          <tr key={form.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm font-semibold">{form.form_number}</td>
                            <td className="py-3 px-4">{form.patient_id}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                form.referral_type === 'external' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {form.referral_type || 'internal'}
                              </span>
                            </td>
                            <td className="py-3 px-4">{form.referred_to_doctor}</td>
                            <td className="py-3 px-4">
                              {form.referral_type === 'external' ? (
                                <div className="text-sm">
                                  <p className="font-semibold text-purple-600">{form.hospital_name}</p>
                                  <p className="text-gray-600">{form.referred_to_department}</p>
                                </div>
                              ) : (
                                form.referred_to_department
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                form.urgency === 'emergency' ? 'bg-red-100 text-red-700' :
                                form.urgency === 'urgent' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {form.urgency}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                form.status === 'completed' ? 'bg-green-100 text-green-700' :
                                form.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {form.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(form.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewFormDetails(form, 'referral')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Forms Tab */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Patient Medical Forms</CardTitle>
                  <Dialog open={openMedicalDialog} onOpenChange={setOpenMedicalDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <FilePlus className="w-4 h-4 mr-2" />
                        Create Medical Form
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Patient Medical Form</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateMedicalForm} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Patient *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={medicalForm.patient_id}
                              onChange={(e) => setMedicalForm({ ...medicalForm, patient_id: e.target.value })}
                              required
                            >
                              <option value="">Select patient</option>
                              {patients.map((patient) => (
                                <option key={patient.id} value={patient.patient_id}>
                                  {patient.patient_id} - {patient.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label>Chief Complaint *</Label>
                            <Input
                              value={medicalForm.chief_complaint}
                              onChange={(e) => setMedicalForm({ ...medicalForm, chief_complaint: e.target.value })}
                              required
                              placeholder="Patient's main complaint..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Present Illness History *</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={medicalForm.present_illness_history}
                              onChange={(e) => setMedicalForm({ ...medicalForm, present_illness_history: e.target.value })}
                              required
                              placeholder="History of present illness..."
                            />
                          </div>
                          <div>
                            <Label>Past Medical History *</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={medicalForm.past_medical_history}
                              onChange={(e) => setMedicalForm({ ...medicalForm, past_medical_history: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label>Family History</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={medicalForm.family_history}
                              onChange={(e) => setMedicalForm({ ...medicalForm, family_history: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Social History</Label>
                            <Input
                              value={medicalForm.social_history}
                              onChange={(e) => setMedicalForm({ ...medicalForm, social_history: e.target.value })}
                              placeholder="Smoking, alcohol, occupation..."
                            />
                          </div>
                          <div>
                            <Label>Allergies</Label>
                            <Input
                              value={medicalForm.allergies}
                              onChange={(e) => setMedicalForm({ ...medicalForm, allergies: e.target.value })}
                              placeholder="Drug/food allergies..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Current Medications</Label>
                            <Input
                              value={medicalForm.current_medications}
                              onChange={(e) => setMedicalForm({ ...medicalForm, current_medications: e.target.value })}
                              placeholder="List all medications..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Physical Examination *</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={medicalForm.physical_examination}
                              onChange={(e) => setMedicalForm({ ...medicalForm, physical_examination: e.target.value })}
                              required
                              placeholder="Physical examination findings..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Vital Signs</Label>
                            <div className="grid grid-cols-5 gap-2 mt-2">
                              <Input
                                placeholder="BP"
                                value={medicalForm.vital_signs.bp}
                                onChange={(e) => setMedicalForm({ 
                                  ...medicalForm, 
                                  vital_signs: { ...medicalForm.vital_signs, bp: e.target.value }
                                })}
                              />
                              <Input
                                placeholder="Temp °C"
                                value={medicalForm.vital_signs.temp}
                                onChange={(e) => setMedicalForm({ 
                                  ...medicalForm, 
                                  vital_signs: { ...medicalForm.vital_signs, temp: e.target.value }
                                })}
                              />
                              <Input
                                placeholder="Pulse"
                                value={medicalForm.vital_signs.pulse}
                                onChange={(e) => setMedicalForm({ 
                                  ...medicalForm, 
                                  vital_signs: { ...medicalForm.vital_signs, pulse: e.target.value }
                                })}
                              />
                              <Input
                                placeholder="Resp Rate"
                                value={medicalForm.vital_signs.respiratory_rate}
                                onChange={(e) => setMedicalForm({ 
                                  ...medicalForm, 
                                  vital_signs: { ...medicalForm.vital_signs, respiratory_rate: e.target.value }
                                })}
                              />
                              <Input
                                placeholder="SpO2 %"
                                value={medicalForm.vital_signs.spo2}
                                onChange={(e) => setMedicalForm({ 
                                  ...medicalForm, 
                                  vital_signs: { ...medicalForm.vital_signs, spo2: e.target.value }
                                })}
                              />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Label>Diagnosis *</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={medicalForm.diagnosis}
                              onChange={(e) => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })}
                              required
                              placeholder="Final diagnosis..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Treatment Plan *</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={3}
                              value={medicalForm.treatment_plan}
                              onChange={(e) => setMedicalForm({ ...medicalForm, treatment_plan: e.target.value })}
                              required
                              placeholder="Treatment and management plan..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Follow-up</Label>
                            <Input
                              value={medicalForm.follow_up}
                              onChange={(e) => setMedicalForm({ ...medicalForm, follow_up: e.target.value })}
                              placeholder="Follow-up instructions..."
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                          Create Medical Form
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {medicalForms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No medical forms created yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Form Number</th>
                          <th className="text-left py-3 px-4">Patient ID</th>
                          <th className="text-left py-3 px-4">Chief Complaint</th>
                          <th className="text-left py-3 px-4">Diagnosis</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-center py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicalForms.map((form) => (
                          <tr key={form.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm font-semibold">{form.form_number}</td>
                            <td className="py-3 px-4">{form.patient_id}</td>
                            <td className="py-3 px-4">{form.chief_complaint}</td>
                            <td className="py-3 px-4">{form.diagnosis}</td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(form.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewFormDetails(form, 'medical')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Hospital Dialog */}
        <Dialog open={openAddHospital} onOpenChange={setOpenAddHospital}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add External Hospital</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddHospital} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Hospital Name *</Label>
                  <Input
                    value={hospitalForm.hospital_name}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, hospital_name: e.target.value })}
                    required
                    placeholder="e.g., St. Mary's Hospital"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input
                    value={hospitalForm.address}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                    required
                    placeholder="Full address"
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={hospitalForm.phone}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, phone: e.target.value })}
                    required
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={hospitalForm.email}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, email: e.target.value })}
                    placeholder="contact@hospital.com"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Specialties</Label>
                  <Input
                    value={hospitalForm.specialties}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, specialties: e.target.value })}
                    placeholder="e.g., Cardiology, Neurology, Oncology"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Add Hospital
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Form Dialog */}
        <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Form Details</DialogTitle>
            </DialogHeader>
            {viewForm && (
              <div className="space-y-4 print:p-8">
                <div className="flex justify-between items-center print:hidden">
                  <h2 className="text-xl font-bold">
                    {viewForm.type === 'consent' ? 'Consent Form' :
                     viewForm.type === 'referral' ? 'Referral Form' :
                     'Medical Form'}
                  </h2>
                  <Button onClick={printForm} variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
                <div className="p-6 bg-gray-50 rounded space-y-3 text-sm">
                  <p><strong>Form Number:</strong> {viewForm.form_number}</p>
                  <p><strong>Patient ID:</strong> {viewForm.patient_id}</p>
                  <p><strong>Date:</strong> {new Date(viewForm.created_at).toLocaleString()}</p>
                  
                  {viewForm.type === 'consent' && (
                    <>
                      <div className="mb-4 text-center">
                        <p className="font-semibold">SIR ALBERT COOK MEDICAL CENTRE - MENGO</p>
                        <p className="text-xs italic">"We treat God Heals"</p>
                        <p className="text-xs mt-1">General medicine, minor surgery e.g. circumcision, Pediatrics, Gynecology and Obstetrics. Maternity and Antenatal care, Immunization, Laboratory services, Dental services, Ultra Sound Scan, HIV Counseling and Testing, Family planning services.</p>
                        <p className="text-xs mt-1">Located at Mengo-sentema road, Tel: 0773545721, 0759076257</p>
                      </div>
                      <div className="mb-4 text-center">
                        <p className="font-semibold">PATIENTS CONSENT FORM</p>
                        <p className="text-sm">SIR ALBERT COOK MEDICIAL CENTRE SURGICAL TEAM</p>
                        <p className="text-sm font-semibold mt-1">PATIENTS CONSENT</p>
                      </div>
                      <div className="space-y-2 text-sm text-left whitespace-pre-line">
                        {viewForm.form_content ? (
                          <p>{viewForm.form_content}</p>
                        ) : (
                          <>
                            <p><strong>Procedure:</strong> {viewForm.procedure_name}</p>
                            {viewForm.procedure_description && <p><strong>Description:</strong> {viewForm.procedure_description}</p>}
                            {viewForm.risks_explained && <p><strong>Risks:</strong> {viewForm.risks_explained}</p>}
                            {viewForm.benefits_explained && <p><strong>Benefits:</strong> {viewForm.benefits_explained}</p>}
                            {viewForm.alternatives_discussed && <p><strong>Alternatives:</strong> {viewForm.alternatives_discussed}</p>}
                            <p><strong>Patient Signature:</strong> {viewForm.patient_signature}</p>
                            <p><strong>Doctor Signature:</strong> {viewForm.doctor_signature}</p>
                            {viewForm.witness_name && <p><strong>Witness:</strong> {viewForm.witness_name}</p>}
                          </>
                        )}
                      </div>
                    </>
                  )}
                  
                  {viewForm.type === 'referral' && (
                    <>
                      <div className="mb-4 text-center">
                        <p className="font-semibold">SIR ALBERT COOK MEDICAL CENTRE - MENGO</p>
                        <p className="text-xs italic">"We treat God Heals"</p>
                        <p className="text-xs mt-1">General medicine, minor surgery e.g. circumcision, Pediatrics, Gynecology and Obstetrics. Maternity and Antenatal care, Immunization, Laboratory services, Dental services, Ultra Sound Scan, HIV Counseling and Testing, Family planning services.</p>
                        <p className="text-xs mt-1">Located at Mengo - Sentema road TEL (+256 702 050 201, +256 709 967 205)</p>
                      </div>
                      <div className="mb-4 text-center">
                        <p className="font-semibold">PATIENT'S REFERRAL FORM</p>
                      </div>

                      <div className="space-y-2 text-sm text-left whitespace-pre-line">
                        {viewForm.referral_form_content ? (
                          <p>{viewForm.referral_form_content}</p>
                        ) : (
                          <>
                            <p><strong>Referral Type:</strong> <span className="uppercase font-semibold">{viewForm.referral_type || 'internal'}</span></p>
                            {viewForm.referral_type === 'external' && (
                              <>
                                <p><strong>External Hospital:</strong> {viewForm.hospital_name}</p>
                                <p><strong>Hospital Address:</strong> {viewForm.hospital_address}</p>
                                <p><strong>Hospital Contact:</strong> {viewForm.hospital_contact}</p>
                              </>
                            )}
                            <p><strong>Referred To:</strong> {viewForm.referred_to_doctor}</p>
                            <p><strong>Department:</strong> {viewForm.referred_to_department}</p>
                            <p><strong>Urgency:</strong> <span className="uppercase font-semibold">{viewForm.urgency}</span></p>
                            <p><strong>Status:</strong> <span className="uppercase font-semibold">{viewForm.status}</span></p>
                            <p><strong>Reason:</strong> {viewForm.reason_for_referral}</p>
                            <p><strong>Clinical Summary:</strong> {viewForm.clinical_summary}</p>
                            <p><strong>Medications:</strong> {viewForm.current_medications}</p>
                            {viewForm.relevant_tests && <p><strong>Tests:</strong> {viewForm.relevant_tests}</p>}
                          </>
                        )}
                      </div>
                    </>
                  )}
                  
                  {viewForm.type === 'medical' && (
                    <>
                      <p><strong>Chief Complaint:</strong> {viewForm.chief_complaint}</p>
                      <p><strong>Present Illness:</strong> {viewForm.present_illness_history}</p>
                      <p><strong>Past Medical History:</strong> {viewForm.past_medical_history}</p>
                      {viewForm.family_history && <p><strong>Family History:</strong> {viewForm.family_history}</p>}
                      {viewForm.allergies && <p><strong>Allergies:</strong> {viewForm.allergies}</p>}
                      <p><strong>Physical Exam:</strong> {viewForm.physical_examination}</p>
                      <p><strong>Vital Signs:</strong> BP: {viewForm.vital_signs.bp}, Temp: {viewForm.vital_signs.temp}°C, Pulse: {viewForm.vital_signs.pulse}, RR: {viewForm.vital_signs.respiratory_rate}, SpO2: {viewForm.vital_signs.spo2}%</p>
                      <p><strong>Diagnosis:</strong> {viewForm.diagnosis}</p>
                      <p><strong>Treatment Plan:</strong> {viewForm.treatment_plan}</p>
                      {viewForm.follow_up && <p><strong>Follow-up:</strong> {viewForm.follow_up}</p>}
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MedicalForms;
