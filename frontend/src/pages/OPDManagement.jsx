import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";

const OPDManagement = ({ user, onLogout }) => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: user?.id || "",
    chief_complaint: "",
    symptoms: "",
    vital_signs: { bp: "", temp: "", pulse: "", weight: "", height: "", spo2: "" },
    diagnosis: "",
    treatment_plan: "",
  });

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/consultations");
      setConsultations(response.data || []);
    } catch (error) {
      console.error("Failed to fetch consultations");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        symptoms: formData.symptoms.split(",").map(s => s.trim()),
      };
      await axios.post("/consultations", data);
      toast.success("Consultation recorded successfully!");
      setOpen(false);
      fetchConsultations();
    } catch (error) {
      toast.error("Failed to record consultation");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="opd-management-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">OPD Management</h1>
            <p className="text-gray-600 mt-1">Outpatient consultations and EMR</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="new-consultation-button">
                <Plus className="w-4 h-4 mr-2" />
                New Consultation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="consultation-dialog">
              <DialogHeader>
                <DialogTitle>Record Consultation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient ID *</Label>
                    <Input
                      value={formData.patient_id}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                      required
                      data-testid="consultation-patient-input"
                    />
                  </div>
                  <div>
                    <Label>Doctor ID *</Label>
                    <Input
                      value={formData.doctor_id}
                      onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                      required
                      data-testid="consultation-doctor-input"
                    />
                  </div>
                </div>
                <div>
                  <Label>Chief Complaint *</Label>
                  <Input
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    required
                    data-testid="consultation-complaint-input"
                  />
                </div>
                <div>
                  <Label>Symptoms (comma-separated) *</Label>
                  <Input
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    placeholder="fever, cough, headache"
                    required
                    data-testid="consultation-symptoms-input"
                  />
                </div>
                <div>
                  <Label className="mb-2 block font-semibold">Vital Signs</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="BP (120/80)"
                      value={formData.vital_signs.bp}
                      onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, bp: e.target.value } })}
                      data-testid="vitals-bp-input"
                    />
                    <Input
                      placeholder="Temp (98.6°F)"
                      value={formData.vital_signs.temp}
                      onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, temp: e.target.value } })}
                      data-testid="vitals-temp-input"
                    />
                    <Input
                      placeholder="Pulse (72)"
                      value={formData.vital_signs.pulse}
                      onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, pulse: e.target.value } })}
                      data-testid="vitals-pulse-input"
                    />
                  </div>
                </div>
                <div>
                  <Label>Diagnosis *</Label>
                  <Input
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    required
                    data-testid="consultation-diagnosis-input"
                  />
                </div>
                <div>
                  <Label>Treatment Plan *</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={formData.treatment_plan}
                    onChange={(e) => setFormData({ ...formData, treatment_plan: e.target.value })}
                    required
                    data-testid="consultation-treatment-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="consultation-submit-button">
                  Record Consultation
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : consultations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Complaint</th>
                      <th className="px-4 py-3">Diagnosis</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{new Date(c.consultation_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium text-teal-700">{c.patient_id}</td>
                        <td className="px-4 py-3">{c.chief_complaint}</td>
                        <td className="px-4 py-3">{c.diagnosis}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Start recording consultations</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OPDManagement;