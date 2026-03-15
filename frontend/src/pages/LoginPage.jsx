import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "axios";
import { Activity, Heart, Zap, Shield, Mail, Lock, ArrowRight, UserCheck, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LoginPage = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
      const response = await axios.post(`${backendUrl}/api/auth/login`, loginData);
      onLogin(response.data.user, response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative font-['Poppins'] antialiased">
      {/* Dynamic Aurora Background */}
      <div className="absolute inset-0 z-0 bg-[#0F172A]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2ECC71]/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#3498DB]/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row">
        {/* Left Side: Branding and Visuals */}
        <div className="hidden lg:flex flex-1 flex-col justify-between p-16 relative overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 z-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2ECC71] to-[#3498DB] opacity-20 group-hover:opacity-40 transition-opacity" />
              <Stethoscope className="w-9 h-9 text-[#2ECC71] group-hover:scale-110 transition-transform" />
            </div>
            <div>
               <h1 className="text-4xl font-black text-white tracking-tighter uppercase">HMS <span className="text-[#2ECC71] font-black">PRO</span></h1>
               <p className="text-xs font-bold text-[#2ECC71]/60 uppercase tracking-[0.3em]">Hospital Operating System</p>
            </div>
          </motion.div>

          <div className="z-20">
             <motion.h2 
               initial={{ opacity: 0, x: -30 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.2 }}
               className="text-6xl font-black text-white leading-[0.9] tracking-tighter mb-8"
             >
               ADVANCED <br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ECC71] to-[#3498DB]">HEALTHCARE</span> <br />
               ECOLOGY.
             </motion.h2>

             <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: "Secure Data", desc: "Encryption standard v3.0" },
                  { icon: Activity, label: "Real-time", desc: "Live synchronization" },
                  { icon: Zap, label: "Unified", desc: "One platform for all" },
                  { icon: UserCheck, label: "Access", desc: "Role-based controls" }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + (idx * 0.1) }}
                    className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-teal-400/30 transition-colors group"
                  >
                     <item.icon className="w-6 h-6 text-[#2ECC71] mb-3 group-hover:scale-110 transition-transform" />
                     <p className="text-sm font-black text-white uppercase tracking-wider">{item.label}</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.desc}</p>
                  </motion.div>
                ))}
             </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="text-[10px] font-bold text-white uppercase tracking-[0.5em] z-20"
          >
            © 2026 NEXUS HEALTH INFRASTRUCTURE
          </motion.div>

          {/* Abstract Mesh Overlay */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
             <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
          <div className="w-full max-w-[440px] z-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_32px_120px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden">
                <CardHeader className="p-10 pb-0">
                  <div className="w-12 h-1 bg-teal-500 mb-8 rounded-full" />
                  <CardTitle className="text-4xl font-black text-white tracking-tighter mb-2">ACCESS HUB</CardTitle>
                  <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Enter credentials to synchronize session</CardDescription>
                </CardHeader>
                <CardContent className="p-10">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-6">
                      <div className="space-y-2 group">
                        <Label htmlFor="login-email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#2ECC71] transition-colors">Digital Identity</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="doctor@nexus.com"
                            className="h-14 pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-teal-500/20 focus-visible:border-teal-500/50 transition-all font-bold"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <Label htmlFor="login-password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#2ECC71] transition-colors">Access Key</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-500 transition-colors" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            className="h-14 pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-teal-500/20 focus-visible:border-teal-500/50 transition-all font-bold font-mono"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-16 mt-8 bg-teal-500 hover:bg-teal-400 text-[#0F172A] font-black text-sm uppercase tracking-[0.15em] rounded-xl shadow-2xl shadow-teal-500/20 transition-all flex items-center justify-center group"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-4 border-[#0F172A]/20 border-t-[#0F172A] rounded-full animate-spin" />
                      ) : (
                        <>
                          Login
                          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-10 p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 flex items-start gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 animate-ping" />
                     <p className="text-[10px] font-bold text-[#2ECC71]/80 uppercase tracking-wider leading-relaxed">
                        Credentials provided by administrative command. Contact NOC for support.
                     </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.8 }}
               className="mt-8 text-center"
            >
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">System Analytics</p>
               <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                     <span className="text-xs font-bold text-slate-400">99.9%</span>
                     <span className="text-[8px] text-slate-600 font-bold uppercase">Uptime</span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-slate-800" />
                  <div className="flex flex-col items-center">
                     <span className="text-xs font-bold text-slate-400">2ms</span>
                     <span className="text-[8px] text-slate-600 font-bold uppercase">Latency</span>
                  </div>
               </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Background Decorative Element */}
      <div className="absolute right-0 bottom-0 w-[40%] h-[40%] opacity-5 pointer-events-none z-0">
          <Stethoscope className="w-full h-full text-white rotate-[-15deg]" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Font already loaded in index.css */
      `}} />
    </div>
  );
};

export default LoginPage;
