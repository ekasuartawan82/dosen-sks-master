import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorkloadCard from "./WorkloadCard";
import { Users, BookOpen, GraduationCap, TrendingUp } from "lucide-react";

// Mock data - will be replaced with real data from Supabase
const mockLecturers = [
  {
    id: "1",
    name: "Dr. Budi Santoso, M.Kom.",
    status: "Fungsional",
    structuralPosition: "Kaprodi",
    teachingSKS: 9.0,
    structuralSKS: 3,
    totalWorkload: 12.0
  },
  {
    id: "2", 
    name: "Siti Rahayu, S.Kom., M.T.",
    status: "Fungsional",
    structuralPosition: "Tidak Ada",
    teachingSKS: 10.5,
    structuralSKS: 0,
    totalWorkload: 10.5
  },
  {
    id: "3",
    name: "Ahmad Hidayat, M.Cs.",
    status: "Non-Fungsional", 
    structuralPosition: "Wadir",
    teachingSKS: 9.5,
    structuralSKS: 4,
    totalWorkload: 13.5
  },
  {
    id: "4",
    name: "Maya Sari, S.T., M.Kom.",
    status: "Praktisi",
    structuralPosition: "Tidak Ada",
    teachingSKS: 8.0,
    structuralSKS: 0,
    totalWorkload: 8.0
  }
];

const Dashboard = () => {
  const totalLecturers = mockLecturers.length;
  const sufficientWorkload = mockLecturers.filter(l => l.totalWorkload === 12).length;
  const insufficientWorkload = mockLecturers.filter(l => l.totalWorkload < 12).length;
  const excessWorkload = mockLecturers.filter(l => l.totalWorkload > 12).length;

  const stats = [
    {
      title: "Total Dosen",
      value: totalLecturers,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Beban Cukup",
      value: sufficientWorkload,
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Kurang Beban",
      value: insufficientWorkload,
      icon: BookOpen,
      color: "text-red-600"
    },
    {
      title: "Lebih Beban", 
      value: excessWorkload,
      icon: GraduationCap,
      color: "text-amber-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Dashboard Monitoring
        </h1>
        <p className="text-muted-foreground mt-2">
          Pantau distribusi beban kerja dosen secara real-time
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-gradient-to-br from-card to-card/50 shadow-card hover:shadow-lg transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Workload Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Status Beban Kerja Dosen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockLecturers.map((lecturer) => (
            <WorkloadCard key={lecturer.id} lecturer={lecturer} />
          ))}
        </div>
      </div>

      {/* Connect Supabase Notice */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Siap untuk Data Real</h3>
              <p className="text-blue-700 text-sm">
                Interface sudah siap. Hubungkan dengan Supabase untuk mengelola data dosen, mata kuliah, dan penugasan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;