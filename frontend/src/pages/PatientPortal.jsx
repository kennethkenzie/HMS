import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign, Wallet } from "lucide-react";

const statusClasses = {
  pending: "bg-amber-100 text-amber-800",
  partial: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
};

const PatientPortal = ({ user, onLogout }) => {
  const [overview, setOverview] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [openPayment, setOpenPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "card",
  });

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [overviewResponse, billsResponse] = await Promise.all([
        axios.get("/patient-portal/overview"),
        axios.get("/patient-portal/bills"),
      ]);
      setOverview(overviewResponse.data);
      setBills(billsResponse.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load patient portal");
    }
    setLoading(false);
  };

  const openPaymentDialog = (bill) => {
    setSelectedBill(bill);
    setPaymentForm({
      amount: bill.balance_amount,
      method: "card",
    });
    setOpenPayment(true);
  };

  const handlePayBill = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;
    if (paymentForm.amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (paymentForm.amount > selectedBill.balance_amount) {
      toast.error("Payment amount cannot exceed the due balance");
      return;
    }

    try {
      await axios.put(
        `/patient-portal/bills/${selectedBill.bill_number}/payment`,
        null,
        { params: { amount: paymentForm.amount, method: paymentForm.method } }
      );
      toast.success("Payment recorded successfully");
      setOpenPayment(false);
      setSelectedBill(null);
      fetchPortalData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to record payment");
    }
  };

  const billing = overview?.billing || {
    total_billed: 0,
    total_paid: 0,
    total_due: 0,
    pending_bills: 0,
    partial_bills: 0,
    paid_bills: 0,
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="patient-portal-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Account</h1>
          <p className="text-gray-600 mt-1">Track your bills, balances, and partial or full payments.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Billed</p>
                  <p className="text-3xl font-bold text-gray-800">UGX {billing.total_billed.toLocaleString()}</p>
                </div>
                <CreditCard className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-3xl font-bold text-gray-800">UGX {billing.total_paid.toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Due</p>
                  <p className="text-3xl font-bold text-gray-800">UGX {billing.total_due.toLocaleString()}</p>
                </div>
                <Wallet className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : bills.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No bills available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="patient-bills-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4">Bill Number</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-right py-3 px-4">Paid</th>
                      <th className="text-right py-3 px-4">Due</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-center py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm font-semibold">{bill.bill_number}</td>
                        <td className="py-3 px-4 uppercase">{bill.bill_type}</td>
                        <td className="py-3 px-4 text-right">UGX {bill.total_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-600">UGX {bill.paid_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600">UGX {bill.balance_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusClasses[bill.payment_status] || statusClasses.pending}`}>
                            {bill.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{new Date(bill.bill_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-center">
                          {bill.balance_amount > 0 ? (
                            <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={() => openPaymentDialog(bill)}>
                              Pay
                            </Button>
                          ) : (
                            <span className="text-sm text-green-600 font-semibold">Cleared</span>
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

        <Dialog open={openPayment} onOpenChange={setOpenPayment}>
          <DialogContent data-testid="patient-payment-dialog">
            <DialogHeader>
              <DialogTitle>Make Payment</DialogTitle>
            </DialogHeader>
            {selectedBill && (
              <form onSubmit={handlePayBill} className="space-y-4">
                <div className="p-4 bg-teal-50 rounded-lg text-sm">
                  <p><span className="font-semibold">Bill:</span> {selectedBill.bill_number}</p>
                  <p><span className="font-semibold">Total:</span> UGX {selectedBill.total_amount.toLocaleString()}</p>
                  <p><span className="font-semibold">Due:</span> UGX {selectedBill.balance_amount.toLocaleString()}</p>
                  <p className="text-gray-600 mt-2">You can pay the full amount or a partial amount up to the remaining balance.</p>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    max={selectedBill.balance_amount}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>Payment Method *</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  >
                    <option value="card">Card</option>
                    <option value="mobile-money">Mobile Money</option>
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                  Record Payment
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PatientPortal;
