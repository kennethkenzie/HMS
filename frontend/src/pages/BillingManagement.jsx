import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, FileText, CreditCard, Trash2, DollarSign, Users } from "lucide-react";

const BillingManagement = ({ user, onLogout }) => {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [billForm, setBillForm] = useState({
    patient_id: "",
    bill_type: "opd",
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    notes: ""
  });

  const [itemForm, setItemForm] = useState({
    description: "",
    quantity: 1,
    unit_price: 0
  });

  useEffect(() => {
    fetchBills();
    fetchPatients();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/billing`);
      setBills(response.data || []);
    } catch (error) {
      console.error("Failed to fetch bills");
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/patients`);
      setPatients(response.data || []);
    } catch (error) {
      console.error("Failed to fetch patients");
    }
  };

  const addBillItem = () => {
    if (!itemForm.description || itemForm.unit_price <= 0) {
      toast.error("Please fill in all item details");
      return;
    }

    const amount = itemForm.quantity * itemForm.unit_price;
    const newItem = {
      ...itemForm,
      amount
    };

    const newItems = [...billItems, newItem];
    setBillItems(newItems);
    calculateTotals(newItems);

    setItemForm({
      description: "",
      quantity: 1,
      unit_price: 0
    });
  };

  const removeBillItem = (index) => {
    const newItems = billItems.filter((_, i) => i !== index);
    setBillItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax - billForm.discount_amount;

    setBillForm({
      ...billForm,
      subtotal,
      tax_amount: tax,
      total_amount: total
    });
  };

  const handleDiscountChange = (discount) => {
    const discountAmount = parseFloat(discount) || 0;
    const total = billForm.subtotal + billForm.tax_amount - discountAmount;
    
    setBillForm({
      ...billForm,
      discount_amount: discountAmount,
      total_amount: total
    });
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();

    if (billItems.length === 0) {
      toast.error("Please add at least one item to the bill");
      return;
    }

    if (!billForm.patient_id) {
      toast.error("Please select a patient");
      return;
    }

    try {
      const billData = {
        ...billForm,
        items: billItems
      };

      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/billing?created_by=${user.id}`, billData);
      toast.success("Bill created successfully! It will appear in Reception for payment collection.");
      setOpenCreate(false);
      resetForm();
      fetchBills();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create bill");
    }
  };

  const resetForm = () => {
    setBillForm({
      patient_id: "",
      bill_type: "opd",
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      notes: ""
    });
    setBillItems([]);
    setItemForm({
      description: "",
      quantity: 1,
      unit_price: 0
    });
    setSelectedPatient(null);
  };

  const selectPatient = (patientId) => {
    const patient = patients.find(p => p.patient_id === patientId);
    setSelectedPatient(patient);
    setBillForm({ ...billForm, patient_id: patientId });
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800"
    };
    return colors[status] || colors.pending;
  };

  const stats = {
    total: bills.reduce((sum, b) => sum + b.total_amount, 0),
    pending: bills.filter(b => b.payment_status === 'pending').length,
    paid: bills.filter(b => b.payment_status === 'paid').length
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="billing-management-page">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Billing & Invoices</h1>
            <p className="text-gray-600 mt-1">Create and manage patient bills</p>
          </div>
          {(user?.role === 'doctor' || user?.role === 'admin') && (
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700" data-testid="create-bill-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="create-bill-dialog">
                <DialogHeader>
                  <DialogTitle>Create New Bill</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateBill} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Select Patient *</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={billForm.patient_id}
                        onChange={(e) => selectPatient(e.target.value)}
                        required
                        data-testid="bill-patient-select"
                      >
                        <option value="">Choose patient</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.patient_id}>
                            {patient.patient_id} - {patient.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Bill Type *</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={billForm.bill_type}
                        onChange={(e) => setBillForm({ ...billForm, bill_type: e.target.value })}
                        data-testid="bill-type-select"
                      >
                        <option value="opd">OPD</option>
                        <option value="ipd">IPD</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="lab">Laboratory</option>
                        <option value="radiology">Radiology</option>
                        <option value="dental">Dental</option>
                        <option value="surgery">Surgery</option>
                      </select>
                    </div>
                  </div>

                  {selectedPatient && (
                    <div className="p-4 bg-teal-50 rounded-lg">
                      <h3 className="font-semibold text-teal-800">Patient Details</h3>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p><span className="font-semibold">Name:</span> {selectedPatient.full_name}</p>
                        <p><span className="font-semibold">Phone:</span> {selectedPatient.phone}</p>
                        <p><span className="font-semibold">Blood Group:</span> {selectedPatient.blood_group}</p>
                        <p><span className="font-semibold">Gender:</span> {selectedPatient.gender}</p>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3">Bill Items</h3>
                    <div className="grid grid-cols-12 gap-2 mb-3">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description (e.g., Consultation)"
                          value={itemForm.description}
                          onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                          data-testid="item-description-input"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })}
                          data-testid="item-quantity-input"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Unit Price"
                          min="0"
                          step="0.01"
                          value={itemForm.unit_price}
                          onChange={(e) => setItemForm({ ...itemForm, unit_price: parseFloat(e.target.value) || 0 })}
                          data-testid="item-price-input"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" onClick={addBillItem} className="w-full" data-testid="add-item-button">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {billItems.length > 0 && (
                      <div className="space-y-2">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-2">Description</th>
                              <th className="text-center p-2">Qty</th>
                              <th className="text-right p-2">Unit Price</th>
                              <th className="text-right p-2">Amount</th>
                              <th className="text-center p-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {billItems.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{item.description}</td>
                                <td className="text-center p-2">{item.quantity}</td>
                                <td className="text-right p-2">UGX {item.unit_price.toLocaleString()}</td>
                                <td className="text-right p-2 font-semibold">UGX {item.amount.toLocaleString()}</td>
                                <td className="text-center p-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBillItem(index)}
                                    data-testid={`remove-item-${index}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-semibold">UGX {billForm.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (5%):</span>
                      <span className="font-semibold">UGX {billForm.tax_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Discount:</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 h-8 text-right"
                        value={billForm.discount_amount}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        data-testid="bill-discount-input"
                      />
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span className="text-teal-600">UGX {billForm.total_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md"
                      rows={2}
                      value={billForm.notes}
                      onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                      placeholder="Additional notes or comments"
                      data-testid="bill-notes-input"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-bill-button">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Bill
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-800">UGX {stats.total.toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Bills</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
                </div>
                <CreditCard className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Paid Bills</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.paid}</p>
                </div>
                <FileText className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : bills.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No bills created yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="bills-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4">Bill Number</th>
                      <th className="text-left py-3 px-4">Patient ID</th>
                      <th className="text-left py-3 px-4">Type</th>
                      <th className="text-right py-3 px-4">Total Amount</th>
                      <th className="text-right py-3 px-4">Paid Amount</th>
                      <th className="text-right py-3 px-4">Balance</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id} className="border-b hover:bg-gray-50" data-testid="bill-row">
                        <td className="py-3 px-4 font-mono text-sm font-semibold">{bill.bill_number}</td>
                        <td className="py-3 px-4">{bill.patient_id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase">
                            {bill.bill_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">UGX {bill.total_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">UGX {bill.paid_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600">
                          UGX {bill.balance_amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(bill.payment_status)}`}>
                            {bill.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {new Date(bill.bill_date).toLocaleDateString()}
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

export default BillingManagement;
