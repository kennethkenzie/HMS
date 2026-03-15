import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const getRequestErrorMessage = (error, fallback) => {
  if (error.code === "ERR_NETWORK") {
    return "Backend server is unavailable. Start the API server and verify REACT_APP_BACKEND_URL.";
  }
  return error.response?.data?.detail || fallback;
};

const PatientManagement = ({ user, onLogout }) => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/patients", { params: { search: searchTerm } });
      setPatients(response.data);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, "Failed to fetch patients"));
    }
    setLoading(false);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="patient-management-page">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Patient Management</h1>
            <p className="text-gray-600 mt-1">Register and manage patient records</p>
          </div>
          <Button asChild className="bg-teal-600 hover:bg-teal-700" data-testid="add-patient-button">
            <Link to="/patients/new">
              <Plus className="mr-2 w-4 h-4" />
              Register Patient
            </Link>
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name, patient ID, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchPatients()}
                className="flex-1"
                data-testid="patient-search-input"
              />
              <Button onClick={fetchPatients} data-testid="patient-search-button">Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Patients</CardTitle>
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
                      <th className="text-left py-3 px-4">Blood Group</th>
                      <th className="text-left py-3 px-4">Registration Date</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id} className="border-b hover:bg-gray-50" data-testid="patient-row">
                        <td className="py-3 px-4 font-mono text-sm">{patient.patient_id}</td>
                        <td className="py-3 px-4 font-semibold">{patient.full_name}</td>
                        <td className="py-3 px-4">{patient.phone}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            {patient.blood_group}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(patient.registration_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${patient.status === 'active' ? 'status-active' : ''}`}>
                            {patient.status}
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

export default PatientManagement;
