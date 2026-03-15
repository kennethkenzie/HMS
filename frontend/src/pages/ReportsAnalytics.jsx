import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, PieChart, Activity } from "lucide-react";

const ReportsAnalytics = ({ user, onLogout }) => {
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-8" data-testid="reports-analytics-page">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Business intelligence and insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 card-hover">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <BarChart3 className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Patient Reports</h3>
                <p className="text-xs text-gray-600">Demographics & trends</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 card-hover">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <TrendingUp className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Revenue Reports</h3>
                <p className="text-xs text-gray-600">Financial analytics</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 card-hover">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <PieChart className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Department Stats</h3>
                <p className="text-xs text-gray-600">Performance metrics</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0 card-hover">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <Activity className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Occupancy Reports</h3>
                <p className="text-xs text-gray-600">Bed utilization</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <div className="text-center text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Revenue chart visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <div className="text-center text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Department wise statistics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsAnalytics;