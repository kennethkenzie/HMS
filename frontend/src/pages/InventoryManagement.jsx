import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Package, AlertTriangle, Plus, Edit, Save, Trash2, Filter } from "lucide-react";

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

const InventoryManagement = ({ user, onLogout }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openStockAdjust, setOpenStockAdjust] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [productForm, setProductForm] = useState({
    item_name: "",
    item_code: "",
    category: "medicine",
    unit: "pieces",
    reorder_level: 10,
    supplier: "",
    unit_price: 0,
    current_stock: 0,
    expiry_date: ""
  });

  const [stockForm, setStockForm] = useState({
    quantity: 0,
    operation: "add"
  });

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = categoryFilter !== "all" ? { category: categoryFilter } : {};
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/inventory`, { params });
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
      unit: "pieces",
      reorder_level: 10,
      supplier: "",
      unit_price: 0,
      current_stock: 0,
      expiry_date: ""
    });
  };

  const categoryOptions = Array.from(
    new Set([
      ...DEFAULT_PRODUCT_CATEGORIES,
      ...inventory.map((item) => item.category).filter(Boolean),
    ])
  );

  const selectedProductCategory = categoryOptions.includes(productForm.category)
    ? productForm.category
    : "__custom__";

  const filterOptions = [
    { value: "all", label: "All Categories" },
    ...categoryOptions.map((category) => ({
      value: category,
      label: formatCategoryLabel(category),
    })),
  ];

  const filteredInventory = inventory.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => item.status === "low-stock" || item.status === "out-of-stock");

  const stats = {
    total: inventory.length,
    lowStock: lowStockItems.length,
    outOfStock: inventory.filter(item => item.status === "out-of-stock").length,
    totalValue: inventory.reduce((sum, item) => sum + (item.unit_price * item.current_stock), 0)
  };

  const getCategoryBadge = (category) => {
    const badges = {
      medicine: "bg-blue-100 text-blue-700",
      surgical: "bg-red-100 text-red-700",
      dental: "bg-purple-100 text-purple-700",
      lab: "bg-green-100 text-green-700",
      consumable: "bg-gray-100 text-gray-700",
      equipment: "bg-indigo-100 text-indigo-700"
    };
    return badges[category] || "bg-gray-100 text-gray-700";
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="inventory-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all hospital inventory</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <Package className="w-12 h-12 text-purple-500" />
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
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-800">UGX {stats.totalValue.toLocaleString()}</p>
                </div>
                <Package className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Low Stock Alerts</h3>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              {lowStockItems.length} item(s) need restocking
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 5).map((item) => (
                <span key={item.id} className="px-3 py-1 bg-white rounded text-sm">
                  {item.item_name} ({item.current_stock} {item.unit})
                </span>
              ))}
              {lowStockItems.length > 5 && (
                <span className="px-3 py-1 bg-white rounded text-sm font-semibold">
                  +{lowStockItems.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setCategoryFilter("all")}>All Items</TabsTrigger>
              <TabsTrigger value="stock" onClick={() => setCategoryFilter("all")}>Stock Management</TabsTrigger>
            </TabsList>
            <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" data-testid="add-product-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl" data-testid="add-product-dialog">
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
                        <option value="pieces">Pieces</option>
                        <option value="tablets">Tablets</option>
                        <option value="capsules">Capsules</option>
                        <option value="bottles">Bottles</option>
                        <option value="boxes">Boxes</option>
                        <option value="syringes">Syringes</option>
                        <option value="vials">Vials</option>
                        <option value="packs">Packs</option>
                        <option value="rolls">Rolls</option>
                        <option value="units">Units</option>
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
                    <div className="col-span-2">
                      <Label>Expiry Date (for medicines/consumables)</Label>
                      <Input
                        type="date"
                        value={productForm.expiry_date}
                        onChange={(e) => setProductForm({ ...productForm, expiry_date: e.target.value })}
                        data-testid="product-expiry-input"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" data-testid="submit-product-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* All Items Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Inventory Items</CardTitle>
                  <div className="flex gap-3 items-center">
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                      data-testid="search-input"
                    />
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <select
                        className="px-3 py-2 border rounded-md"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        data-testid="category-filter"
                      >
                        {filterOptions.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="inventory-table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4">Product Name</th>
                        <th className="text-left py-3 px-4">Code</th>
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-left py-3 px-4">Unit</th>
                        <th className="text-right py-3 px-4">Price (UGX)</th>
                        <th className="text-right py-3 px-4">Stock</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Supplier</th>
                        <th className="text-center py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50" data-testid="inventory-row">
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
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getCategoryBadge(item.category)}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">{item.unit}</td>
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
                          <td className="py-3 px-4 text-right font-bold">
                            {item.current_stock} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              item.status === 'in-stock' ? 'bg-green-100 text-green-700' :
                              item.status === 'low-stock' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.supplier || 'N/A'}</td>
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
                                  data-testid="edit-button"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteProduct(item.id)}
                                data-testid="delete-button"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredInventory.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      {searchTerm || categoryFilter !== 'all' ? 'No items found matching your filters' : 'No items in inventory. Click "Add Product" to get started.'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Management Tab */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle>Stock Levels & Adjustments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="stock-table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4">Product Name</th>
                        <th className="text-left py-3 px-4">Category</th>
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
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getCategoryBadge(item.category)}`}>
                              {item.category}
                            </span>
                          </td>
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
                              className="bg-purple-600 hover:bg-purple-700"
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
        </Tabs>

        {/* Stock Adjustment Dialog */}
        <Dialog open={openStockAdjust} onOpenChange={setOpenStockAdjust}>
          <DialogContent data-testid="stock-adjust-dialog">
            <DialogHeader>
              <DialogTitle>Adjust Stock Level</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <form onSubmit={handleStockAdjustment} className="space-y-4">
                <div className="p-4 bg-purple-50 rounded">
                  <p className="font-semibold">{selectedItem.item_name}</p>
                  <p className="text-sm text-gray-600">Category: {selectedItem.category}</p>
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
                    <option value="add">Add Stock (Restock/Purchase)</option>
                    <option value="subtract">Subtract Stock (Adjustment/Damage/Loss)</option>
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
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" data-testid="submit-stock-adjust">
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

export default InventoryManagement;
