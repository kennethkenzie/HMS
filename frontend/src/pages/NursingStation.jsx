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
import { HeartPulse, Activity, Droplet, Plus, FileText, Syringe, Bed } from "lucide-react";

const NursingStation = ({ user, onLogout }) => {
  const [admissions, setAdmissions] = useState([]);
  const [nursingNotes, setNursingNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openVitals, setOpenVitals] = useState(false);
  const [openMedication, setOpenMedication] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [vitalsForm, setVitalsForm] = useState({
    bp: "",
    temp: "",
    pulse: "",
    respiratory_rate: "",
    spo2: "",
    blood_sugar: ""
  });

  const [medicationForm, setMedicationForm] = useState({
    medicine_name: "",
    dosage: "",
    time_administered: "",
    route: "oral",
    notes: ""
  });

  const [noteForm, setNoteForm] = useState({
    observations: "",
    intake_output: {
      intake_ml: "",
      output_ml: ""
    },
    notes: ""
  });

  const [medications, setMedications] = useState([]);
  const [patients, setPatients] = useState([]);

  const [triageForms, setTriageForms] = useState([]);
  const [openTriage, setOpenTriage] = useState(false);
  const [viewingTriage, setViewingTriage] = useState(null);
  const [triageForm, setTriageForm] = useState({
    patient_id: "",
    name: "",
    blood_pressure: "",
    spo2_pulse: "",
    temperature: "",
    respiration: "",
    weight: ""
  });

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/patients`);
      setPatients(response.data || []);
    } catch (error) {
      console.error("Failed to fetch patients");
    }
  };

  const fetchTriageForms = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/nursing/triage`);
      setTriageForms(response.data || []);
    } catch (error) {
      console.error("Failed to fetch triage forms");
    }
  };

  useEffect(() => {
    fetchAdmittedPatients();
    fetchTriageForms();
    fetchPatients();
  }, []);

  const fetchAdmittedPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/admissions?status=admitted`);
      setAdmissions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch admitted patients");
    }
    setLoading(false);
  };

  const fetchPatientNotes = async (patientId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/nursing-notes/patient/${patientId}`);
      setNursingNotes(response.data || []);
    } catch (error) {
      console.error("Failed to fetch nursing notes");
    }
  };

  const openVitalsDialog = (patient) => {
    setSelectedPatient(patient);
    setVitalsForm({
      bp: "",
      temp: "",
      pulse: "",
      respiratory_rate: "",
      spo2: "",
      blood_sugar: ""
    });
    setMedications([]);
    setNoteForm({
      observations: "",
      intake_output: { intake_ml: "", output_ml: "" },
      notes: ""
    });
    setOpenVitals(true);
    fetchPatientNotes(patient.patient_id);
  };

  const addMedication = () => {
    if (!medicationForm.medicine_name || !medicationForm.dosage) {
      toast.error("Please fill in medication details");
      return;
    }

    setMedications([...medications, { ...medicationForm }]);
    setMedicationForm({
      medicine_name: "",
      dosage: "",
      time_administered: "",
      route: "oral",
      notes: ""
    });
  };

  const removeMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSaveNursingNote = async (e) => {
    e.preventDefault();

    if (!noteForm.observations) {
      toast.error("Please add observations");
      return;
    }

    try {
      const nursingNoteData = {
        patient_id: selectedPatient.patient_id,
        nurse_id: user.id,
        admission_id: selectedPatient.admission_id,
        vital_signs: vitalsForm,
        observations: noteForm.observations,
        medications_administered: medications,
        intake_output: noteForm.intake_output,
        notes: noteForm.notes
      };

      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/nursing-notes`, nursingNoteData);
      toast.success("Nursing note recorded successfully!");
      setOpenVitals(false);
      fetchAdmittedPatients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save nursing note");
    }
  };

  const handleSaveTriage = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...triageForm,
        nurse_id: user.id
      };
      const patient = patients.find(p => p.patient_id === triageForm.patient_id);
      if (patient) {
        data.name = triageForm.name || patient.full_name;
      }
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/nursing/triage`, data);
      toast.success("Triage form saved successfully");
      setOpenTriage(false);
      setTriageForm({
        patient_id: "",
        name: "",
        blood_pressure: "",
        spo2_pulse: "",
        temperature: "",
        respiration: "",
        weight: ""
      });
      fetchTriageForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save triage form");
    }
  };

  const stats = {
    totalAdmitted: admissions.length,
    critical: admissions.filter(a => a.ward && a.ward.includes('ICU')).length,
    stable: admissions.filter(a => a.ward && !a.ward.includes('ICU')).length
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="nursing-station-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Nursing Station</h1>
          <p className="text-gray-600 mt-1">Patient care notes and vital signs monitoring</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Admitted</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalAdmitted}</p>
                </div>
                <Bed className="w-12 h-12 text-pink-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical (ICU)</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.critical}</p>
                </div>
                <HeartPulse className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-50 to-green-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Stable</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.stable}</p>
                </div>
                <Activity className="w-12 h-12 text-teal-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admitted Patients List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Admitted Patients</CardTitle>
            </CardHeader>
            <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : admissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No admitted patients</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="admissions-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4">Admission ID</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Room</th>
                      <th className="text-left py-3 px-4">Ward</th>
                      <th className="text-left py-3 px-4">Admission Date</th>
                      <th className="text-left py-3 px-4">Reason</th>
                      <th className="text-center py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((admission) => (
                      <tr key={admission.id} className="border-b hover:bg-gray-50" data-testid="admission-row">
                        <td className="py-3 px-4 font-mono text-sm">{admission.admission_id}</td>
                        <td className="py-3 px-4 font-semibold">{admission.patient_id}</td>
                        <td className="py-3 px-4">{admission.room_number}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            admission.ward.includes('ICU') ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {admission.ward}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(admission.admission_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm">{admission.admission_reason}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700"
                            onClick={() => openVitalsDialog(admission)}
                            data-testid="record-care-button"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Record Care
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

          {/* Triage Forms */}
          <Card>
            <CardHeader>
              <CardTitle>Triage Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">Quick triage vitals for walk-in and emergency patients.</p>
              <Button
                className="mb-4 bg-teal-600 hover:bg-teal-700 w-full"
                onClick={() => setOpenTriage(true)}
              >
                <HeartPulse className="w-4 h-4 mr-2" />
                New Triage Form
              </Button>
              {triageForms.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No triage forms recorded yet</div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2">Form #</th>
                        <th className="text-left py-2 px-2">Patient ID</th>
                        <th className="text-left py-2 px-2">BP</th>
                        <th className="text-left py-2 px-2">SpO2/Pulse</th>
                        <th className="text-left py-2 px-2">Temp</th>
                        <th className="text-center py-2 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {triageForms.map((form) => (
                        <tr key={form.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 font-mono text-xs">{form.form_number}</td>
                          <td className="py-2 px-2">{form.patient_id}</td>
                          <td className="py-2 px-2">{form.blood_pressure}</td>
                          <td className="py-2 px-2">{form.spo2_pulse}</td>
                          <td className="py-2 px-2">{form.temperature}</td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setViewingTriage(form)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
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
        </div>

        {/* Nursing Care Dialog */}
        <Dialog open={openVitals} onOpenChange={setOpenVitals}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="nursing-care-dialog">
            <DialogHeader>
              <DialogTitle>Nursing Care Record</DialogTitle>
            </DialogHeader>
            {selectedPatient && (
              <div className="space-y-6">
                {/* Patient Info */}
                <div className="p-4 bg-teal-50 rounded-lg">
                  <h3 className="font-semibold text-teal-800 mb-2">Patient Information</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Patient ID:</span> {selectedPatient.patient_id}
                    </div>
                    <div>
                      <span className="font-semibold">Room:</span> {selectedPatient.room_number}
                    </div>
                    <div>
                      <span className="font-semibold">Ward:</span> {selectedPatient.ward}
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="vitals" className="w-full">
                  <TabsList>
                    <TabsTrigger value="vitals">
                      <HeartPulse className="w-4 h-4 mr-2" />
                      Vital Signs
                    </TabsTrigger>
                    <TabsTrigger value="medications">
                      <Syringe className="w-4 h-4 mr-2" />
                      Medications
                    </TabsTrigger>
                    <TabsTrigger value="notes">
                      <FileText className="w-4 h-4 mr-2" />
                      Notes & Observations
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      History
                    </TabsTrigger>
                  </TabsList>

                  {/* Vital Signs Tab */}
                  <TabsContent value="vitals">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Blood Pressure (mmHg)</Label>
                        <Input
                          placeholder="120/80"
                          value={vitalsForm.bp}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, bp: e.target.value })}
                          data-testid="bp-input"
                        />
                      </div>
                      <div>
                        <Label>Temperature (°C)</Label>
                        <Input
                          placeholder="37.0"
                          type="number"
                          step="0.1"
                          value={vitalsForm.temp}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                          data-testid="temp-input"
                        />
                      </div>
                      <div>
                        <Label>Pulse (bpm)</Label>
                        <Input
                          placeholder="72"
                          type="number"
                          value={vitalsForm.pulse}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                          data-testid="pulse-input"
                        />
                      </div>
                      <div>
                        <Label>Respiratory Rate (breaths/min)</Label>
                        <Input
                          placeholder="16"
                          type="number"
                          value={vitalsForm.respiratory_rate}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, respiratory_rate: e.target.value })}
                          data-testid="resp-rate-input"
                        />
                      </div>
                      <div>
                        <Label>SpO2 (%)</Label>
                        <Input
                          placeholder="98"
                          type="number"
                          value={vitalsForm.spo2}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                          data-testid="spo2-input"
                        />
                      </div>
                      <div>
                        <Label>Blood Sugar (mg/dL)</Label>
                        <Input
                          placeholder="100"
                          type="number"
                          value={vitalsForm.blood_sugar}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, blood_sugar: e.target.value })}
                          data-testid="blood-sugar-input"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Medications Tab */}
                  <TabsContent value="medications">
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-3">
                          <Input
                            placeholder="Medicine name"
                            value={medicationForm.medicine_name}
                            onChange={(e) => setMedicationForm({ ...medicationForm, medicine_name: e.target.value })}
                            data-testid="med-name-input"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder="Dosage"
                            value={medicationForm.dosage}
                            onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
                            data-testid="med-dosage-input"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="time"
                            value={medicationForm.time_administered}
                            onChange={(e) => setMedicationForm({ ...medicationForm, time_administered: e.target.value })}
                            data-testid="med-time-input"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            className="w-full px-3 py-2 border rounded-md"
                            value={medicationForm.route}
                            onChange={(e) => setMedicationForm({ ...medicationForm, route: e.target.value })}
                            data-testid="med-route-select"
                          >
                            <option value="oral">Oral</option>
                            <option value="iv">IV</option>
                            <option value="im">IM</option>
                            <option value="topical">Topical</option>
                          </select>
                        </div>
                        <div className="col-span-3">
                          <Button type="button" onClick={addMedication} className="w-full" data-testid="add-med-button">
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>

                      {medications.length > 0 && (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-2">Medicine</th>
                              <th className="text-left p-2">Dosage</th>
                              <th className="text-left p-2">Time</th>
                              <th className="text-left p-2">Route</th>
                              <th className="text-center p-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medications.map((med, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{med.medicine_name}</td>
                                <td className="p-2">{med.dosage}</td>
                                <td className="p-2">{med.time_administered}</td>
                                <td className="p-2">{med.route}</td>
                                <td className="text-center p-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMedication(index)}
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </TabsContent>

                  {/* Notes Tab */}
                  <TabsContent value="notes">
                    <div className="space-y-4">
                      <div>
                        <Label>Observations *</Label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-md"
                          rows={4}
                          value={noteForm.observations}
                          onChange={(e) => setNoteForm({ ...noteForm, observations: e.target.value })}
                          placeholder="Patient condition, behavior, concerns..."
                          data-testid="observations-input"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Intake (mL)</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 1500"
                            value={noteForm.intake_output.intake_ml}
                            onChange={(e) => setNoteForm({
                              ...noteForm,
                              intake_output: { ...noteForm.intake_output, intake_ml: e.target.value }
                            })}
                            data-testid="intake-input"
                          />
                        </div>
                        <div>
                          <Label>Output (mL)</Label>
                          <Input
                            type="number"
                            placeholder="e.g., 1200"
                            value={noteForm.intake_output.output_ml}
                            onChange={(e) => setNoteForm({
                              ...noteForm,
                              intake_output: { ...noteForm.intake_output, output_ml: e.target.value }
                            })}
                            data-testid="output-input"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Additional Notes</Label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-md"
                          rows={3}
                          value={noteForm.notes}
                          onChange={(e) => setNoteForm({ ...noteForm, notes: e.target.value })}
                          placeholder="Care plan, family communication, etc."
                          data-testid="additional-notes-input"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history">
                    {nursingNotes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No nursing notes recorded yet</div>
                    ) : (
                      <div className="space-y-4">
                        {nursingNotes.map((note, index) => (
                          <Card key={index} className="border">
                            <CardContent className="pt-4">
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-sm font-semibold text-teal-600">
                                  {new Date(note.recorded_at).toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Vital Signs</p>
                                  <div className="text-sm space-y-1">
                                    {note.vital_signs.bp && <p>BP: {note.vital_signs.bp}</p>}
                                    {note.vital_signs.temp && <p>Temp: {note.vital_signs.temp}°C</p>}
                                    {note.vital_signs.pulse && <p>Pulse: {note.vital_signs.pulse} bpm</p>}
                                    {note.vital_signs.spo2 && <p>SpO2: {note.vital_signs.spo2}%</p>}
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Medications Administered</p>
                                  {note.medications_administered.length > 0 ? (
                                    <div className="text-sm space-y-1">
                                      {note.medications_administered.map((med, i) => (
                                        <p key={i}>{med.medicine_name} - {med.dosage}</p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500">None</p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Observations</p>
                                <p className="text-sm">{note.observations}</p>
                              </div>
                              
                              {note.notes && (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Additional Notes</p>
                                  <p className="text-sm">{note.notes}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <Button
                  onClick={handleSaveNursingNote}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  data-testid="save-nursing-note-button"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Save Nursing Record
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Triage Form Dialog */}
        <Dialog open={openTriage} onOpenChange={setOpenTriage}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Triage Vitals Form</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveTriage} className="space-y-4">
              <div>
                <Label>Patient *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={triageForm.patient_id}
                  onChange={(e) => setTriageForm({ ...triageForm, patient_id: e.target.value })}
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.patient_id}>
                      {p.patient_id} - {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={triageForm.name}
                  onChange={(e) => setTriageForm({ ...triageForm, name: e.target.value })}
                  placeholder="Patient name (optional)"
                />
              </div>
              <div>
                <Label>Blood Pressure</Label>
                <Input
                  value={triageForm.blood_pressure}
                  onChange={(e) => setTriageForm({ ...triageForm, blood_pressure: e.target.value })}
                  placeholder="e.g., 120/80"
                />
              </div>
              <div>
                <Label>SpO2, Pulse</Label>
                <Input
                  value={triageForm.spo2_pulse}
                  onChange={(e) => setTriageForm({ ...triageForm, spo2_pulse: e.target.value })}
                  placeholder="e.g., 98%, 72 bpm"
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input
                  value={triageForm.temperature}
                  onChange={(e) => setTriageForm({ ...triageForm, temperature: e.target.value })}
                  placeholder="e.g., 37.0°C"
                />
              </div>
              <div>
                <Label>Respiration</Label>
                <Input
                  value={triageForm.respiration}
                  onChange={(e) => setTriageForm({ ...triageForm, respiration: e.target.value })}
                  placeholder="e.g., 16/min"
                />
              </div>
              <div>
                <Label>Weight</Label>
                <Input
                  value={triageForm.weight}
                  onChange={(e) => setTriageForm({ ...triageForm, weight: e.target.value })}
                  placeholder="e.g., 70 kg"
                />
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                Save Triage Form
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Triage Form Dialog */}
        <Dialog open={!!viewingTriage} onOpenChange={(open) => !open && setViewingTriage(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Triage Form Details</DialogTitle>
            </DialogHeader>
            {viewingTriage && (
              <div className="space-y-2 text-sm">
                <p><strong>Form Number:</strong> {viewingTriage.form_number}</p>
                <p><strong>Patient ID:</strong> {viewingTriage.patient_id}</p>
                <p><strong>Name:</strong> {viewingTriage.name}</p>
                <p><strong>Blood Pressure:</strong> {viewingTriage.blood_pressure}</p>
                <p><strong>SpO2/Pulse:</strong> {viewingTriage.spo2_pulse}</p>
                <p><strong>Temperature:</strong> {viewingTriage.temperature}</p>
                <p><strong>Respiration:</strong> {viewingTriage.respiration}</p>
                <p><strong>Weight:</strong> {viewingTriage.weight}</p>
                <p><strong>Recorded At:</strong> {new Date(viewingTriage.created_at).toLocaleString()}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default NursingStation;
