import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Smile, Plus, FileText, Camera, ClipboardList } from "lucide-react";

const DentalManagement = ({ user, onLogout }) => {
  const [records, setRecords] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openRecord, setOpenRecord] = useState(false);
  const [openTreatment, setOpenTreatment] = useState(false);
  const [openXray, setOpenXray] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState({});

  const [recordForm, setRecordForm] = useState({
    patient_id: "",
    dentist_id: user?.id || "",
    chief_complaint: "",
    diagnosis: "",
    treatment_plan: "",
    procedures_performed: [],
    notes: ""
  });

  const [treatmentForm, setTreatmentForm] = useState({
    patient_id: "",
    dentist_id: user?.id || "",
    procedures: [],
    total_estimated_cost: 0,
    notes: ""
  });

  const [xrayForm, setXrayForm] = useState({
    patient_id: "",
    dentist_id: user?.id || "",
    xray_type: "panoramic",
    tooth_number: "",
    findings: ""
  });

  useEffect(() => {
    fetchRecords();
    fetchProcedures();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/dental-records");
      setRecords(response.data || []);
    } catch (error) {
      console.error("Failed to fetch dental records");
    }
    setLoading(false);
  };

  const fetchProcedures = async () => {
    try {
      const response = await axios.get("/dental/procedures");
      setProcedures(response.data || []);
    } catch (error) {
      console.error("Failed to fetch procedures");
    }
  };

  // Tooth chart - Adult teeth numbered 1-32
  const toothNumbers = Array.from({ length: 32 }, (_, i) => i + 1);

  const toggleTooth = (toothNum) => {
    setSelectedTeeth(prev => ({
      ...prev,
      [toothNum]: !prev[toothNum]
    }));
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...recordForm,
        tooth_chart: selectedTeeth,
        procedures_performed: recordForm.procedures_performed.split(",").map(p => p.trim())
      };
      await axios.post("/dental-records", data);
      toast.success("Dental record created successfully!");
      setOpenRecord(false);
      fetchRecords();
      setRecordForm({
        patient_id: "",
        dentist_id: user?.id || "",
        chief_complaint: "",
        diagnosis: "",
        treatment_plan: "",
        procedures_performed: [],
        notes: ""
      });
      setSelectedTeeth({});
    } catch (error) {
      toast.error("Failed to create dental record");
    }
  };

  const handleTreatmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/dental-treatment-plans", treatmentForm);
      toast.success("Treatment plan created successfully!");
      setOpenTreatment(false);
      setTreatmentForm({
        patient_id: "",
        dentist_id: user?.id || "",
        procedures: [],
        total_estimated_cost: 0,
        notes: ""
      });
    } catch (error) {
      toast.error("Failed to create treatment plan");
    }
  };

  const handleXraySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/dental-xrays", xrayForm);
      toast.success("X-ray record created!");
      setOpenXray(false);
      setXrayForm({
        patient_id: "",
        dentist_id: user?.id || "",
        xray_type: "panoramic",
        tooth_number: "",
        findings: ""
      });
    } catch (error) {
      toast.error("Failed to create X-ray record");
    }
  };

  const addProcedureToTreatment = (procedure) => {
    const newProc = {
      procedure_name: procedure.name,
      code: procedure.code,
      estimated_cost: procedure.price,
      tooth_number: "",
      priority: "medium"
    };
    const newProcedures = [...treatmentForm.procedures, newProc];
    const newTotal = newProcedures.reduce((sum, p) => sum + p.estimated_cost, 0);
    setTreatmentForm({
      ...treatmentForm,
      procedures: newProcedures,
      total_estimated_cost: newTotal
    });
    toast.success(`${procedure.name} added to treatment plan`);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="dental-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Dental Management</h1>
          <p className="text-gray-600 mt-1">Complete dental care with tooth charting and treatment plans</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Dialog open={openRecord} onOpenChange={setOpenRecord}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">New Dental Visit</h3>
                      <p className="text-sm text-gray-600">Record examination</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Dental Visit Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRecordSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Patient ID *</Label>
                    <Input
                      value={recordForm.patient_id}
                      onChange={(e) => setRecordForm({ ...recordForm, patient_id: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Dentist ID *</Label>
                    <Input
                      value={recordForm.dentist_id}
                      onChange={(e) => setRecordForm({ ...recordForm, dentist_id: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Chief Complaint *</Label>
                  <Input
                    value={recordForm.chief_complaint}
                    onChange={(e) => setRecordForm({ ...recordForm, chief_complaint: e.target.value })}
                    required
                  />
                </div>
                
                {/* Tooth Chart */}
                <div>
                  <Label className="mb-2 block">Tooth Chart (Select affected teeth)</Label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {toothNumbers.slice(0, 16).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => toggleTooth(num)}
                          className={`w-10 h-10 rounded text-sm font-semibold transition-colors ${
                            selectedTeeth[num]
                              ? "bg-red-500 text-white"
                              : "bg-white border-2 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="h-px bg-gray-300 my-2"></div>
                    <div className="grid grid-cols-8 gap-1">
                      {toothNumbers.slice(16, 32).map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => toggleTooth(num)}
                          className={`w-10 h-10 rounded text-sm font-semibold transition-colors ${
                            selectedTeeth[num]
                              ? "bg-red-500 text-white"
                              : "bg-white border-2 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Diagnosis *</Label>
                  <Input
                    value={recordForm.diagnosis}
                    onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Treatment Plan *</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={recordForm.treatment_plan}
                    onChange={(e) => setRecordForm({ ...recordForm, treatment_plan: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Procedures Performed (comma-separated)</Label>
                  <Input
                    value={recordForm.procedures_performed}
                    onChange={(e) => setRecordForm({ ...recordForm, procedures_performed: e.target.value })}
                    placeholder="Cleaning, Filling, etc."
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Save Dental Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openTreatment} onOpenChange={setOpenTreatment}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-teal-50 to-green-50 border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Treatment Plan</h3>
                      <p className="text-sm text-gray-600">Create plan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Treatment Plan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleTreatmentSubmit} className="space-y-4">
                <div>
                  <Label>Patient ID *</Label>
                  <Input
                    value={treatmentForm.patient_id}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, patient_id: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label className="mb-2 block">Select Procedures</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded">
                    {procedures.map((proc) => (
                      <div
                        key={proc.code}
                        onClick={() => addProcedureToTreatment(proc)}
                        className="p-3 bg-white border rounded cursor-pointer hover:border-teal-500 transition-colors"
                      >
                        <p className="font-semibold text-sm">{proc.name}</p>
                        <p className="text-xs text-gray-600">{proc.code}</p>
                        <p className="text-teal-600 font-bold">${proc.price.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {treatmentForm.procedures.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded">
                    <h4 className="font-semibold mb-2">Selected Procedures:</h4>
                    {treatmentForm.procedures.map((proc, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <span>{proc.procedure_name}</span>
                        <span className="font-semibold">${proc.estimated_cost.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                      <span>Total Estimated Cost:</span>
                      <span className="text-teal-600">${treatmentForm.total_estimated_cost.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Notes</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={2}
                    value={treatmentForm.notes}
                    onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                  Create Treatment Plan
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openXray} onOpenChange={setOpenXray}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50 border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Dental X-Ray</h3>
                      <p className="text-sm text-gray-600">Record X-ray</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Dental X-Ray</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleXraySubmit} className="space-y-4">
                <div>
                  <Label>Patient ID *</Label>
                  <Input
                    value={xrayForm.patient_id}
                    onChange={(e) => setXrayForm({ ...xrayForm, patient_id: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>X-Ray Type *</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={xrayForm.xray_type}
                    onChange={(e) => setXrayForm({ ...xrayForm, xray_type: e.target.value })}
                  >
                    <option value="panoramic">Panoramic</option>
                    <option value="bitewing">Bitewing</option>
                    <option value="periapical">Periapical</option>
                    <option value="cephalometric">Cephalometric</option>
                  </select>
                </div>
                <div>
                  <Label>Tooth Number (if specific)</Label>
                  <Input
                    value={xrayForm.tooth_number}
                    onChange={(e) => setXrayForm({ ...xrayForm, tooth_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Findings</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={xrayForm.findings}
                    onChange={(e) => setXrayForm({ ...xrayForm, findings: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  Save X-Ray Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dental Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Dental Visits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Smile className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No dental records yet. Start by creating a new visit record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Visit Date</th>
                      <th className="text-left py-3 px-4">Chief Complaint</th>
                      <th className="text-left py-3 px-4">Diagnosis</th>
                      <th className="text-left py-3 px-4">Procedures</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold">{record.patient_id}</td>
                        <td className="py-3 px-4">{new Date(record.visit_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4">{record.chief_complaint}</td>
                        <td className="py-3 px-4">{record.diagnosis}</td>
                        <td className="py-3 px-4 text-sm">
                          {record.procedures_performed?.join(", ") || "None"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="status-badge status-completed">{record.status}</span>
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

export default DentalManagement;