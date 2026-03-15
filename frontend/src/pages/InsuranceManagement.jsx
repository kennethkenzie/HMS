import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Shield, FileText } from "lucide-react";

const InsuranceManagement = ({ user, onLogout }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/insurance-claims");
      setClaims(response.data);
    } catch (error) {
      toast.error("Failed to fetch insurance claims");
    }
    setLoading(false);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="insurance-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Insurance Management</h1>
          <p className="text-gray-600 mt-1">Process insurance claims and verifications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Claims</p>
                  <p className="text-3xl font-bold text-gray-800">{claims.length}</p>
                </div>
                <Shield className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Under Review</p>
                  <p className="text-3xl font-bold text-gray-800">{claims.filter(c => c.status === 'under-review').length}</p>
                </div>
                <FileText className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : claims.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No insurance claims</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="claims-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Claim ID</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Insurance Provider</th>
                      <th className="text-left py-3 px-4">Claim Amount</th>
                      <th className="text-left py-3 px-4">Approved Amount</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.id} className="border-b hover:bg-gray-50" data-testid="claim-row">
                        <td className="py-3 px-4 font-mono text-sm">{claim.claim_id}</td>
                        <td className="py-3 px-4">{claim.patient_id}</td>
                        <td className="py-3 px-4 font-semibold">{claim.insurance_provider}</td>
                        <td className="py-3 px-4">${claim.claim_amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-green-600 font-semibold">${claim.approved_amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${
                            claim.status === 'approved' || claim.status === 'paid' ? 'status-completed' :
                            claim.status === 'rejected' ? 'status-critical' :
                            'status-pending'
                          }`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(claim.claim_date).toLocaleDateString()}</td>
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

export default InsuranceManagement;