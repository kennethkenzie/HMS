import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Users, UserPlus, Building2, Shield, Edit, Trash2, CheckCircle, XCircle, Key, Plus } from "lucide-react";

const dashboardAccessByRole = {
  admin: ["Dashboard", "Patients", "Appointments", "OPD", "IPD", "Medical Forms", "Emergency", "Pharmacy", "Laboratory", "Radiology", "Dental", "Billing", "Inventory", "Surgery", "Nursing", "Insurance", "HR", "Reports", "User Management"],
  doctor: ["Dashboard", "Patients", "Appointments", "OPD", "IPD", "Medical Forms", "Emergency", "Billing", "Surgery"],
  dentist: ["Dental"],
  nurse: ["Dashboard", "Patients", "IPD", "Emergency", "Nursing"],
  receptionist: ["Reception Dashboard", "Patients", "Appointments"],
  lab_tech: ["Laboratory"],
  radiologist: ["Radiology"],
  pharmacist: ["Pharmacy", "Inventory"],
  cashier: ["Dashboard", "Billing"],
  accountant: ["Dashboard", "Billing", "Insurance", "Reports"],
  hr_manager: ["Dashboard", "HR"],
  inventory_manager: ["Inventory"],
  patient: ["My Account"],
};

const UserManagement = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [customDepartments, setCustomDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openEditUser, setOpenEditUser] = useState(false);
  const [openAddDept, setOpenAddDept] = useState(false);
  const [openResetPassword, setOpenResetPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filterRole, setFilterRole] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "receptionist",
    department: "",
    specialization: ""
  });

  const [editUserForm, setEditUserForm] = useState({});
  const [newPassword, setNewPassword] = useState("");

  const [newDepartment, setNewDepartment] = useState({
    name: "",
    code: "",
    description: "",
    head_of_department: "",
    contact_extension: "",
    floor_location: ""
  });

  const departmentOptions = [
    ...departments.map((dept) => ({ key: `default-${dept.code}`, name: dept.name })),
    ...customDepartments.map((dept) => ({ key: `custom-${dept.id}`, name: dept.name })),
  ].filter((dept, index, list) => list.findIndex((item) => item.name === dept.name) === index);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchRoles();
    fetchStatistics();
    fetchCustomDepartments();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/users/all", { params: { include_inactive: true } });
      setUsers(response.data);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Failed to fetch departments");
    }
  };

  const fetchCustomDepartments = async () => {
    try {
      const response = await axios.get("/departments/custom");
      setCustomDepartments(response.data);
    } catch (error) {
      console.error("Failed to fetch custom departments");
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get("/roles");
      setRoles(response.data);
    } catch (error) {
      console.error("Failed to fetch roles");
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get("/admin/statistics");
      setStatistics(response.data);
    } catch (error) {
      console.error("Failed to fetch statistics");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/auth/register", newUser);
      toast.success("Staff account created. The staff member can now log in with the email and password you entered.");
      setOpenAddUser(false);
      fetchUsers();
      fetchStatistics();
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "receptionist",
        department: "",
        specialization: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create user");
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/users/${selectedUser.id}`, editUserForm);
      toast.success("User updated successfully!");
      setOpenEditUser(false);
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/users/${selectedUser.id}/password`, null, {
        params: { new_password: newPassword }
      });
      toast.success("Password reset successfully!");
      setOpenResetPassword(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to reset password");
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm("Are you sure you want to deactivate this user?")) return;
    try {
      await axios.delete(`/users/${userId}`);
      toast.success("User deactivated");
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      toast.error("Failed to deactivate user");
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      await axios.put(`/users/${userId}/activate`);
      toast.success("User activated");
      fetchUsers();
      fetchStatistics();
    } catch (error) {
      toast.error("Failed to activate user");
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/departments/custom", newDepartment);
      toast.success("Department created successfully!");
      setOpenAddDept(false);
      fetchCustomDepartments();
      fetchStatistics();
      setNewDepartment({
        name: "",
        code: "",
        description: "",
        head_of_department: "",
        contact_extension: "",
        floor_location: ""
      });
    } catch (error) {
      toast.error("Failed to create department");
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      await axios.delete(`/departments/custom/${deptId}`);
      toast.success("Department deleted");
      fetchCustomDepartments();
      fetchStatistics();
    } catch (error) {
      toast.error("Failed to delete department");
    }
  };

  const openEditDialog = (u) => {
    setSelectedUser(u);
    setEditUserForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      department: u.department || "",
      specialization: u.specialization || ""
    });
    setOpenEditUser(true);
  };

  const openPasswordDialog = (u) => {
    setSelectedUser(u);
    setOpenResetPassword(true);
  };

  const filteredUsers = filterRole ? users.filter(u => u.role === filterRole) : users;
  const selectedNewRole = roles.find((role) => role.name === newUser.role);
  const selectedEditRole = roles.find((role) => role.name === editUserForm.role);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="user-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-600 mt-1">Register staff, assign departments and roles, and manage login accounts.</p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-800">{statistics.total_users}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Users</p>
                    <p className="text-3xl font-bold text-gray-800">{statistics.active_users}</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Departments</p>
                    <p className="text-3xl font-bold text-gray-800">{statistics.total_departments}</p>
                  </div>
                  <Building2 className="w-12 h-12 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Roles</p>
                    <p className="text-3xl font-bold text-gray-800">{roles.length}</p>
                  </div>
                  <Shield className="w-12 h-12 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="users" data-testid="users-tab">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="departments" data-testid="departments-tab">
              <Building2 className="w-4 h-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="roles-tab">
              <Shield className="w-4 h-4 mr-2" />
              Roles & Permissions
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Users</CardTitle>
                  <div className="flex items-center space-x-2">
                    <select
                      className="px-3 py-2 border rounded-md"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      data-testid="filter-role-select"
                    >
                      <option value="">All Roles</option>
                      {roles.map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.display_name}
                        </option>
                      ))}
                    </select>
                    <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
                      <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-user-button">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="add-user-dialog">
                        <DialogHeader>
                          <DialogTitle>Create Staff Account</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddUser} className="space-y-4">
                          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                            Set the staff member's role, department, and password here. These credentials will be used for login.
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Full Name *</Label>
                              <Input
                                value={newUser.full_name}
                                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                required
                                data-testid="new-user-name"
                              />
                            </div>
                            <div>
                              <Label>Email *</Label>
                              <Input
                                type="email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                required
                                data-testid="new-user-email"
                              />
                            </div>
                            <div>
                              <Label>Phone *</Label>
                              <Input
                                value={newUser.phone}
                                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                required
                                data-testid="new-user-phone"
                              />
                            </div>
                            <div>
                              <Label>Password *</Label>
                              <Input
                                type="password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                required
                                data-testid="new-user-password"
                              />
                            </div>
                            <div>
                              <Label>Role *</Label>
                              <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                data-testid="new-user-role"
                              >
                                {roles.map((role) => (
                                  <option key={role.name} value={role.name}>
                                    {role.display_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label>Department</Label>
                              <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={newUser.department}
                                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                                data-testid="new-user-department"
                              >
                                <option value="">Select Department</option>
                                {departmentOptions.map((dept) => (
                                  <option key={dept.key} value={dept.name}>
                                    {dept.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label>Specialization (for doctors)</Label>
                            <Input
                              value={newUser.specialization}
                              onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
                              data-testid="new-user-specialization"
                            />
                          </div>
                          {selectedNewRole && (
                            <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm">
                              <p className="font-semibold text-gray-800">{selectedNewRole.display_name} access preview</p>
                              <p className="text-gray-600 mt-1">{selectedNewRole.description}</p>
                              <p className="mt-2 text-gray-700">
                                Dashboard visibility:
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(dashboardAccessByRole[newUser.role] || []).map((item) => (
                                  <span key={item} className="rounded bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-new-user">
                            Create User
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="users-table">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Name</th>
                          <th className="text-left py-3 px-4">Email</th>
                          <th className="text-left py-3 px-4">Role</th>
                          <th className="text-left py-3 px-4">Department</th>
                          <th className="text-left py-3 px-4">Status</th>
                          <th className="text-left py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-gray-50" data-testid="user-row">
                            <td className="py-3 px-4 font-semibold">{u.full_name}</td>
                            <td className="py-3 px-4">{u.email}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold capitalize">
                                {u.role.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3 px-4">{u.department || "-"}</td>
                            <td className="py-3 px-4">
                              {u.is_active ? (
                                <span className="status-badge status-active">Active</span>
                              ) : (
                                <span className="status-badge status-critical">Inactive</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(u)}
                                  data-testid="edit-user-button"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPasswordDialog(u)}
                                  data-testid="reset-password-button"
                                >
                                  <Key className="w-3 h-3" />
                                </Button>
                                {u.is_active ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeactivateUser(u.id)}
                                    data-testid="deactivate-user-button"
                                  >
                                    <XCircle className="w-3 h-3 text-red-500" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleActivateUser(u.id)}
                                    data-testid="activate-user-button"
                                  >
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Default Departments</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div key={dept.code} className="p-3 bg-gray-50 rounded-lg" data-testid="default-department">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-800">{dept.name}</p>
                            <p className="text-sm text-gray-600">{dept.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Code: {dept.code}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Custom Departments</CardTitle>
                    <Dialog open={openAddDept} onOpenChange={setOpenAddDept}>
                      <DialogTrigger asChild>
                        <Button className="bg-teal-600 hover:bg-teal-700" data-testid="add-department-button">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Department
                        </Button>
                      </DialogTrigger>
                      <DialogContent data-testid="add-department-dialog">
                        <DialogHeader>
                          <DialogTitle>Create Custom Department</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddDepartment} className="space-y-4">
                          <div>
                            <Label>Department Name *</Label>
                            <Input
                              value={newDepartment.name}
                              onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                              required
                              data-testid="new-dept-name"
                            />
                          </div>
                          <div>
                            <Label>Department Code *</Label>
                            <Input
                              value={newDepartment.code}
                              onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value.toUpperCase() })}
                              required
                              data-testid="new-dept-code"
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <textarea
                              className="w-full px-3 py-2 border rounded-md"
                              rows={2}
                              value={newDepartment.description}
                              onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                              data-testid="new-dept-description"
                            />
                          </div>
                          <div>
                            <Label>Floor Location</Label>
                            <Input
                              value={newDepartment.floor_location}
                              onChange={(e) => setNewDepartment({ ...newDepartment, floor_location: e.target.value })}
                              data-testid="new-dept-floor"
                            />
                          </div>
                          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-department">
                            Create Department
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {customDepartments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No custom departments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customDepartments.map((dept) => (
                        <div key={dept.id} className="p-3 bg-teal-50 rounded-lg border border-teal-200" data-testid="custom-department">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-800">{dept.name}</p>
                              <p className="text-sm text-gray-600">{dept.description}</p>
                              <p className="text-xs text-gray-500 mt-1">Code: {dept.code} | Floor: {dept.floor_location || "N/A"}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDepartment(dept.id)}
                              data-testid="delete-department-button"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>System Roles & Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <div key={role.name} className="p-4 border rounded-lg hover:shadow-md transition-shadow" data-testid="role-card">
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{role.display_name}</h3>
                          <p className="text-xs text-gray-500 capitalize">{role.name}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-700">Permissions:</p>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 4).map((perm, idx) => (
                            <span key={idx} className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs">
                              {perm}
                            </span>
                          ))}
                          {role.permissions.length > 4 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              +{role.permissions.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={openEditUser} onOpenChange={setOpenEditUser}>
          <DialogContent data-testid="edit-user-dialog">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleEditUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={editUserForm.full_name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, full_name: e.target.value })}
                      data-testid="edit-user-name"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      data-testid="edit-user-email"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      data-testid="edit-user-phone"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={editUserForm.role}
                      onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                      data-testid="edit-user-role"
                    >
                      {roles.map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={editUserForm.department}
                      onChange={(e) => setEditUserForm({ ...editUserForm, department: e.target.value })}
                      data-testid="edit-user-department"
                    >
                      <option value="">Select Department</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept.key} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Specialization</Label>
                    <Input
                      value={editUserForm.specialization}
                      onChange={(e) => setEditUserForm({ ...editUserForm, specialization: e.target.value })}
                      data-testid="edit-user-specialization"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-edit-user">
                  Update User
                </Button>
                {selectedEditRole && (
                  <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-gray-800">{selectedEditRole.display_name} access preview</p>
                    <p className="text-gray-600 mt-1">{selectedEditRole.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(dashboardAccessByRole[editUserForm.role] || []).map((item) => (
                        <span key={item} className="rounded bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={openResetPassword} onOpenChange={setOpenResetPassword}>
          <DialogContent data-testid="reset-password-dialog">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-semibold">{selectedUser.full_name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>New Password *</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    data-testid="new-password-input"
                  />
                </div>
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="submit-reset-password">
                  Reset Password
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UserManagement;
