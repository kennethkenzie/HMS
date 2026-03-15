import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, AlertCircle } from "lucide-react";

const EmergencyManagement = ({ user, onLogout }) => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    chief_complaint: "",
    triage_level: "non-urgent",
    vital_signs: { bp: "", temp: "", pulse: "", spo2: "" },
    mode_of_arrival: "walk-in",
  });

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/emergency");
      setEmergencies(response.data);
    } catch (error) {
      toast.error("Failed to fetch emergency visits");
    }
    setLoading(false);
  };

  const autoTriage = async () => {
    if (!formData.chief_complaint) {
      toast.error("Please enter chief complaint first");
      return;
    }
    setTriageLoading(true);
    try {
      const response = await axios.post("/ai/auto-triage", {
        symptoms: formData.chief_complaint.split(",").map(s => s.trim()),
        vital_signs: formData.vital_signs
      });
      setFormData({ ...formData, triage_level: response.data.triage_level });
      toast.success("AI triage completed: " + response.data.triage_level);
    } catch (error) {
      toast.error("Auto-triage failed");
    }
    setTriageLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/emergency", formData);
      toast.success("Emergency visit registered!");
      setOpen(false);
      fetchEmergencies();
    } catch (error) {
      toast.error("Failed to register emergency visit");
    }
  };

  const getTriageColor = (level) => {
    const colors = {
      critical: "bg-red-100 text-red-700 border-red-300",
      urgent: "bg-orange-100 text-orange-700 border-orange-300",
      "semi-urgent": "bg-yellow-100 text-yellow-700 border-yellow-300",
      "non-urgent": "bg-green-100 text-green-700 border-green-300",
    };
    return colors[level] || colors["non-urgent"];
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="emergency-management-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Emergency Department</h1>
            <p className="text-gray-600 mt-1">ER visits and AI-powered triage</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700" data-testid="new-emergency-button">
                <Plus className="w-4 h-4 mr-2" />
                New Emergency
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="emergency-dialog">
              <DialogHeader>
                <DialogTitle>Register Emergency Visit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Patient ID *</Label>
                  <Input
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    required
                    data-testid="emergency-patient-input"
                  />
                </div>
                <div>
                  <Label>Chief Complaint *</Label>
                  <Input
                    value={formData.chief_complaint}
                    onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                    required
                    data-testid="emergency-complaint-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>BP</Label>
                    <Input
                      placeholder="120/80"
                      value={formData.vital_signs.bp}
                      onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, bp: e.target.value } })}
                      data-testid="emergency-bp-input"
                    />
                  </div>
                  <div>
                    <Label>SpO2</Label>
                    <Input
                      placeholder="98"
                      value={formData.vital_signs.spo2}
                      onChange={(e) => setFormData({ ...formData, vital_signs: { ...formData.vital_signs, spo2: e.target.value } })}
                      data-testid="emergency-spo2-input"
                    />
                  </div>
                </div>
                <div>
                  <Label>Triage Level *</Label>
                  <div className="flex items-center space-x-2">
                    <select
                      className="flex-1 px-3 py-2 border rounded-md"
                      value={formData.triage_level}
                      onChange={(e) => setFormData({ ...formData, triage_level: e.target.value })}
                      data-testid="emergency-triage-select"
                    >
                      <option value="critical">Critical</option>
                      <option value="urgent">Urgent</option>
                      <option value="semi-urgent">Semi-Urgent</option>
                      <option value="non-urgent">Non-Urgent</option>
                    </select>
                    <Button type="button" onClick={autoTriage} disabled={triageLoading} data-testid="auto-triage-button">
                      {triageLoading ? "AI..." : "AI Triage"}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" data-testid="emergency-submit-button">
                  Register Emergency
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-4 bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">AI-Powered Auto-Triage Available</p>
                <p className="text-sm text-red-600">Automatically assess patient urgency using AI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Visits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : emergencies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No emergency visits</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="emergencies-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Emergency ID</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Chief Complaint</th>
                      <th className="text-left py-3 px-4">Triage Level</th>
                      <th className="text-left py-3 px-4">Arrival Time</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emergencies.map((em) => (
                      <tr key={em.id} className="border-b hover:bg-gray-50" data-testid="emergency-row">
                        <td className="py-3 px-4 font-mono text-sm">{em.emergency_id}</td>
                        <td className="py-3 px-4">{em.patient_id}</td>
                        <td className="py-3 px-4">{em.chief_complaint}</td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getTriageColor(em.triage_level)}`}>
                            {em.triage_level.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(em.arrival_time).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${em.status === 'in-progress' ? 'status-pending' : 'status-completed'}`}>
                            {em.status}
                          </span>
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
    </Layout>
  );
};

export default EmergencyManagement;