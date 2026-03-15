import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Scissors, Users } from "lucide-react";

const SurgeryManagement = ({ user, onLogout }) => {
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSurgeries();
  }, []);

  const fetchSurgeries = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/surgeries");
      setSurgeries(response.data);
    } catch (error) {
      toast.error("Failed to fetch surgeries");
    }
    setLoading(false);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="surgery-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Surgery Management</h1>
          <p className="text-gray-600 mt-1">Operation theater scheduling and management</p>
        </div>

        <Card className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                <Scissors className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Operation Theater Management</h3>
                <p className="text-gray-600">Schedule surgeries, manage teams, and track procedures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Surgeries</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : surgeries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No surgeries scheduled</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="surgeries-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Surgery ID</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Surgery Name</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-left py-3 px-4">Scheduled Date</th>
                      <th className="text-left py-3 px-4">OT</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surgeries.map((surgery) => (
                      <tr key={surgery.id} className="border-b hover:bg-gray-50" data-testid="surgery-row">
                        <td className="py-3 px-4 font-mono text-sm">{surgery.surgery_id}</td>
                        <td className="py-3 px-4">{surgery.patient_id}</td>
                        <td className="py-3 px-4 font-semibold">{surgery.surgery_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            surgery.surgery_type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {surgery.surgery_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">{surgery.scheduled_date} {surgery.scheduled_time}</td>
                        <td className="py-3 px-4">{surgery.operation_theater}</td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${
                            surgery.status === 'completed' ? 'status-completed' :
                            surgery.status === 'in-progress' ? 'status-active' :
                            'status-pending'
                          }`}>
                            {surgery.status}
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

export default SurgeryManagement;