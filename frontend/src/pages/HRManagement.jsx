import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog, Users, Clock, Award } from "lucide-react";

const HRManagement = ({ user, onLogout }) => {
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="hr-management-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">HR Management</h1>
          <p className="text-gray-600 mt-1">Staff management and attendance tracking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Staff</p>
                  <p className="text-3xl font-bold text-gray-800">0</p>
                </div>
                <Users className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Doctors</p>
                  <p className="text-3xl font-bold text-gray-800">0</p>
                </div>
                <UserCog className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Nurses</p>
                  <p className="text-3xl font-bold text-gray-800">0</p>
                </div>
                <Clock className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Other Staff</p>
                  <p className="text-3xl font-bold text-gray-800">0</p>
                </div>
                <Award className="w-10 h-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Staff management, attendance, and payroll</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default HRManagement;