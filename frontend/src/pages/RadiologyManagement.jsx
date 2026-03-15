import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ScanLine, X as XRay } from "lucide-react";

const RadiologyManagement = ({ user, onLogout }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/radiology-orders");
      setOrders(response.data);
    } catch (error) {
      toast.error("Failed to fetch radiology orders");
    }
    setLoading(false);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="radiology-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Radiology Management</h1>
          <p className="text-gray-600 mt-1">Imaging orders and reports</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Radiology Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No radiology orders</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="radiology-orders-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Order ID</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Imaging Type</th>
                      <th className="text-left py-3 px-4">Body Part</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Ordered Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50" data-testid="radiology-order-row">
                        <td className="py-3 px-4 font-mono text-sm">{order.order_id}</td>
                        <td className="py-3 px-4">{order.patient_id}</td>
                        <td className="py-3 px-4 font-semibold uppercase">{order.imaging_type}</td>
                        <td className="py-3 px-4 capitalize">{order.body_part}</td>
                        <td className="py-3 px-4">
                          <span className={`status-badge ${order.status === 'completed' ? 'status-completed' : 'status-pending'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{new Date(order.ordered_date).toLocaleDateString()}</td>
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

export default RadiologyManagement;