import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, ShoppingCart, UserPlus, Calculator, 
  History, User, Bell, Package, Plus, Minus, 
  Trash2, CreditCard, Wallet, Banknote, ShieldCheck,
  AlertCircle, Pill, Thermometer, FlaskConical, Stethoscope, 
  Baby, Activity, Info, Clock, Store, ChevronRight,
  Maximize2, Save, FileText, MoveHorizontal, ScanLine, LogOut, LayoutDashboard
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Download, Printer, FileBarChart2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

const PharmacyPOS = ({ user, onLogout }) => {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const navigate = useNavigate();

  // Mock data for categories based on user request
  const categories = [
    { id: '1', name: 'Pain Relief', icon: Pill, count: 124 },
    { id: '2', name: 'Antibiotics', icon: FlaskConical, count: 85 },
    { id: '3', name: 'Cough & Cold', icon: Thermometer, count: 42 },
    { id: '4', name: 'Vitamins', icon: Activity, count: 67 },
    { id: '5', name: 'Baby Care', icon: Baby, count: 31 },
    { id: '6', name: 'First Aid', icon: ShieldCheck, count: 19 },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await axios.get(`${backendUrl}/api/pharmacy/medicines`, {
        params: { search: searchTerm }
      });
      setInventory(response.data || []);
    } catch (error) {
      console.error("Failed to fetch inventory", error);
      toast.error("Failed to load medicines from inventory");
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    if (product.current_stock <= 0) {
      toast.error("Item is out of stock");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.warning("Cannot add more than available stock");
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty > item.current_stock) {
          toast.warning(`Only ${item.current_stock} available in stock`);
          return item;
        }
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (paymentMethod = "cash") => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const saleData = {
        items: cart.map(item => ({
          medicine_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        patient_id: "WALK-IN",
        dispensed_by: user?.full_name || "Pharmacist"
      };

      await axios.post(`${backendUrl}/api/pharmacy/pos-sale`, saleData);
      
      toast.success("Sale completed successfully!");
      setCart([]);
      fetchInventory(); // Refresh stock
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Transaction failed. Please check stock levels.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    setGeneratingReport(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await axios.get(`${backendUrl}/api/pharmacy/daily-report`);
      setReportData(response.data);
      setReportOpen(true);
      toast.success("Daily summary generated");
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Could not fetch daily summary");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadCSV = () => {
    if (!reportData) return;
    
    let csv = "Item Name,Quantity Sold\n";
    reportData.top_items.forEach(item => {
      csv += `${item.name},${item.quantity}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Daily_Report_${reportData.date}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateSubtotal = () => cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  const calculateTotal = () => calculateSubtotal(); // Add tax/discount logic if needed

  const filteredProducts = inventory.filter(p => {
    const matchesSearch = p.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.item_code && p.item_code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || 
                            (p.category || "").toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-background dark:bg-slate-950 overflow-hidden z-[9999]">
      <div className="flex flex-col h-full">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-10 h-16 bg-[#3498DB] border-b border-[#2980B9] flex items-center justify-between px-6 shadow-md text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-white" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-100 uppercase tracking-tighter">Branch</span>
                <span className="text-sm font-black text-white">Main Pharmacy</span>
              </div>
            </div>
            <Separator orientation="vertical" className="h-8 bg-blue-400" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs text uppercase tracking-tighter">
                {user?.full_name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-100 uppercase tracking-tighter">Cashier</span>
                <span className="text-sm font-black text-white">{user?.full_name?.split(' ')[0]}</span>
              </div>
              <Badge variant="outline" className="ml-2 bg-[#27AE60] text-white border-none text-[10px] font-black uppercase tracking-widest px-2 py-0">Active Shift</Badge>
            </div>
          </div>

          <div className="px-6 py-2 rounded-lg bg-black/10 border border-white/10 shadow-inner flex items-center gap-3">
             <Clock className="w-4 h-4 text-blue-100" />
             <span className="text-sm font-black text-white font-mono">
               {currentTime.toLocaleDateString()} — {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
          </div>

          <div className="flex items-center gap-2">
            {window.innerWidth > 1024 && [Calculator, History, User, Bell].map((Icon, idx) => (
               <Button key={idx} variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20 rounded-lg transition-all">
                 <Icon className="w-5 h-5" />
               </Button>
            ))}
            <ThemeToggle />
            <Separator orientation="vertical" className="h-8 mx-2 bg-blue-400" />
            <Button 
              variant="outline" 
              className="bg-[#E74C3C] border-none text-white hover:bg-[#C0392B] rounded-lg h-10 px-4 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
              onClick={handleEndShift}
              disabled={generatingReport}
            >
              <LogOut className="w-4 h-4 mr-2" /> {generatingReport ? "Generating..." : "End Shift"}
            </Button>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="bg-slate-800 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-4 h-10 rounded-lg transition-all ml-2"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
        </header>

        {/* Main POS Content Area */}
        <main className="flex-1 overflow-hidden flex p-6 gap-6">
          {/* LEFT COLUMN */}
          <section className="flex-[1.8] flex flex-col gap-6 overflow-hidden">
            {/* Customer & Prescription Section */}
            <Card className="border-none shadow-sm rounded-lg bg-card dark:bg-slate-900/50 overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-50">
                 <div className="flex-1 relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#2ECC71] transition-colors" />
                    <Input 
                      placeholder="Search / Select Customer (Name, ID, Phone)" 
                      className="border-none bg-slate-50/50 pl-10 focus-visible:ring-0 font-medium" 
                    />
                 </div>
                 <Button variant="outline" className="border-dashed border-slate-200 text-slate-500 hover:text-[#2ECC71] hover:border-teal-200 rounded-lg px-4 h-10">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Customer
                 </Button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 bg-slate-50/30 dark:bg-slate-800/20">
                 <div className="relative group">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#2ECC71] transition-colors" />
                    <Input 
                      placeholder="Prescription ID / Doctor Name" 
                      className="border-none bg-white dark:bg-slate-900 pl-10 focus-visible:ring-0 font-medium h-10 rounded-lg" 
                    />
                 </div>
                 <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-[#3498DB]/10 text-[#3498DB] border-blue-100 uppercase tracking-widest text-[10px] py-1 px-3">Walk-in</Badge>
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 uppercase tracking-widest text-[10px] py-1 px-3 cursor-pointer hover:bg-white transition-colors">Insurance</Badge>
                 </div>
              </div>
            </Card>

            {/* Medicine Search Bar & Results Dropdown */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#2ECC71] transition-colors" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medicine name / SKU / barcode..." 
                className="h-16 pl-14 pr-32 text-lg font-medium border-none shadow-xl shadow-[#2ECC71]/10 rounded-lg focus-visible:ring-[#2ECC71]/20" 
              />
              
              {/* Search Results Dropdown */}
              {searchTerm.length > 1 && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-2xl z-[100] max-h-[400px] overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Matching Items ({filteredProducts.length})</span>
                    <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="h-6 text-[10px] font-bold text-rose-500">Clear</Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-1">
                      {filteredProducts.map(product => (
                        <div 
                          key={product.id} 
                          onClick={() => {
                            addToCart(product);
                            setSearchTerm("");
                          }}
                          className="flex items-center justify-between p-3 hover:bg-[#2ECC71]/10 rounded-md cursor-pointer group transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">{product.item_name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[8px] h-4 bg-slate-50 px-1 font-bold text-slate-500 uppercase">{product.item_code || 'No Code'}</Badge>
                              <span className="text-[10px] text-slate-400 font-medium">Stock: <span className={product.current_stock < 10 ? "text-rose-500 font-bold" : "text-[#27AE60]"}>{product.current_stock}</span></span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-[#2ECC71]">UGX {product.unit_price.toLocaleString()}</span>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 bg-[#2ECC71] text-white hover:bg-[#27AE60] transition-all">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-[#2ECC71] hover:bg-[#2ECC71]/10 rounded-md">
                  <ScanLine className="w-6 h-6" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button size="sm" className="bg-[#2ECC71] hover:bg-[#27AE60] text-white font-bold h-10 rounded-md">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Cart Table Container */}
            <Card className="flex-1 flex flex-col border-none shadow-sm rounded-xl bg-card dark:bg-slate-900/50 overflow-hidden min-h-0">
               <ScrollArea className="flex-1 p-0">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
                       <tr className="border-b border-slate-100">
                         <th className="py-4 px-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Medicine</th>
                         <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Batch</th>
                         <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                         <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                         <th className="py-4 px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                         <th className="py-4 px-6 text-center"></th>
                       </tr>
                    </thead>
                    <tbody>
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-20 text-center">
                            <div className="flex flex-col items-center opacity-30">
                              <ScanLine className="w-16 h-16 mb-4" />
                              <p className="text-xl font-bold">Search or scan medicine to begin a sale</p>
                              <p className="text-sm font-medium">No items added yet</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        cart.map((item) => (
                          <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                            <td className="py-4 px-6">
                               <div className="flex flex-col">
                                 <span className="font-bold text-slate-800 text-sm">{item.item_name}</span>
                                 <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 border-blue-200 text-[#3498DB]/100 bg-[#3498DB]/10/50">OTC</Badge>
                                    <span className="text-[10px] font-bold text-rose-400">Exp: {item.expiry_date}</span>
                                 </div>
                               </div>
                            </td>
                            <td className="py-4 px-4">
                               <span className="text-xs font-mono font-bold text-slate-500">{item.item_code || 'B-9201'}</span>
                            </td>
                            <td className="py-4 px-4">
                               <div className="flex items-center justify-center gap-3">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 rounded-md border border-slate-100 hover:bg-white text-slate-400 hover:text-[#2ECC71]"
                                    onClick={() => updateQuantity(item.id, -1)}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 rounded-md border border-slate-100 hover:bg-white text-slate-400 hover:text-[#2ECC71]"
                                    onClick={() => updateQuantity(item.id, 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                               </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                               <span className="text-xs font-black text-slate-700">{item.unit_price.toLocaleString()}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                               <span className="text-sm font-bold text-slate-900">{(item.unit_price * item.quantity).toLocaleString()}</span>
                            </td>
                            <td className="py-4 px-6 text-center">
                               <Button 
                                 size="icon" 
                                 variant="ghost" 
                                 className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md group-hover:scale-110 transition-transform"
                                 onClick={() => removeFromCart(item.id)}
                               >
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
               </ScrollArea>
               
               {/* Cart Summary Strip */}
               <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-6">
                  <div className="col-span-1 border-r border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items In Cart</p>
                     <p className="text-2xl font-black text-slate-800 tracking-tighter">{cart.reduce((a,b) => a + b.quantity, 0)} <span className="text-xs text-slate-500 font-bold ml-1">Products</span></p>
                  </div>
                  <div className="col-span-1 border-r border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax & Discount</p>
                     <p className="text-lg font-bold text-slate-600 tracking-tighter">0.00 <span className="text-[10px] text-slate-400 ml-1">UGX</span></p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between pl-4">
                     <div>
                        <p className="text-[10px] font-black text-[#2ECC71] uppercase tracking-widest">Total Payable</p>
                        <p className="text-3xl font-[900] text-[#2ECC71] tracking-tighter">UGX {calculateTotal().toLocaleString()}</p>
                     </div>
                     <div className="w-12 h-12 rounded-lg bg-[#2ECC71]/10 flex items-center justify-center text-[#2ECC71]">
                        <TrendingUp className="w-6 h-6" />
                     </div>
                  </div>
               </div>
            </Card>

            <div className="flex items-center gap-3">
               <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-300" />
                  <Input placeholder="Add internal sale note or prescription remarks..." className="border-none bg-transparent h-8 focus-visible:ring-0 text-xs italic" />
               </div>
               <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">No Alerts</span>
               </div>
            </div>
          </section>

          {/* RIGHT COLUMN */}
          <aside className="flex-1 flex flex-col gap-6 overflow-hidden min-h-0">
             <Tabs defaultValue="categories" className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                   <TabsTrigger value="categories" className="rounded-md font-bold text-xs py-2 data-[state=active]:bg-[#3498DB] data-[state=active]:text-white">Categories</TabsTrigger>
                   <TabsTrigger value="brands" className="rounded-md font-bold text-xs py-2 data-[state=active]:bg-[#3498DB] data-[state=active]:text-white">Brands</TabsTrigger>
                   <TabsTrigger value="frequent" className="rounded-md font-bold text-xs py-2 data-[state=active]:bg-[#3498DB] data-[state=active]:text-white">Frequent</TabsTrigger>
                </TabsList>

                <TabsContent value="categories" className="flex-1 overflow-hidden flex flex-col mt-4">
                    <ScrollArea className="flex-1 pr-4">
                       <div className="grid grid-cols-2 gap-4 pb-4">
                          {categories.map((cat) => (
                            <div 
                              key={cat.id} 
                              onClick={() => setSelectedCategory(cat.name)}
                              className={`p-5 rounded-xl border shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden ${
                                selectedCategory === cat.name 
                                ? "bg-[#2ECC71]/10 border-[#2ECC71] ring-2 ring-[#2ECC71]/20" 
                                : "bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:shadow-[#2ECC71]/20/50 hover:border-[#2ECC71]/20 hover:scale-[1.05]"
                              }`}
                            >
                               <div className="absolute top-[-10px] right-[-10px] w-12 h-12 bg-[#2ECC71]/10 rounded-full opacity-50 group-hover:scale-[3] transition-transform duration-700" />
                               <div className="relative z-10">
                                  <cat.icon className={`w-8 h-8 mb-3 group-hover:rotate-12 transition-transform ${selectedCategory === cat.name ? "text-[#27AE60]" : "text-slate-400"}`} />
                                  <p className="text-sm font-black text-slate-800 leading-none">{cat.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{cat.count} Items</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </ScrollArea>
                </TabsContent>
                
                <TabsContent value="frequent" className="flex-1 mt-4">
                   <ScrollArea className="h-full">
                      <div className="space-y-3">
                         {filteredProducts.slice(0, 10).map(product => (
                            <div 
                              key={product.id} 
                              onClick={() => addToCart(product)}
                              className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-50 dark:border-slate-800 flex items-center justify-between hover:border-teal-200 hover:bg-[#2ECC71]/10/30 transition-all cursor-pointer group"
                            >
                               <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800">{product.item_name}</span>
                                  <span className="text-[9px] font-bold text-slate-400 mt-0.5">Stock: {product.current_stock}</span>
                               </div>
                               <span className="text-xs font-black text-[#2ECC71]">UGX {product.unit_price.toLocaleString()}</span>
                            </div>
                         ))}
                      </div>
                   </ScrollArea>
                </TabsContent>
             </Tabs>

             {/* Alerts & Quick Info Section */}
             <div className="space-y-4">
                <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/20 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-rose-500 shadow-sm">
                         <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Low Stock Alerts</p>
                         <p className="text-sm font-black text-rose-900">4 Items Restock</p>
                      </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-rose-300" />
                </div>
                
                <div className="p-4 bg-[#2ECC71] rounded-3xl text-white shadow-xl shadow-[#2ECC71]/100/20 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all">
                   <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
                   <div className="flex items-center justify-between">
                      <Zap className="w-6 h-6 text-teal-200 fill-teal-200/20" />
                      <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Pro Tip</span>
                   </div>
                   <p className="text-sm font-bold leading-relaxed relative z-10">Scan barcode for faster checkout and error-free medicine dispensing.</p>
                   <Button variant="ghost" className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl border-none">
                      Launch Tutorial
                   </Button>
                </div>
             </div>
          </aside>
        </main>

        {/* Bottom Sticky Action Bar */}
        <footer className="h-24 bg-white dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 px-8 flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-md">
           <div className="flex items-center gap-2">
              {[Draft, MoveHorizontal, CreditCard, Wallet].map((Icon, idx) => (
                 <Button key={idx} variant="outline" className="h-14 w-14 rounded-lg border-slate-100 text-slate-500 hover:bg-[#2ECC71] hover:text-white hover:border-[#2ECC71] hover:-translate-y-1 transition-all">
                    <Icon className="w-6 h-6" />
                 </Button>
              ))}
              <Separator orientation="vertical" className="h-10 mx-2" />
           </div>

           <div className="flex items-center gap-3">
              <Button 
                onClick={() => handleCheckout("insurance")}
                disabled={loading || cart.length === 0}
                className="h-16 bg-[#00A3FF] hover:bg-[#0081CC] text-white px-8 rounded-lg font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200/50 flex flex-col gap-0.5 min-w-[140px]"
              >
                 <CreditCard className="w-5 h-5" />
                 <span>Insurance</span>
              </Button>
              <Button 
                onClick={() => handleCheckout("mobile_money")}
                disabled={loading || cart.length === 0}
                className="h-16 bg-[#F43F5E] hover:bg-[#E11D48] text-white px-8 rounded-lg font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-200/50 flex flex-col gap-0.5 min-w-[140px]"
              >
                 <Wallet className="w-5 h-5" />
                 <span>Mobile Money</span>
              </Button>
              <Button 
                onClick={() => handleCheckout("cash")}
                disabled={loading || cart.length === 0}
                className="h-16 bg-[#2ECC71] hover:bg-[#27AE60] text-white px-10 rounded-lg font-[900] text-lg uppercase tracking-widest shadow-xl shadow-[#2ECC71]/30 dark:shadow-[#2ECC71]/10 flex items-center gap-4 min-w-[320px]"
              >
                 <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] opacity-70">Complete Sale</span>
                    <span>{loading ? "PROCESSING..." : "CASH PAYMENT"}</span>
                 </div>
                 <Separator orientation="vertical" className="h-8 bg-white/20" />
                 <span className="text-2xl tracking-tighter">UGX {calculateTotal().toLocaleString()}</span>
              </Button>
           </div>
           
           <Button variant="ghost" className="h-16 flex flex-col items-center justify-center gap-1 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-[#2ECC71] hover:bg-[#2ECC71]/10 rounded-lg px-6">
              <History className="w-5 h-5" />
              Recent
           </Button>
         </footer>
      </div>

      {/* Daily Shift Report Modal */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-xl border-none shadow-2xl bg-white dark:bg-slate-900 text-foreground">
          <DialogHeader className="border-b border-slate-50 pb-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#2ECC71]/10 flex items-center justify-center text-[#2ECC71]">
                   <FileBarChart2 className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-xl font-black text-slate-800">End of Shift Report</DialogTitle>
                   <DialogDescription>Daily summary for {reportData?.date}</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 py-6 pr-4">
             <div id="printable-report" className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                   <Card className="bg-slate-50 dark:bg-slate-800/50 border-none shadow-none p-4 rounded-lg">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales</p>
                      <p className="text-2xl font-black text-[#2ECC71]">{reportData?.currency} {reportData?.total_sales.toLocaleString()}</p>
                   </Card>
                   <Card className="bg-slate-50 dark:bg-slate-800/50 border-none shadow-none p-4 rounded-lg">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{reportData?.transaction_count}</p>
                   </Card>
                </div>

                {/* Payment Breakdown */}
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Breakdown</h4>
                   <div className="space-y-2">
                      {reportData && Object.entries(reportData.payment_methods).map(([method, amount]) => (
                         <div key={method} className="flex justify-between items-center p-3 border border-slate-50 rounded-md bg-white">
                            <span className="text-sm font-bold text-slate-600 capitalize">{method.replace('_', ' ')}</span>
                            <span className="text-sm font-black text-slate-800">{reportData.currency} {amount.toLocaleString()}</span>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Top Items List */}
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Moving Items</h4>
                   <Table className="border border-slate-50 dark:border-slate-800 rounded-lg overflow-hidden">
                      <TableHeader className="bg-slate-50 dark:bg-slate-800">
                         <TableRow>
                            <TableHead className="font-bold">Item Name</TableHead>
                            <TableHead className="text-right font-bold">Qty Sold</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {reportData?.top_items.map((item, idx) => (
                            <TableRow key={idx}>
                               <TableCell className="text-sm font-medium">{item.name}</TableCell>
                               <TableCell className="text-right font-black text-[#2ECC71]">{item.quantity}</TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             </div>

             {/* Print styles */}
             <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * { visibility: hidden; }
                  #printable-report, #printable-report * { visibility: visible; }
                  #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
                }
             `}} />
          </ScrollArea>

          <DialogFooter className="border-t border-slate-50 dark:border-slate-800 pt-4 gap-3 bg-white dark:bg-slate-900">
             <Button variant="outline" className="flex-1 h-12 rounded-lg font-bold" onClick={downloadCSV}>
                <Download className="w-4 h-4 mr-2" /> Download CSV
             </Button>
             <Button variant="outline" className="flex-1 h-12 rounded-lg font-bold" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print PDF
             </Button>
             <Button className="flex-[2] h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-black uppercase tracking-widest" onClick={() => navigate("/dashboard")}>
                Close Shift & Exit
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Custom Helper Icons for the demo
const HoldSale = () => <Clock className="w-5 h-5" />;
const OpenRegister = () => <Store className="w-5 h-5" />;
const Draft = () => <Save className="w-5 h-5" />;
const TrendingUp = ({ className }) => <MoveHorizontal className={className} />;
const Zap = ({ className }) => <Activity className={className} />;

export default PharmacyPOS;
