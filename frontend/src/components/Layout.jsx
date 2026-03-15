import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Bed,
  Siren,
  Pill,
  TestTube,
  ScanLine,
  Smile,
  CreditCard,
  Package,
  Scissors,
  HeartPulse,
  Shield,
  UserCog,
  BarChart3,
  LogOut,
  Menu,
  X,
  Settings,
  FileText,
  Wallet,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Plus,
  Search,
  Bell,
  Calculator,
  UserPlus
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState([location.pathname.startsWith("/pharmacy") ? "Pharmacy" : null].filter(Boolean));

  const toggleExpanded = (label) => {
    setExpandedItems(prev => 
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const allMenuItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "doctor", "receptionist", "nurse", "accountant", "hr_manager"] },
    { path: "/patients", icon: Users, label: "Patients", roles: ["admin", "doctor", "receptionist", "nurse"] },
    { path: "/appointments", icon: Calendar, label: "Appointments", roles: ["admin", "doctor", "receptionist"] },
    { path: "/opd", icon: Stethoscope, label: "OPD", roles: ["admin", "doctor"] },
    { path: "/ipd", icon: Bed, label: "IPD", roles: ["admin", "doctor", "nurse"] },
    { path: "/medical-forms", icon: FileText, label: "Medical Forms", roles: ["admin", "doctor"] },
    { path: "/emergency", icon: Siren, label: "Emergency", roles: ["admin", "doctor", "nurse"] },
    { 
      path: "/pharmacy", 
      icon: Pill, 
      label: "Pharmacy", 
      roles: ["admin", "pharmacist"],
      subItems: [
        { path: "/pos", icon: ShoppingCart, label: "POS System" },
        { path: "/pharmacy?tab=stock", icon: Package, label: "Stock Management" },
        { 
          path: "/pharmacy?tab=products", 
          icon: Pill, 
          label: "Product Management",
          subItems: [
            { path: "/pharmacy?tab=products&action=add", icon: Plus, label: "Add New Product" },
            { path: "/pharmacy?tab=category", icon: LayoutDashboard, label: "Category" },
            { path: "/pharmacy?tab=unit", icon: Settings, label: "Unit" },
          ]
        },
      ]
    },
    { path: "/lab", icon: TestTube, label: "Laboratory", roles: ["admin", "lab_tech"] },
    { path: "/radiology", icon: ScanLine, label: "Radiology", roles: ["admin", "radiologist"] },
    { path: "/dental", icon: Smile, label: "Dental", roles: ["admin", "dentist"] },
    { path: "/billing", icon: CreditCard, label: "Billing", roles: ["admin", "doctor", "accountant", "cashier"] },
    { path: "/inventory", icon: Package, label: "Inventory", roles: ["admin", "pharmacist"] },
    { path: "/surgery", icon: Scissors, label: "Surgery", roles: ["admin", "doctor"] },
    { path: "/nursing", icon: HeartPulse, label: "Nursing", roles: ["admin", "nurse"] },
    { path: "/insurance", icon: Shield, label: "Insurance", roles: ["admin", "accountant"] },
    { path: "/hr", icon: UserCog, label: "HR", roles: ["admin", "hr_manager"] },
    { path: "/reports", icon: BarChart3, label: "Reports", roles: ["admin", "accountant"] },
    { path: "/user-management", icon: Settings, label: "User Management", roles: ["admin"] },
    { path: "/patient-portal", icon: Wallet, label: "My Account", roles: ["patient"] },
  ];

  const menuItems = user?.role 
    ? allMenuItems.filter(item => item.roles.includes(user.role))
    : allMenuItems;

  return (
    <div className="dashboard-shell flex h-screen overflow-hidden p-6 gap-6">
      {/* Floating Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-24"
        } tahoe-glass-vibrant rounded-[1.5rem] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-2xl z-50`}
        data-testid="sidebar"
      >
        {/* Logo Section */}
        <div className="h-24 flex items-center justify-between px-8">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2ECC71] flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight" data-testid="app-title">
                HMS<span className="text-[#2ECC71] font-black">Pro</span>
              </h1>
            </div>
          )}
          {!sidebarOpen && (
             <div className="w-10 h-10 rounded-xl bg-[#2ECC71] flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                <Shield className="w-6 h-6 text-white" />
             </div>
          )}
        </div>

        {/* Navigation - Tahoe iOS Style */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-2 py-4 scrollbar-hide" data-testid="main-navigation">
          {menuItems.map((item) => {
            const renderMenuItem = (menuItem, level = 0) => {
              const Icon = menuItem.icon;
              const hasSubItems = menuItem.subItems && menuItem.subItems.length > 0;
              const isExpanded = expandedItems.includes(menuItem.label);
              const isActive = location.pathname + location.search === menuItem.path || 
                               (hasSubItems && (location.pathname + location.search).startsWith(menuItem.path));

              return (
                <div key={menuItem.path} className="space-y-1">
                  <Link 
                    to={hasSubItems ? "#" : menuItem.path}
                    target={menuItem.path === "/pos" ? "_blank" : undefined}
                    rel={menuItem.path === "/pos" ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (hasSubItems) {
                        e.preventDefault();
                        toggleExpanded(menuItem.label);
                      }
                    }}
                  >
                    <div
                      className={`group relative flex items-center rounded-xl transition-all duration-300 ${
                        level === 0 ? "px-4 py-3.5 mx-2" : "px-3 py-2.5 ml-4 mr-2"
                      } ${
                        isActive && !hasSubItems
                          ? "bg-[#2ECC71] text-white shadow-xl shadow-teal-500/30 scale-[1.02]"
                          : (isActive && hasSubItems) 
                            ? "bg-white/40 text-slate-900" 
                            : "text-slate-600 hover:bg-white/50 hover:text-slate-900 hover:scale-[1.05]"
                      }`}
                    >
                      {Icon && <Icon className={`${level === 0 ? "h-5 w-5" : "h-4 w-4"} transition-transform duration-300 group-hover:scale-110 ${!sidebarOpen && "mx-auto"}`} />}
                      {sidebarOpen && (
                        <>
                          <span className={`${level === 0 ? "ml-4 text-sm font-bold" : "ml-3 text-xs font-semibold"} tracking-tight flex-1`}>
                            {menuItem.label}
                          </span>
                          {hasSubItems && (
                            isExpanded ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />
                          )}
                        </>
                      )}
                      {isActive && !hasSubItems && level === 0 && (
                         <div className="absolute left-[-12px] w-1.5 h-6 bg-[#2ECC71] rounded-full" />
                      )}
                    </div>
                  </Link>

                  {hasSubItems && isExpanded && sidebarOpen && (
                    <div className="space-y-1">
                      {menuItem.subItems.map(subItem => renderMenuItem(subItem, level + 1))}
                    </div>
                  )}
                </div>
              );
            };

            return renderMenuItem(item);
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-6">
          <div 
            className={`tahoe-glass rounded-2xl p-4 flex items-center relative overflow-hidden group cursor-pointer active:scale-95 transition-all duration-300 ${!sidebarOpen && "justify-center"}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-white font-bold ring-4 ring-white/30 shadow-lg">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-slate-800 leading-tight">
                  {user?.full_name?.split(' ')[0]}
                </p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {user?.role}
                </p>
              </div>
            )}
            {sidebarOpen ? (
               <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-slate-600 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); onLogout(); }} title="Sign Out">
                  <LogOut className="w-4 h-4" />
               </div>
            ) : (
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-rose-500 text-white transition-opacity" onClick={(e) => { e.stopPropagation(); onLogout(); }} title="Sign Out">
                  <LogOut className="w-5 h-5" />
               </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Glassy Container */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="h-24 flex items-center justify-between px-4 mb-2">
            <div className="flex-1 max-w-xl relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search patients, files, records..." 
                    className="w-full bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all font-medium text-slate-700"
                />
            </div>

            <div className="flex items-center gap-3">
                {/* Quick Actions */}
                <div className="flex items-center bg-white/40 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 gap-1 mr-4">
                    <Link to="/pos" title="POS System" target="_blank" rel="noopener noreferrer">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-teal-500 hover:text-white transition-all cursor-pointer">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                    </Link>
                    <Link to="/patients?action=add" title="Add Patient">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-teal-500 hover:text-white transition-all cursor-pointer">
                            <UserPlus className="w-5 h-5" />
                        </div>
                    </Link>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-teal-500 hover:text-white transition-all cursor-pointer" title="Calculator">
                        <Calculator className="w-5 h-5" />
                    </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-white/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-slate-600 hover:bg-teal-500 hover:text-white transition-all cursor-pointer shadow-sm relative mr-2">
                    <Bell className="w-5 h-5" />
                    <div className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                </div>

                <ThemeToggle />
                
                <Button 
                    variant="ghost" 
                    onClick={onLogout}
                    className="h-12 border border-rose-100 bg-rose-50/30 text-rose-600 hover:bg-rose-500 hover:text-white rounded-2xl px-4 font-black text-[10px] uppercase tracking-widest transition-all gap-2"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </Button>
            </div>
        </div>

        <div className="flex-1 tahoe-glass-vibrant rounded-[1.5rem] overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 overflow-y-auto scrollbar-hide py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
