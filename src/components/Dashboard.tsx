import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorkloadCard from "./WorkloadCard";
import ProgramFilter from "./ProgramFilter";
import { Users, BookOpen, GraduationCap, TrendingUp, School } from "lucide-react";
import { useLecturers } from "@/hooks/useLecturers";
import { usePrograms } from "@/hooks/usePrograms";
import { useState } from "react";

const Dashboard = () => {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const { data: lecturers = [], isLoading, error } = useLecturers(selectedProgram);
  const { data: programs = [] } = usePrograms();

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

  // Calculate total courses taught across all lecturers
  const totalCoursesSet = new Set();
  const totalClassesSet = new Set();
  
  lecturers.forEach(lecturer => {
    lecturer.courses?.forEach(course => {
      totalCoursesSet.add(course.id);
      if (course.classId) {
        totalClassesSet.add(course.classId);
      }
    });
  });

  const totalCourses = totalCoursesSet.size;
  const totalClasses = totalClassesSet.size;

  // Get current program name for display
  const currentProgram = selectedProgram === "all" 
    ? "Semua Program Studi" 
    : programs.find(p => p.id === selectedProgram)?.name || "Program Studi";

  const stats = [
    {
      title: "Total Dosen",
      value: totalLecturers,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Mata Kuliah",
      value: totalCourses,
      icon: BookOpen,
      color: "text-purple-600"
    },
    {
      title: "Kelas Diajar",
      value: totalClasses,
      icon: School,
      color: "text-indigo-600"
    },
    {
      title: "Beban Cukup",
      value: sufficientWorkload,
      icon: TrendingUp,
      color: "text-green-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Dashboard Monitoring
          </h1>
          <p className="text-muted-foreground mt-2">
            Pantau distribusi beban kerja dosen secara real-time - {currentProgram}
          </p>
        </div>
        
        {/* Program Filter */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Filter Program Studi:</label>
          <ProgramFilter 
            selectedProgram={selectedProgram}
            onProgramChange={setSelectedProgram}
            className="w-64"
          />
        </div>
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

      {/* Workload Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Kurang Beban</h3>
                <p className="text-red-700 text-sm">
                  {insufficientWorkload} dosen dengan beban kurang dari 12 SKS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <GraduationCap className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Lebih Beban</h3>
                <p className="text-amber-700 text-sm">
                  {excessWorkload} dosen dengan beban lebih dari 12 SKS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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