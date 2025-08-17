import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorkloadCard from "./WorkloadCard";
import { Users, BookOpen, GraduationCap, TrendingUp } from "lucide-react";
import { useLecturers } from "@/hooks/useLecturers";

const Dashboard = () => {
  const { data: lecturers = [], isLoading, error } = useLecturers();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Memuat data dosen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-destructive">Error memuat data: {error.message}</p>
        </div>
      </div>
    );
  }

  const totalLecturers = lecturers.length;
  const sufficientWorkload = lecturers.filter(l => l.totalWorkload === 12).length;
  const insufficientWorkload = lecturers.filter(l => l.totalWorkload < 12).length;
  const excessWorkload = lecturers.filter(l => l.totalWorkload > 12).length;

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
          {lecturers.map((lecturer) => (
            <WorkloadCard key={lecturer.id} lecturer={lecturer} />
          ))}
        </div>
      </div>

      {/* System Status */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-full">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Sistem Aktif</h3>
              <p className="text-green-700 text-sm">
                Database terhubung dan menampilkan data real-time dari {totalLecturers} dosen dengan perhitungan SKS otomatis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;