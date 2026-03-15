import { Layout } from "@/components/Layout";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import axios from "axios";
import { 
  TrendingUp, AlertCircle, CheckCircle, ArrowUpRight, 
  Zap, Star, Bell, Search, Plus, ShoppingCart, Calculator, UserPlus,
  Users, Calendar, CreditCard, Bed
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';

const chartData = [
  { name: 'Mon', patients: 40, appointments: 24 },
  { name: 'Tue', patients: 30, appointments: 13 },
  { name: 'Wed', patients: 20, appointments: 98 },
  { name: 'Thu', patients: 27, appointments: 39 },
  { name: 'Fri', patients: 18, appointments: 48 },
  { name: 'Sat', patients: 23, appointments: 38 },
  { name: 'Sun', patients: 34, appointments: 43 },
];

const Dashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get("/dashboard/admin");
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
    setLoading(false);
  };

  const statCards = [
    { title: "Patients", value: stats?.total_patients || 0, icon: Users, color: "text-blue-500", trend: "+12%" },
    { title: "Appointments", value: stats?.today_appointments || 0, icon: Calendar, color: "text-emerald-500", trend: "+5%" },
    { title: "Bills", value: stats?.pending_bills || 0, icon: CreditCard, color: "text-orange-500", trend: "-2%" },
    { title: "Admissions", value: stats?.current_admissions || 0, icon: Bed, color: "text-rose-500", trend: "+8%" },
  ];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="px-10 space-y-10 pb-20">
        {/* Hero Section - The "Wow" Factor */}
        <div className="relative pt-4">
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               className="relative z-10"
             >
                <h1 className="text-7xl font-[900] text-slate-900 leading-[0.9] tracking-tighter">
                    Good Morning, <br/>
                    <span className="text-teal-600 italic font-serif">Dr. {user?.full_name?.split(' ')[1] || 'System'}</span>
                </h1>
                <p className="text-slate-500 text-xl mt-6 font-semibold max-w-xl">
                    You have <span className="text-slate-900 underline decoration-teal-500 decoration-4">12 patients</span> scheduled for today. Ready to start?
                </p>
             </motion.div>
        </div>

        {/* Bento Grid Layout - iOS Style */}
        <div className="grid grid-cols-12 gap-6 auto-rows-[160px]">
             {/* Main Chart - Large Bento Item */}
             <Card className="col-span-12 lg:col-span-8 row-span-3 !bg-teal-600/10 !border-teal-500/20 overflow-hidden group">
                  <div className="p-8 h-full flex flex-col">
                      <div className="flex justify-between items-start mb-10">
                          <div>
                              <h3 className="text-2xl font-black text-slate-900">Hospital Pulse</h3>
                              <p className="text-slate-500 font-bold">Activity overview for this week</p>
                          </div>
                          <div className="px-4 py-2 rounded-xl bg-white/50 backdrop-blur-md text-teal-700 font-black text-sm flex items-center gap-2">
                              <Star className="w-4 h-4 fill-teal-500 text-teal-500" />
                              Premium Analytics
                          </div>
                      </div>
                      <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                  <defs>
                                      <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#0d9488" strokeOpacity={0.1} />
                                  <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)'}} />
                                  <Area type="monotone" dataKey="patients" stroke="#0d9488" strokeWidth={5} fillOpacity={1} fill="url(#colorPulse)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
             </Card>

             {/* Stats Cards - Small Bento Items */}
             {statCards.map((stat, i) => (
                <Card key={i} className="col-span-6 lg:col-span-2 row-span-1 hover:scale-105 transition-transform duration-500 !bg-white/40 cursor-pointer group">
                    <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">{stat.trend}</span>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <p className="text-2xl font-black text-slate-900">{loading ? '..' : stat.value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</p>
                    </CardContent>
                </Card>
             ))}

             {/* AI Section - Wide Bento Item */}
             <Card className="col-span-12 lg:col-span-4 row-span-2 bg-slate-900 text-white !border-slate-800 relative overflow-hidden group">
                  <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-teal-500/20 rounded-full blur-[80px]" />
                  <div className="p-8 relative z-10 flex flex-col h-full justify-between">
                      <div>
                          <Zap className="w-10 h-10 text-teal-400 mb-4 animate-pulse" />
                          <h3 className="text-3xl font-black leading-tight">AI Diagnostic <br/>Assistant</h3>
                          <p className="text-slate-400 mt-4 text-sm font-medium leading-relaxed">
                              Leverage predictive models to identify patient risks before they escalate.
                          </p>
                      </div>
                      <button className="w-full py-4 bg-teal-500 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/30">
                          Launch AI Console
                      </button>
                  </div>
             </Card>

              {/* Quick Actions Bento */}
              <Card className="col-span-12 lg:col-span-4 row-span-1 !bg-white/40 border-white/20 p-4">
                   <div className="grid grid-cols-3 gap-3 h-full">
                       <Link to="/pos" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center rounded-2xl bg-teal-500/10 hover:bg-teal-500 hover:text-white transition-all group">
                           <ShoppingCart className="w-6 h-6 mb-2 text-teal-600 group-hover:text-white transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">POS Sale</span>
                       </Link>
                       <Link to="/patients?action=add" className="flex flex-col items-center justify-center rounded-2xl bg-teal-500/10 hover:bg-teal-500 hover:text-white transition-all group">
                           <UserPlus className="w-6 h-6 mb-2 text-teal-600 group-hover:text-white transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Add Patient</span>
                       </Link>
                       <div className="flex flex-col items-center justify-center rounded-2xl bg-teal-500/10 hover:bg-teal-500 hover:text-white transition-all cursor-pointer group">
                           <Calculator className="w-6 h-6 mb-2 text-teal-600 group-hover:text-white transition-colors" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Calculator</span>
                       </div>
                   </div>
              </Card>

             {/* System Health */}
             <Card className="col-span-12 lg:col-span-4 row-span-1 !bg-white/40 flex items-center justify-between px-8">
                  <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
                      <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">System Status</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Servers Operational</p>
                      </div>
                  </div>
                  <TrendingUp className="w-10 h-10 text-slate-200" />
             </Card>
        </div>
      </div>
    </Layout>
  );
};


const Button = ({ children, variant, size, className, ...props }) => {
  const variants = {
    ghost: "bg-transparent hover:bg-slate-100 text-slate-800",
    primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200"
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm"
  };
  return (
    <button className={`inline-flex items-center justify-center rounded-xl font-bold transition-all ${variants[variant || 'primary']} ${sizes[size || 'md']} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Dashboard;
