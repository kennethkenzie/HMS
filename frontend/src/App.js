import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";

import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import PatientManagement from "@/pages/PatientManagement";
import AddPatientPage from "@/pages/AddPatientPage";
import AppointmentManagement from "@/pages/AppointmentManagement";
import OPDManagement from "@/pages/OPDManagement";
import IPDManagement from "@/pages/IPDManagement";
import EmergencyManagement from "@/pages/EmergencyManagement";
import PharmacyManagement from "@/pages/PharmacyManagement";
import LabManagement from "@/pages/LabManagement";
import RadiologyManagement from "@/pages/RadiologyManagement";
import DentalManagement from "@/pages/DentalManagement";
import BillingManagement from "@/pages/BillingManagement";
import InventoryManagement from "@/pages/InventoryManagement";
import SurgeryManagement from "@/pages/SurgeryManagement";
import NursingStation from "@/pages/NursingStation";
import InsuranceManagement from "@/pages/InsuranceManagement";
import HRManagement from "@/pages/HRManagement";
import MedicalForms from "@/pages/MedicalForms";
import ReportsAnalytics from "@/pages/ReportsAnalytics";
import ReceptionistDashboard from "@/pages/ReceptionistDashboard";
import UserManagement from "@/pages/UserManagement";
import PatientPortal from "@/pages/PatientPortal";
import PharmacyPOS from "@/pages/PharmacyPOS";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API = `${BACKEND_URL}/api`;

axios.defaults.baseURL = API;

const defaultPathByRole = {
  receptionist: "/reception",
  pharmacist: "/pharmacy",
  nurse: "/nursing",
  lab_tech: "/lab",
  dentist: "/dental",
  radiologist: "/radiology",
  patient: "/patient-portal",
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common.Authorization = token;
    }
    setLoading(false);
  }, []);

  const getDefaultPath = (role) => defaultPathByRole[role] || "/dashboard";

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    axios.defaults.headers.common.Authorization = token;
    toast.success(`Welcome, ${userData.full_name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common.Authorization;
    toast.info("Logged out successfully");
  };

  const renderProtected = (allowedRoles, element) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={getDefaultPath(user.role)} replace />;
    }
    return element;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to={getDefaultPath(user.role)} replace />}
            />
            <Route
              path="/dashboard"
              element={renderProtected(["admin", "doctor", "accountant", "hr_manager", "cashier"], <Dashboard user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/reception"
              element={renderProtected(["receptionist"], <ReceptionistDashboard user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/patients"
              element={renderProtected(["admin", "doctor", "receptionist", "nurse"], <PatientManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/patients/new"
              element={renderProtected(["admin", "doctor", "receptionist", "nurse"], <AddPatientPage user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/appointments"
              element={renderProtected(["admin", "doctor", "receptionist"], <AppointmentManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/opd"
              element={renderProtected(["admin", "doctor"], <OPDManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/ipd"
              element={renderProtected(["admin", "doctor", "nurse"], <IPDManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/emergency"
              element={renderProtected(["admin", "doctor", "nurse"], <EmergencyManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/pharmacy"
              element={renderProtected(["admin", "pharmacist"], <PharmacyManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/pos"
              element={renderProtected(["admin", "pharmacist", "cashier"], <PharmacyPOS user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/lab"
              element={renderProtected(["admin", "lab_tech"], <LabManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/radiology"
              element={renderProtected(["admin", "radiologist"], <RadiologyManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/dental"
              element={renderProtected(["admin", "dentist"], <DentalManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/billing"
              element={renderProtected(["admin", "doctor", "accountant", "cashier"], <BillingManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/inventory"
              element={renderProtected(["admin", "pharmacist"], <InventoryManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/surgery"
              element={renderProtected(["admin", "doctor"], <SurgeryManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/nursing"
              element={renderProtected(["admin", "nurse"], <NursingStation user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/insurance"
              element={renderProtected(["admin", "accountant"], <InsuranceManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/hr"
              element={renderProtected(["admin", "hr_manager"], <HRManagement user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/medical-forms"
              element={renderProtected(["admin", "doctor"], <MedicalForms user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/reports"
              element={renderProtected(["admin", "accountant"], <ReportsAnalytics user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/patient-portal"
              element={renderProtected(["patient"], <PatientPortal user={user} onLogout={handleLogout} />)}
            />
            <Route
              path="/user-management"
              element={renderProtected(["admin"], <UserManagement user={user} onLogout={handleLogout} />)}
            />
            <Route path="/" element={<Navigate to={getDefaultPath(user?.role)} replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
