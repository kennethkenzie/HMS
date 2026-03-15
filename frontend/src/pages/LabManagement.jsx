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
import { TestTube, FlaskConical, Plus, Search, FileText, Brain, CheckCircle } from "lucide-react";

const LabManagement = ({ user, onLogout }) => {
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [testPanels, setTestPanels] = useState([]);
  const [referenceRanges, setReferenceRanges] = useState({});
  const [loading, setLoading] = useState(false);
  const [openOrder, setOpenOrder] = useState(false);
  const [openResults, setOpenResults] = useState(false);
  const [openViewTest, setOpenViewTest] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [aiInterpretation, setAiInterpretation] = useState("");
  const [interpretLoading, setInterpretLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const [orderForm, setOrderForm] = useState({
    patient_id: "",
    doctor_id: user?.id || "",
    test_name: "",
    test_category: "blood",
    test_panel: "",
    urgency: "routine",
    sample_type: "Blood",
    notes: ""
  });

  const [resultsForm, setResultsForm] = useState({
    result_values: [],
    comments: "",
    critical_values: []
  });

  useEffect(() => {
    fetchTests();
    fetchPatients();
    fetchTestPanels();
    fetchReferenceRanges();
  }, [filterStatus]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await axios.get("/lab-tests", { params });
      setTests(response.data);
    } catch (error) {
      toast.error("Failed to fetch lab tests");
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get("/patients");
      setPatients(response.data || []);
    } catch (error) {
      toast.error("Failed to fetch registered patients");
    }
  };

  const fetchTestPanels = async () => {
    try {
      const response = await axios.get("/lab/test-panels");
      setTestPanels(response.data);
    } catch (error) {
      console.error("Failed to fetch test panels");
    }
  };

  const fetchReferenceRanges = async () => {
    try {
      const response = await axios.get("/lab/reference-ranges");
      setReferenceRanges(response.data);
    } catch (error) {
      console.error("Failed to fetch reference ranges");
    }
  };

  const handleOrderTest = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/lab-tests", orderForm);
      toast.success("Lab test ordered successfully!");
      setOpenOrder(false);
      fetchTests();
      setOrderForm({
        patient_id: "",
        doctor_id: user?.id || "",
        test_name: "",
        test_category: "blood",
        test_panel: "",
        urgency: "routine",
        sample_type: "Blood",
        notes: ""
      });
    } catch (error) {
      toast.error("Failed to order test");
    }
  };

  const handlePanelSelect = (panel) => {
    setOrderForm({
      ...orderForm,
      test_name: panel.name,
      test_category: panel.category.toLowerCase(),
      test_panel: panel.code,
      sample_type: panel.sample_type
    });
  };

  const collectSample = async (testId) => {
    try {
      await axios.put(`/lab-tests/${testId}/collect-sample`, null, {
        params: { collected_by: user.id }
      });
      toast.success("Sample collected!");
      fetchTests();
    } catch (error) {
      toast.error("Failed to collect sample");
    }
  };

  const startAnalysis = async (testId) => {
    try {
      await axios.put(`/lab-tests/${testId}/start-analysis`, null, {
        params: { technician_id: user.id }
      });
      toast.success("Analysis started!");
      fetchTests();
    } catch (error) {
      toast.error("Failed to start analysis");
    }
  };

  const openResultsDialog = (test) => {
    setSelectedTest(test);
    
    // Initialize results form with test parameters
    if (test.test_panel) {
      const panel = testPanels.find(p => p.code === test.test_panel);
      if (panel) {
        const initialResults = panel.tests.map(param => ({
          parameter: param,
          value: "",
          unit: referenceRanges[param]?.unit || "",
          reference_range: referenceRanges[param]?.value || "",
          status: "normal"
        }));
        setResultsForm({
          result_values: initialResults,
          comments: "",
          critical_values: []
        });
      }
    }
    
    setOpenResults(true);
  };

  const handleEnterResults = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/lab-tests/${selectedTest.test_id}/enter-results`, resultsForm);
      toast.success("Results entered successfully!");
      setOpenResults(false);
      fetchTests();
    } catch (error) {
      toast.error("Failed to enter results");
    }
  };

  const verifyResults = async (testId) => {
    try {
      await axios.put(`/lab-tests/${testId}/verify`, null, {
        params: { verified_by: user.id }
      });
      toast.success("Results verified and reported!");
      fetchTests();
    } catch (error) {
      toast.error("Failed to verify results");
    }
  };

  const viewTestDetails = async (test) => {
    try {
      const response = await axios.get(`/lab-tests/${test.test_id}`);
      setSelectedTest(response.data);
      setOpenViewTest(true);
    } catch (error) {
      toast.error("Failed to load test details");
    }
  };

  const aiInterpret = async (testId) => {
    setInterpretLoading(true);
    try {
      const response = await axios.post(`/lab-tests/${testId}/ai-interpret`);
      setAiInterpretation(response.data.interpretation);
      toast.success("AI interpretation generated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "AI interpretation failed");
    }
    setInterpretLoading(false);
  };

  const updateResultValue = (index, field, value) => {
    const newResults = [...resultsForm.result_values];
    newResults[index] = { ...newResults[index], [field]: value };
    
    // Auto-determine status based on value and reference range
    if (field === "value" && newResults[index].value) {
      const numValue = parseFloat(newResults[index].value);
      const refRange = newResults[index].reference_range;
      
      if (refRange && !isNaN(numValue)) {
        // Simple check - can be enhanced
        newResults[index].status = "normal";
      }
    }
    
    setResultsForm({ ...resultsForm, result_values: newResults });
  };

  const selectedPatient = patients.find((patient) => patient.patient_id === orderForm.patient_id);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="lab-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Laboratory Management</h1>
          <p className="text-gray-600 mt-1">Comprehensive lab test management with AI interpretation</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Tests</p>
                  <p className="text-2xl font-bold text-gray-800">{tests.filter(t => t.status === 'ordered').length}</p>
                </div>
                <TestTube className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-800">{tests.filter(t => t.status === 'in-progress').length}</p>
                </div>
                <FlaskConical className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-800">{tests.filter(t => t.status === 'completed').length}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Test Panels</p>
                  <p className="text-2xl font-bold text-gray-800">{testPanels.length}</p>
                </div>
                <FileText className="w-10 h-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="tests" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tests">Lab Tests</TabsTrigger>
            <TabsTrigger value="panels">Test Panels</TabsTrigger>
          </TabsList>

          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Lab Tests</CardTitle>
                  <div className="flex items-center space-x-2">
                    <select
                      className="px-3 py-2 border rounded-md"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Status</option>
                      <option value="ordered">Ordered</option>
                      <option value="sample-collected">Sample Collected</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="reported">Reported</option>
                    </select>
                    <Dialog open={openOrder} onOpenChange={setOpenOrder}>
                      <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Order Test
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Lab Test</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleOrderTest} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Patient *</Label>
                              <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={orderForm.patient_id}
                                onChange={(e) => setOrderForm({ ...orderForm, patient_id: e.target.value })}
                                required
                              >
                                <option value="">Select registered patient</option>
                                {patients.map((patient) => (
                                  <option key={patient.id} value={patient.patient_id}>
                                    {patient.patient_id} - {patient.full_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label>Urgency *</Label>
                              <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={orderForm.urgency}
                                onChange={(e) => setOrderForm({ ...orderForm, urgency: e.target.value })}
                              >
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                              </select>
                            </div>
                          </div>

                          {selectedPatient && (
                            <div className="grid grid-cols-2 gap-4 rounded-lg bg-teal-50 p-4 text-sm">
                              <p><span className="font-semibold">Patient Name:</span> {selectedPatient.full_name}</p>
                              <p><span className="font-semibold">Phone:</span> {selectedPatient.phone}</p>
                              <p><span className="font-semibold">Gender:</span> {selectedPatient.gender}</p>
                              <p><span className="font-semibold">Blood Group:</span> {selectedPatient.blood_group || "N/A"}</p>
                            </div>
                          )}

                          <div>
                            <Label className="mb-2 block">Select Test Panel (or enter custom test)</Label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded">
                              {testPanels.map((panel) => (
                                <div
                                  key={panel.code}
                                  onClick={() => handlePanelSelect(panel)}
                                  className={`p-3 border rounded cursor-pointer hover:border-teal-500 transition ${
                                    orderForm.test_panel === panel.code ? "border-teal-500 bg-teal-50" : "bg-white"
                                  }`}
                                >
                                  <p className="font-semibold text-sm">{panel.name}</p>
                                  <p className="text-xs text-gray-600">{panel.category}</p>
                                  <p className="text-xs text-teal-600 font-bold mt-1">${panel.price.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Test Name *</Label>
                            <Input
                              value={orderForm.test_name}
                              onChange={(e) => setOrderForm({ ...orderForm, test_name: e.target.value })}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Category</Label>
                              <Input value={orderForm.test_category} onChange={(e) => setOrderForm({ ...orderForm, test_category: e.target.value })} />
                            </div>
                            <div>
                              <Label>Sample Type</Label>
                              <Input value={orderForm.sample_type} onChange={(e) => setOrderForm({ ...orderForm, sample_type: e.target.value })} />
                            </div>
                            <div>
                              <Label>Panel Code</Label>
                              <Input value={orderForm.test_panel} readOnly />
                            </div>
                          </div>

                          <div>
                            <Label>Notes</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={orderForm.notes}
                              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                            />
                          </div>

                          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                            Order Test
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : tests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No lab tests found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="lab-tests-table">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Test ID</th>
                          <th className="text-left py-3 px-4">Patient</th>
                          <th className="text-left py-3 px-4">Test Name</th>
                          <th className="text-left py-3 px-4">Sample</th>
                          <th className="text-left py-3 px-4">Urgency</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((test) => (
                          <tr key={test.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{test.test_id}</td>
                            <td className="py-3 px-4">{test.patient_id}</td>
                            <td className="py-3 px-4">
                              <p className="font-semibold">{test.test_name}</p>
                              {test.test_panel && <p className="text-xs text-gray-500">{test.test_panel}</p>}
                            </td>
                            <td className="py-3 px-4 text-sm">{test.sample_type || "Blood"}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                test.urgency === 'stat' ? 'bg-red-100 text-red-700' :
                                test.urgency === 'urgent' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {test.urgency.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`status-badge ${
                                test.status === 'reported' ? 'status-completed' :
                                test.status === 'completed' ? 'status-active' :
                                test.status === 'in-progress' ? 'status-pending' :
                                'status-pending'
                              }`}>
                                {test.status.replace("-", " ")}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-1">
                                {test.status === 'ordered' && (
                                  <Button size="sm" onClick={() => collectSample(test.test_id)}>
                                    Collect
                                  </Button>
                                )}
                                {test.status === 'sample-collected' && (
                                  <Button size="sm" onClick={() => startAnalysis(test.test_id)}>
                                    Start
                                  </Button>
                                )}
                                {test.status === 'in-progress' && (
                                  <Button size="sm" onClick={() => openResultsDialog(test)}>
                                    Results
                                  </Button>
                                )}
                                {test.status === 'completed' && (
                                  <>
                                    <Button size="sm" onClick={() => verifyResults(test.test_id)}>
                                      Verify
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => viewTestDetails(test)}>
                                      View
                                    </Button>
                                  </>
                                )}
                                {test.status === 'reported' && (
                                  <Button size="sm" variant="outline" onClick={() => viewTestDetails(test)}>
                                    View Report
                                  </Button>
                                )}
                              </div>
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

          <TabsContent value="panels">
            <Card>
              <CardHeader>
                <CardTitle>Available Test Panels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testPanels.map((panel) => (
                    <div key={panel.code} className="p-4 border rounded-lg hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800">{panel.name}</h3>
                          <p className="text-xs text-gray-500">{panel.code}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          {panel.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Sample: {panel.sample_type}</p>
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Tests Included ({panel.tests.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {panel.tests.slice(0, 6).map((test, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {test}
                            </span>
                          ))}
                          {panel.tests.length > 6 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{panel.tests.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-teal-600">${panel.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enter Results Dialog */}
        <Dialog open={openResults} onOpenChange={setOpenResults}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enter Test Results - {selectedTest?.test_name}</DialogTitle>
            </DialogHeader>
            {selectedTest && (
              <form onSubmit={handleEnterResults} className="space-y-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p><span className="font-semibold">Test ID:</span> {selectedTest.test_id}</p>
                  <p><span className="font-semibold">Patient:</span> {selectedTest.patient_id}</p>
                </div>

                <div>
                  <Label className="mb-2 block font-semibold">Test Results</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {resultsForm.result_values.map((result, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 p-2 bg-gray-50 rounded">
                        <div>
                          <Label className="text-xs">Parameter</Label>
                          <Input
                            size="sm"
                            value={result.parameter}
                            readOnly
                            className="text-sm font-semibold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Value *</Label>
                          <Input
                            size="sm"
                            value={result.value}
                            onChange={(e) => updateResultValue(index, "value", e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Input
                            size="sm"
                            value={result.unit}
                            onChange={(e) => updateResultValue(index, "unit", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Reference</Label>
                          <Input
                            size="sm"
                            value={result.reference_range}
                            readOnly
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <select
                            className="w-full px-2 py-1 border rounded text-sm"
                            value={result.status}
                            onChange={(e) => updateResultValue(index, "status", e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="abnormal">Abnormal</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Comments</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-md"
                    rows={2}
                    value={resultsForm.comments}
                    onChange={(e) => setResultsForm({ ...resultsForm, comments: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                  Save Results
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* View Test Details Dialog */}
        <Dialog open={openViewTest} onOpenChange={setOpenViewTest}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lab Test Report</DialogTitle>
            </DialogHeader>
            {selectedTest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-600">Test ID</p>
                    <p className="font-semibold">{selectedTest.test_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Patient ID</p>
                    <p className="font-semibold">{selectedTest.patient_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Test Name</p>
                    <p className="font-semibold">{selectedTest.test_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className="status-badge status-completed">{selectedTest.status}</span>
                  </div>
                </div>

                {selectedTest.result_values && selectedTest.result_values.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">Test Results</h3>
                    <table className="w-full border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left py-2 px-4 border">Parameter</th>
                          <th className="text-left py-2 px-4 border">Value</th>
                          <th className="text-left py-2 px-4 border">Unit</th>
                          <th className="text-left py-2 px-4 border">Reference Range</th>
                          <th className="text-left py-2 px-4 border">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTest.result_values.map((result, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2 px-4 font-semibold">{result.parameter}</td>
                            <td className="py-2 px-4">{result.value}</td>
                            <td className="py-2 px-4">{result.unit}</td>
                            <td className="py-2 px-4 text-sm text-gray-600">{result.reference_range}</td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                result.status === 'critical' ? 'bg-red-100 text-red-700' :
                                result.status === 'abnormal' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {result.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedTest.comments && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">Comments</h3>
                    <p className="p-3 bg-gray-50 rounded">{selectedTest.comments}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">AI Interpretation</h3>
                    <Button
                      onClick={() => aiInterpret(selectedTest.test_id)}
                      disabled={interpretLoading || !selectedTest.result_values}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {interpretLoading ? "Generating..." : "Generate AI Report"}
                    </Button>
                  </div>
                  {aiInterpretation && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                      <pre className="whitespace-pre-wrap text-sm">{aiInterpretation}</pre>
                    </div>
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

export default LabManagement;
