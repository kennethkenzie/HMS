import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const getRequestErrorMessage = (error, fallback) => {
  if (error.code === "ERR_NETWORK") {
    return "Backend server is unavailable. Start the API server and verify REACT_APP_BACKEND_URL.";
  }
  return error.response?.data?.detail || fallback;
};

const initialFormState = {
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
};

const AddPatientPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await axios.post("/patients", formData, {
        params: { registered_by: user?.id },
      });
      toast.success("Patient registered successfully!");
      navigate("/patients");
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to register patient"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="add-patient-page">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/patients">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Patients
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Add New Patient</h1>
            <p className="mt-1 text-gray-600">Create a patient record and portal account from a dedicated registration page.</p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Portal access is created automatically using the email and password below.
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-teal-600" />
              Patient Registration Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    required
                    data-testid="patient-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => updateField("date_of_birth", e.target.value)}
                    required
                    data-testid="patient-dob-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    className="w-full rounded-md border px-3 py-2"
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                    data-testid="patient-gender-select"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="blood_group">Blood Group</Label>
                  <select
                    id="blood_group"
                    className="w-full rounded-md border px-3 py-2"
                    value={formData.blood_group}
                    onChange={(e) => updateField("blood_group", e.target.value)}
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
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                    data-testid="patient-phone-input"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                    data-testid="patient-email-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="account_password">Portal Password *</Label>
                  <Input
                    id="account_password"
                    type="password"
                    value={formData.account_password}
                    onChange={(e) => updateField("account_password", e.target.value)}
                    required
                    data-testid="patient-password-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  required
                  data-testid="patient-address-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name *</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => updateField("emergency_contact_name", e.target.value)}
                    required
                    data-testid="patient-emergency-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
                    required
                    data-testid="patient-emergency-phone-input"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
                <Button asChild type="button" variant="outline">
                  <Link to="/patients">Cancel</Link>
                </Button>
                <Button type="submit" className="gap-2 bg-teal-600 hover:bg-teal-700" disabled={submitting} data-testid="patient-submit-button">
                  <Save className="h-4 w-4" />
                  {submitting ? "Registering..." : "Register Patient"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AddPatientPage;
