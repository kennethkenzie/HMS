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
import { UserPlus, Users, Calendar, Search, ClipboardList, CreditCard, DollarSign } from "lucide-react";

const getRequestErrorMessage = (error, fallback) => {
  if (error.code === "ERR_NETWORK") {
    return "Backend server is unavailable. Start the API server and verify REACT_APP_BACKEND_URL.";
  }
  return error.response?.data?.detail || fallback;
};

const ReceptionistDashboard = ({ user, onLogout }) => {
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [bills, setBills] = useState([]);
  const [openPayment, setOpenPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "cash"
  });

  const [patientForm, setPatientForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "male",
    blood_group: "O+",
    phone: "",
    email: "",
    account_password: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    assigned_doctor_id: "",
    assigned_department: ""
  });

  const [assignForm, setAssignForm] = useState({
    assigned_doctor_id: "",
    assigned_department: ""
  });

  useEffect(() => {
    fetchPatients();
    fetchDepartments();
    fetchAllDoctors();
    fetchPendingBills();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/patients`, { params: { search: searchTerm } });
      setPatients(response.data);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to fetch patients"));
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error("Failed to fetch departments");
    }
  };

  const fetchAllDoctors = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/doctors`);
      setAllDoctors(response.data);
    } catch (error) {
      console.error("Failed to fetch doctors");
    }
  };

  const fetchDoctorsByDepartment = async (department) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/doctors`, { params: { department } });
      setDoctors(response.data);
    } catch (error) {
      console.error("Failed to fetch doctors");
    }
  };

  const fetchPendingBills = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/billing`);
      setBills((response.data || []).filter((bill) => bill.payment_status !== "paid"));
    } catch (error) {
      console.error("Failed to fetch bills");
    }
  };

  const handleDepartmentChange = (department) => {
    setPatientForm({ ...patientForm, assigned_department: department, assigned_doctor_id: "" });
    fetchDoctorsByDepartment(department);
  };

  const handleAssignDepartmentChange = (department) => {
    setAssignForm({ ...assignForm, assigned_department: department, assigned_doctor_id: "" });
    fetchDoctorsByDepartment(department);
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/patients`, patientForm, {
        params: { registered_by: user.id }
      });
      toast.success("Patient registered successfully!");
      setOpenRegister(false);
      fetchPatients();
      resetPatientForm();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to register patient"));
    }
  };

  const handleAssignPatient = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/patients/${selectedPatient.patient_id}`, assignForm);
      toast.success("Patient assigned successfully!");
      setOpenAssign(false);
      fetchPatients();
      setSelectedPatient(null);
    } catch (error) {
      toast.error("Failed to assign patient");
    }
  };

  const resetPatientForm = () => {
    setPatientForm({
      full_name: "",
      date_of_birth: "",
      gender: "male",
      blood_group: "O+",
      phone: "",
      email: "",
      account_password: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      assigned_doctor_id: "",
      assigned_department: ""
    });
    setDoctors([]);
  };

  const openAssignDialog = (patient) => {
    setSelectedPatient(patient);
    setAssignForm({
      assigned_doctor_id: patient.assigned_doctor_id || "",
      assigned_department: patient.assigned_department || ""
    });
    if (patient.assigned_department) {
      fetchDoctorsByDepartment(patient.assigned_department);
    }
    setOpenAssign(true);
  };

  const openPaymentDialog = (bill) => {
    setSelectedBill(bill);
    setPaymentForm({
      amount: bill.balance_amount,
      method: "cash"
    });
    setOpenPayment(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    
    if (paymentForm.amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (paymentForm.amount > selectedBill.balance_amount) {
      toast.error("Payment amount cannot exceed balance amount");
      return;
    }

    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/billing/${selectedBill.bill_number}/payment?amount=${paymentForm.amount}&method=${paymentForm.method}&collected_by=${user.id}`
      );
      toast.success("Payment recorded successfully!");
      setOpenPayment(false);
      setSelectedBill(null);
      fetchPendingBills();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record payment");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="receptionist-dashboard">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Reception Desk</h1>
          <p className="text-gray-600 mt-1">Patient registration and management</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-gray-800">{patients.length}</p>
                </div>
                <Users className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-50 to-green-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Doctors</p>
                  <p className="text-3xl font-bold text-gray-800">{allDoctors.length}</p>
                </div>
                <ClipboardList className="w-12 h-12 text-teal-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-3xl font-bold text-gray-800">{departments.length}</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="register" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="register" data-testid="register-tab">
              <UserPlus className="w-4 h-4 mr-2" />
              Register Patient
            </TabsTrigger>
            <TabsTrigger value="patients" data-testid="patients-tab">
              <Users className="w-4 h-4 mr-2" />
              All Patients
            </TabsTrigger>
            <TabsTrigger value="billing" data-testid="billing-tab">
              <CreditCard className="w-4 h-4 mr-2" />
              Bill Clearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>New Patient Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterPatient} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={patientForm.full_name}
                        onChange={(e) => setPatientForm({ ...patientForm, full_name: e.target.value })}
                        required
                        data-testid="patient-name-input"
                      />
                    </div>
                    <div>
                      <Label>Date of Birth *</Label>
                      <Input
                        type="date"
                        value={patientForm.date_of_birth}
                        onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                        required
                        data-testid="patient-dob-input"
                      />
                    </div>
                    <div>
                      <Label>Gender *</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={patientForm.gender}
                        onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                        data-testid="patient-gender-select"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>Blood Group</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={patientForm.blood_group}
                        onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                        data-testid="patient-blood-select"
                      >
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input
                        value={patientForm.phone}
                        onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        required
                        data-testid="patient-phone-input"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={patientForm.email}
                        onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                        required
                        data-testid="patient-email-input"
                      />
                    </div>
                    <div>
                      <Label>Patient Portal Password *</Label>
                      <Input
                        type="password"
                        value={patientForm.account_password}
                        onChange={(e) => setPatientForm({ ...patientForm, account_password: e.target.value })}
                        required
                        data-testid="patient-password-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Address *</Label>
                    <Input
                      value={patientForm.address}
                      onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                      required
                      data-testid="patient-address-input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Emergency Contact Name *</Label>
                      <Input
                        value={patientForm.emergency_contact_name}
                        onChange={(e) => setPatientForm({ ...patientForm, emergency_contact_name: e.target.value })}
                        required
                        data-testid="emergency-name-input"
                      />
                    </div>
                    <div>
                      <Label>Emergency Contact Phone *</Label>
                      <Input
                        value={patientForm.emergency_contact_phone}
                        onChange={(e) => setPatientForm({ ...patientForm, emergency_contact_phone: e.target.value })}
                        required
                        data-testid="emergency-phone-input"
                      />
                    </div>
                  </div>

                  {/* Assignment Section */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-lg mb-4">Assign to Department & Doctor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Department</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={patientForm.assigned_department}
                          onChange={(e) => handleDepartmentChange(e.target.value)}
                          data-testid="patient-department-select"
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.code} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Assign Doctor</Label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={patientForm.assigned_doctor_id}
                          onChange={(e) => setPatientForm({ ...patientForm, assigned_doctor_id: e.target.value })}
                          disabled={!patientForm.assigned_department}
                          data-testid="patient-doctor-select"
                        >
                          <option value="">Select Doctor</option>
                          {doctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              Dr. {doctor.full_name} - {doctor.specialization || doctor.department}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="register-submit-button">
                    Register Patient
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle>Patient List</CardTitle>
                <div className="flex items-center space-x-2 mt-4">
                  <Search className="w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by name, ID, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchPatients()}
                    className="flex-1"
                    data-testid="patient-search-input"
                  />
                  <Button onClick={fetchPatients} data-testid="search-button">Search</Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : patients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No patients found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="patients-table">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Patient ID</th>
                          <th className="text-left py-3 px-4">Name</th>
                          <th className="text-left py-3 px-4">Phone</th>
                          <th className="text-left py-3 px-4">Department</th>
                          <th className="text-left py-3 px-4">Assigned Doctor</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((patient) => {
                          const assignedDoc = allDoctors.find(d => d.id === patient.assigned_doctor_id);
                          return (
                            <tr key={patient.id} className="border-b hover:bg-gray-50" data-testid="patient-row">
                              <td className="py-3 px-4 font-mono text-sm">{patient.patient_id}</td>
                              <td className="py-3 px-4 font-semibold">{patient.full_name}</td>
                              <td className="py-3 px-4">{patient.phone}</td>
                              <td className="py-3 px-4">
                                {patient.assigned_department ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                    {patient.assigned_department}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Not assigned</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {assignedDoc ? (
                                  <span className="text-sm">Dr. {assignedDoc.full_name}</span>
                                ) : (
                                  <span className="text-gray-400">Not assigned</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAssignDialog(patient)}
                                  data-testid="assign-button"
                                >
                                  Assign
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Outstanding Bills for Payment Collection</CardTitle>
              </CardHeader>
              <CardContent>
                {bills.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No pending bills</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="bills-table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4">Bill Number</th>
                          <th className="text-left py-3 px-4">Patient ID</th>
                          <th className="text-left py-3 px-4">Bill Type</th>
                          <th className="text-right py-3 px-4">Total Amount</th>
                          <th className="text-right py-3 px-4">Balance Due</th>
                          <th className="text-left py-3 px-4">Created Date</th>
                          <th className="text-center py-3 px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map((bill) => (
                          <tr key={bill.id} className="border-b hover:bg-gray-50" data-testid="bill-row">
                            <td className="py-3 px-4 font-mono text-sm font-semibold text-teal-600">
                              {bill.bill_number}
                            </td>
                            <td className="py-3 px-4">{bill.patient_id}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">
                                {bill.bill_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">UGX {bill.total_amount.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-red-600">
                              UGX {bill.balance_amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {new Date(bill.bill_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                className="bg-teal-600 hover:bg-teal-700"
                                onClick={() => openPaymentDialog(bill)}
                                data-testid="collect-payment-button"
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Collect Payment
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

        {/* Assign Dialog */}
        <Dialog open={openAssign} onOpenChange={setOpenAssign}>
          <DialogContent data-testid="assign-dialog">
            <DialogHeader>
              <DialogTitle>Assign Patient to Department & Doctor</DialogTitle>
            </DialogHeader>
            {selectedPatient && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-semibold">{selectedPatient.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedPatient.patient_id}</p>
                </div>
                <form onSubmit={handleAssignPatient} className="space-y-4">
                  <div>
                    <Label>Department</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={assignForm.assigned_department}
                      onChange={(e) => handleAssignDepartmentChange(e.target.value)}
                      data-testid="assign-department-select"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.code} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Assign Doctor</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={assignForm.assigned_doctor_id}
                      onChange={(e) => setAssignForm({ ...assignForm, assigned_doctor_id: e.target.value })}
                      disabled={!assignForm.assigned_department}
                      data-testid="assign-doctor-select"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.full_name} - {doctor.specialization || doctor.department}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="assign-submit-button">
                    Assign Patient
                  </Button>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={openPayment} onOpenChange={setOpenPayment}>
          <DialogContent data-testid="payment-dialog">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {selectedBill && (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-semibold">Bill Number:</p>
                      <p className="font-mono text-teal-600">{selectedBill.bill_number}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Patient ID:</p>
                      <p>{selectedBill.patient_id}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Bill Type:</p>
                      <p className="uppercase">{selectedBill.bill_type}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Total Amount:</p>
                      <p className="font-bold">UGX {selectedBill.total_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Paid Amount:</p>
                      <p className="text-green-600">UGX {selectedBill.paid_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Balance Due:</p>
                      <p className="font-bold text-red-600">UGX {selectedBill.balance_amount.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div>
                    <Label>Payment Amount *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={selectedBill.balance_amount}
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                      required
                      data-testid="payment-amount-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum amount: UGX {selectedBill.balance_amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <Label>Payment Method *</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                      data-testid="payment-method-select"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="insurance">Insurance</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="record-payment-button">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ReceptionistDashboard;
