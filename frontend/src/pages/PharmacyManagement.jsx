import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Pill, ShoppingCart, Trash2, Plus, Minus, Package, AlertTriangle, Edit, Save, ChevronDown, LayoutDashboard, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const DEFAULT_PRODUCT_CATEGORIES = [
  "medicine",
  "surgical",
  "dental",
  "lab",
  "consumable",
  "equipment",
];

const formatCategoryLabel = (value) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatExpiryDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

const PharmacyManagement = ({ user, onLogout }) => {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [patientId, setPatientId] = useState("");
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openStockAdjust, setOpenStockAdjust] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pos";

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const [productForm, setProductForm] = useState({
    item_name: "",
    item_code: "",
    category: "medicine",
    unit: "tablets",
    reorder_level: 10,
    supplier: "",
    unit_price: 0,
    current_stock: 0,
    expiry_date: "",
    stock_management: true
  });

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add" && activeTab === "products") {
        setOpenAddProduct(true);
    }
  }, [searchParams, activeTab]);

  const [stockForm, setStockForm] = useState({
    quantity: 0,
    operation: "add"
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/inventory`);
      setInventory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch inventory");
    }
    setLoading(false);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const category = productForm.category.trim();
    if (!category) {
      toast.error("Category is required");
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/inventory`, {
        ...productForm,
        category,
      });
      toast.success("Product added successfully!");
      setOpenAddProduct(false);
      resetProductForm();
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add product");
    }
  };

  const handleUpdateProduct = async (itemId) => {
    try {
      const { id, current_stock, last_restocked, status, ...updateData } = editingItem;
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/inventory/${itemId}`, updateData);
      toast.success("Product updated successfully!");
      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/inventory/${itemId}`);
      toast.success("Product deleted successfully!");
      fetchInventory();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/inventory/${selectedItem.id}/stock?quantity=${stockForm.quantity}&operation=${stockForm.operation}`
      );
      toast.success("Stock adjusted successfully!");
      setOpenStockAdjust(false);
      setSelectedItem(null);
      setStockForm({ quantity: 0, operation: "add" });
      fetchInventory();
    } catch (error) {
      toast.error("Failed to adjust stock");
    }
  };

  const resetProductForm = () => {
    setProductForm({
      item_name: "",
      item_code: "",
      category: "medicine",
      unit: "tablets",
      reorder_level: 10,
      supplier: "",
      unit_price: 0,
      current_stock: 0,
      expiry_date: ""
    });
  };

  const addToCart = (item) => {
    if (item.current_stock <= 0) {
      toast.error("Item out of stock");
      return;
    }
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.current_stock) {
        toast.error("Cannot exceed available stock");
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const item = inventory.find(i => i.id === itemId);
    if (newQuantity > item.current_stock) {
      toast.error("Cannot exceed available stock");
      return;
    }
    setCart(cart.map(c => c.id === itemId ? { ...c, quantity: newQuantity } : c));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      // Deduct stock for each item
      for (const item of cart) {
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/inventory/${item.id}/stock?quantity=${item.quantity}&operation=subtract`
        );
      }

      toast.success(`Sale completed! Total: UGX ${calculateTotal().toLocaleString()}`);
      setCart([]);
      setPatientId("");
      fetchInventory();
    } catch (error) {
      toast.error("Failed to complete sale");
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryOptions = Array.from(
    new Set([
      ...DEFAULT_PRODUCT_CATEGORIES,
      ...inventory.map((item) => item.category).filter(Boolean),
    ])
  );

  const selectedProductCategory = categoryOptions.includes(productForm.category)
    ? productForm.category
    : "__custom__";

  const lowStockItems = inventory.filter(item => item.status === "low-stock" || item.status === "out-of-stock");

  const stats = {
    total: inventory.length,
    lowStock: lowStockItems.length,
    outOfStock: inventory.filter(item => item.status === "out-of-stock").length,
    totalValue: inventory.reduce((sum, item) => sum + (item.unit_price * item.current_stock), 0)
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="pharmacy-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Pharmacy Management</h1>
          <p className="text-gray-600 mt-1">POS System, Stock & Product Management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <Package className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.lowStock}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.outOfStock}</p>
                </div>
                <Trash2 className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-800">UGX {stats.totalValue.toLocaleString()}</p>
                </div>
                <Pill className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Module Selector has moved to sidebar dropdown */}
          <div className="flex justify-end items-center mb-8">
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/40 backdrop-blur-md border border-white/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Inventory Live</span>
            </div>
          </div>

          {/* POS System Tab */}
          <TabsContent value="pos">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Medicine Selection */}
              <div className="lg:col-span-2">
                <Card className="tahoe-glass border-white/20">
                  <CardHeader>
                    <CardTitle>Select Medicines</CardTitle>
                    <Input
                      placeholder="Search medicines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-2"
                      data-testid="search-medicine-input"
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {filteredInventory.map((item) => (
                        <Card
                          key={item.id}
                          className={`cursor-pointer hover:shadow-md transition ${
                            item.current_stock <= 0 ? 'opacity-50' : ''
                          }`}
                          onClick={() => addToCart(item)}
                          data-testid="medicine-card"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800">{item.item_name}</h3>
                                <p className="text-xs text-gray-500">{item.item_code}</p>
                                <p className="text-sm text-teal-600 font-semibold mt-1">
                                  UGX {item.unit_price.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  item.status === 'in-stock' ? 'bg-green-100 text-green-700' :
                                  item.status === 'low-stock' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {item.current_stock} {item.unit}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Shopping Cart */}
              <div>
                <Card className="tahoe-glass border-white/20">
                  <CardHeader>
                    <CardTitle>Cart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Cart is empty</p>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.item_name}</p>
                              <p className="text-xs text-gray-500">UGX {item.unit_price.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                data-testid="decrease-qty"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                data-testid="increase-qty"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromCart(item.id)}
                                data-testid="remove-from-cart"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {cart.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <div className="border-t pt-3">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total:</span>
                            <span className="text-teal-600">UGX {calculateTotal().toLocaleString()}</span>
                          </div>
                        </div>
                        <Input
                          placeholder="Patient ID (optional)"
                          value={patientId}
                          onChange={(e) => setPatientId(e.target.value)}
                          data-testid="patient-id-input"
                        />
                        <Button
                          className="w-full bg-teal-600 hover:bg-teal-700"
                          onClick={handleCheckout}
                          data-testid="checkout-button"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Complete Sale
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Stock Management Tab */}
          <TabsContent value="stock">
            <Card className="tahoe-glass border-white/20">
              <CardHeader>
                <CardTitle>Stock Levels & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockItems.length > 0 && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-800">Low Stock Alerts</h3>
                    </div>
                    <p className="text-sm text-amber-700">
                      {lowStockItems.length} item(s) need restocking
                    </p>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="stock-table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4">Product Name</th>
                        <th className="text-left py-3 px-4">Code</th>
                        <th className="text-right py-3 px-4">Current Stock</th>
                        <th className="text-right py-3 px-4">Reorder Level</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Last Restocked</th>
                        <th className="text-center py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold">{item.item_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.item_code}</td>
                          <td className="py-3 px-4 text-right font-bold">
                            {item.current_stock} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-600">{item.reorder_level}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              item.status === 'in-stock' ? 'bg-green-100 text-green-700' :
                              item.status === 'low-stock' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {item.last_restocked ? new Date(item.last_restocked).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700"
                              onClick={() => {
                                setSelectedItem(item);
                                setOpenStockAdjust(true);
                              }}
                              data-testid="adjust-stock-button"
                            >
                              Adjust Stock
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Management Tab */}
          <TabsContent value="products">
            <Card className="tahoe-glass border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Product Catalog</CardTitle>
                  <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
                    <DialogTrigger asChild>
                      <Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-product-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" data-testid="add-product-dialog">
                      <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddProduct} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Product Name *</Label>
                            <Input
                              value={productForm.item_name}
                              onChange={(e) => setProductForm({ ...productForm, item_name: e.target.value })}
                              required
                              data-testid="product-name-input"
                            />
                          </div>
                          <div>
                            <Label>Product Code</Label>
                            <Input
                              value={productForm.item_code}
                              onChange={(e) => setProductForm({ ...productForm, item_code: e.target.value })}
                              placeholder="Leave blank to auto-generate"
                              data-testid="product-code-input"
                            />
                          </div>
                          <div>
                            <Label>Category *</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={selectedProductCategory}
                              onChange={(e) =>
                                setProductForm({
                                  ...productForm,
                                  category: e.target.value === "__custom__" ? "" : e.target.value,
                                })
                              }
                              data-testid="product-category-select"
                            >
                              {categoryOptions.map((category) => (
                                <option key={category} value={category}>
                                  {formatCategoryLabel(category)}
                                </option>
                              ))}
                              <option value="__custom__">Add New Category</option>
                            </select>
                          </div>
                          {selectedProductCategory === "__custom__" && (
                            <div>
                              <Label>New Category Name *</Label>
                              <Input
                                value={productForm.category}
                                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                                placeholder="Enter a new category"
                                required
                                data-testid="product-category-custom-input"
                              />
                            </div>
                          )}
                          <div>
                            <Label>Unit</Label>
                            <select
                              className="w-full px-3 py-2 border rounded-md"
                              value={productForm.unit}
                              onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                              data-testid="product-unit-select"
                            >
                              <option value="tablets">Tablets</option>
                              <option value="capsules">Capsules</option>
                              <option value="bottles">Bottles</option>
                              <option value="boxes">Boxes</option>
                              <option value="syringes">Syringes</option>
                              <option value="vials">Vials</option>
                            </select>
                          </div>
                          <div>
                            <Label>Unit Price (UGX) *</Label>
                            <Input
                              type="number"
                              min="0"
                              value={productForm.unit_price}
                              onChange={(e) => setProductForm({ ...productForm, unit_price: parseFloat(e.target.value) })}
                              required
                              data-testid="product-price-input"
                            />
                          </div>
                          <div>
                            <Label>Initial Stock</Label>
                            <Input
                              type="number"
                              min="0"
                              value={productForm.current_stock}
                              onChange={(e) => setProductForm({ ...productForm, current_stock: parseInt(e.target.value) })}
                              data-testid="product-stock-input"
                            />
                          </div>
                          <div>
                            <Label>Reorder Level *</Label>
                            <Input
                              type="number"
                              min="0"
                              value={productForm.reorder_level}
                              onChange={(e) => setProductForm({ ...productForm, reorder_level: parseInt(e.target.value) })}
                              required
                              data-testid="product-reorder-input"
                            />
                          </div>
                          <div>
                            <Label>Supplier</Label>
                            <Input
                              value={productForm.supplier}
                              onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                              data-testid="product-supplier-input"
                            />
                          </div>
                          <div>
                            <Label>Expiry Date</Label>
                            <Input
                              type="date"
                              value={productForm.expiry_date}
                              onChange={(e) => setProductForm({ ...productForm, expiry_date: e.target.value })}
                              data-testid="product-expiry-input"
                              className="w-full"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-4 rounded-xl bg-teal-50/50 border border-teal-100">
                          <Checkbox 
                            id="stock_mgmt" 
                            checked={productForm.stock_management}
                            onCheckedChange={(checked) => setProductForm({ ...productForm, stock_management: !!checked })}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label 
                              htmlFor="stock_mgmt" 
                              className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-teal-800"
                            >
                              Enable Stock Management
                            </Label>
                            <p className="text-xs text-teal-600/70 font-medium">
                              Track inventory levels and receive low-stock alerts for this item.
                            </p>
                          </div>
                        </div>
                        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-product-button">
                          Add Product
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="products-table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4">Product Name</th>
                        <th className="text-left py-3 px-4">Code</th>
                        <th className="text-left py-3 px-4">Unit</th>
                        <th className="text-right py-3 px-4">Stock</th>
                        <th className="text-right py-3 px-4">Price (UGX)</th>
                        <th className="text-left py-3 px-4">Supplier</th>
                        <th className="text-left py-3 px-4">Expiry</th>
                        <th className="text-center py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {editingItem?.id === item.id ? (
                              <Input
                                value={editingItem.item_name}
                                onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              <span className="font-semibold">{item.item_name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.item_code}</td>
                          <td className="py-3 px-4 text-sm">{item.unit}</td>
                          <td className="py-3 px-4 text-right font-bold">
                            {item.current_stock}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {editingItem?.id === item.id ? (
                              <Input
                                type="number"
                                value={editingItem.unit_price}
                                onChange={(e) => setEditingItem({ ...editingItem, unit_price: parseFloat(e.target.value) })}
                                className="h-8 text-right"
                              />
                            ) : (
                              item.unit_price.toLocaleString()
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.supplier || 'N/A'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{formatExpiryDate(item.expiry_date)}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex gap-2 justify-center">
                              {editingItem?.id === item.id ? (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleUpdateProduct(item.id)}
                                  data-testid="save-edit-button"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingItem(item)}
                                  data-testid="edit-product-button"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteProduct(item.id)}
                                data-testid="delete-product-button"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Category Management Tab */}
          <TabsContent value="category">
            <Card className="tahoe-glass border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Product Categories</CardTitle>
                    <CardDescription>Organize your pharmacy inventory by therapeutic classes.</CardDescription>
                  </div>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Antibiotics', 'Pain Relief', 'Vitamins', 'Cardiovascular', 'First Aid', 'Skincare'].map((cat) => (
                    <div key={cat} className="p-6 rounded-2xl bg-white/40 border border-white/20 hover:scale-[1.02] transition-all cursor-pointer group">
                      <div className="flex justify-between items-center">
                        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                          <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">12 Items</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-800 mt-4">{cat}</h4>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unit Management Tab */}
          <TabsContent value="unit">
            <Card className="tahoe-glass border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Measurement Units</CardTitle>
                    <CardDescription>Define how products are quantified (e.g., box, mg, ml).</CardDescription>
                  </div>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Unit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['Tab', 'Cap', 'Btl', 'Vial', 'Box', 'Strip', 'Sachet', 'Ampoule'].map((unit) => (
                    <div key={unit} className="p-4 rounded-xl bg-white/30 border border-white/10 flex items-center justify-between">
                      <span className="font-black text-slate-700">{unit}</span>
                      <Settings className="w-4 h-4 text-slate-300 hover:text-teal-500 cursor-pointer" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stock Adjustment Dialog */}
        <Dialog open={openStockAdjust} onOpenChange={setOpenStockAdjust}>
          <DialogContent data-testid="stock-adjust-dialog">
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <form onSubmit={handleStockAdjustment} className="space-y-4">
                <div className="p-4 bg-teal-50 rounded">
                  <p className="font-semibold">{selectedItem.item_name}</p>
                  <p className="text-sm text-gray-600">Current Stock: {selectedItem.current_stock} {selectedItem.unit}</p>
                </div>
                <div>
                  <Label>Operation</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={stockForm.operation}
                    onChange={(e) => setStockForm({ ...stockForm, operation: e.target.value })}
                    data-testid="stock-operation-select"
                  >
                    <option value="add">Add Stock (Restock)</option>
                    <option value="subtract">Subtract Stock (Adjustment/Damage)</option>
                  </select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) })}
                    required
                    data-testid="stock-quantity-input"
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm">
                    New Stock: <span className="font-semibold">
                      {stockForm.operation === 'add' 
                        ? selectedItem.current_stock + (stockForm.quantity || 0)
                        : selectedItem.current_stock - (stockForm.quantity || 0)
                      } {selectedItem.unit}
                    </span>
                  </p>
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-stock-adjust">
                  Confirm Adjustment
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PharmacyManagement;
