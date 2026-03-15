import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Calendar as CalendarIcon, Clock } from "lucide-react";

const AppointmentManagement = ({ user, onLogout }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: "",
    doctor_id: "",
    department: "opd",
    appointment_type: "consultation",
    appointment_date: "",
    appointment_time: "",
    reason: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/appointments");
      setAppointments(response.data);
    } catch (error) {
      toast.error("Failed to fetch appointments");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/appointments", formData);
      toast.success("Appointment booked successfully!");
      setOpen(false);
      fetchAppointments();
    } catch (error) {
      toast.error("Failed to book appointment");
    }
  };

  const updateStatus = async (appointmentId, status) => {
    try {
      await axios.put(`/appointments/${appointmentId}/status?status=${status}`);
      toast.success("Appointment updated");
      fetchAppointments();
    } catch (error) {
      toast.error("Failed to update appointment");
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="appointment-management-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Appointment Management</h1>
            <p className="text-gray-600 mt-1">Schedule and manage patient appointments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700" data-testid="book-appointment-button">
                <Plus className="w-4 h-4 mr-2" />
                Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="appointment-dialog">
              <DialogHeader>
                <DialogTitle>Book New Appointment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Patient ID *</Label>
                  <Input
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    placeholder="PAT12345678"
                    required
                    data-testid="appointment-patient-input"
                  />
                </div>
                <div>
                  <Label>Doctor ID *</Label>
                  <Input
                    value={formData.doctor_id}
                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                    required
                    data-testid="appointment-doctor-input"
                  />
                </div>
                <div>
                  <Label>Department *</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    data-testid="appointment-department-select"
                  >
                    <option value="opd">OPD</option>
                    <option value="dental">Dental</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="orthopedics">Orthopedics</option>
                    <option value="pediatrics">Pediatrics</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                      required
                      data-testid="appointment-date-input"
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      required
                      data-testid="appointment-time-input"
                    />
                  </div>
                </div>
                <div>
                  <Label>Reason *</Label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                    data-testid="appointment-reason-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="appointment-submit-button">
                  Book Appointment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No appointments scheduled</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="appointments-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Appointment #</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-left py-3 px-4">Date & Time</th>
                      <th className="text-left py-3 px-4">Queue #</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr key={appt.id} className="border-b hover:bg-gray-50" data-testid="appointment-row">
                        <td className="py-3 px-4 font-mono text-sm">{appt.appointment_number}</td>
                        <td className="py-3 px-4">{appt.patient_id}</td>
                        <td className="py-3 px-4 capitalize">{appt.department}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span>{appt.appointment_date}</span>
                            <Clock className="w-4 h-4 text-gray-400 ml-2" />
                            <span>{appt.appointment_time}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                            #{appt.queue_number}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${appt.status === 'completed' ? 'status-completed' : appt.status === 'scheduled' ? 'status-pending' : ''}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {appt.status === "scheduled" && (
                            <Button
                              size="sm"
                              onClick={() => updateStatus(appt.id, "checked-in")}
                              data-testid="checkin-button"
                            >
                              Check In
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

export default AppointmentManagement;