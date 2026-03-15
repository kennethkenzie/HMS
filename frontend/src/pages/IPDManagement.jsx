import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Bed } from "lucide-react";

const IPDManagement = ({ user, onLogout }) => {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    admission_reason: "",
    admission_type: "planned",
    ward: "General",
    room_number: "",
    bed_number: "",
    estimated_stay_days: 1,
  });

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admissions");
      setAdmissions(response.data);
    } catch (error) {
      toast.error("Failed to fetch admissions");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/admissions", formData);
      toast.success("Patient admitted successfully!");
      setOpen(false);
      fetchAdmissions();
    } catch (error) {
      toast.error("Failed to admit patient");
    }
  };

  const dischargePatient = async (admissionId) => {
    try {
      await axios.put(`/admissions/${admissionId}/discharge`, {
        discharge_summary: "Discharged in stable condition"
      });
      toast.success("Patient discharged");
      fetchAdmissions();
    } catch (error) {
      toast.error("Failed to discharge patient");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="ipd-management-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">IPD Management</h1>
            <p className="text-gray-600 mt-1">Inpatient admissions and bed management</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="admit-patient-button">
                <Plus className="w-4 h-4 mr-2" />
                Admit Patient
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="admission-dialog">
              <DialogHeader>
                <DialogTitle>Admit New Patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient ID *</Label>
                    <Input
                      value={formData.patient_id}
                      onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                      required
                      data-testid="admission-patient-input"
                    />
                  </div>
                  <div>
                    <Label>Doctor ID *</Label>
                    <Input
                      value={formData.doctor_id}
                      onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                      required
                      data-testid="admission-doctor-input"
                    />
                  </div>
                </div>
                <div>
                  <Label>Admission Reason *</Label>
                  <Input
                    value={formData.admission_reason}
                    onChange={(e) => setFormData({ ...formData, admission_reason: e.target.value })}
                    required
                    data-testid="admission-reason-input"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ward *</Label>
                    <Input
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      required
                      data-testid="admission-ward-input"
                    />
                  </div>
                  <div>
                    <Label>Room *</Label>
                    <Input
                      value={formData.room_number}
                      onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                      required
                      data-testid="admission-room-input"
                    />
                  </div>
                  <div>
                    <Label>Bed *</Label>
                    <Input
                      value={formData.bed_number}
                      onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
                      required
                      data-testid="admission-bed-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="admission-submit-button">
                  Admit Patient
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : admissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No current admissions</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="admissions-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Admission ID</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Ward</th>
                      <th className="text-left py-3 px-4">Room/Bed</th>
                      <th className="text-left py-3 px-4">Admission Date</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((adm) => (
                      <tr key={adm.id} className="border-b hover:bg-gray-50" data-testid="admission-row">
                        <td className="py-3 px-4 font-mono text-sm">{adm.admission_id}</td>
                        <td className="py-3 px-4">{adm.patient_id}</td>
                        <td className="py-3 px-4">{adm.ward}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center space-x-1">
                            <Bed className="w-4 h-4 text-gray-400" />
                            <span>{adm.room_number}-{adm.bed_number}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(adm.admission_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${adm.status === 'admitted' ? 'status-active' : 'status-completed'}`}>
                            {adm.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {adm.status === "admitted" && (
                            <Button size="sm" onClick={() => dischargePatient(adm.admission_id)} data-testid="discharge-button">
                              Discharge
                            </Button>
                          )}
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

export default IPDManagement;