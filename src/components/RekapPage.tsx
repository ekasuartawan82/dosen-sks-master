import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Printer } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { useCourses } from "@/hooks/useCourses";
import { useActiveAcademicYear } from "@/hooks/useAcademicYear";
import { Skeleton } from "@/components/ui/skeleton";
import ProgramFilter from "./ProgramFilter";
import LevelFilter from "./LevelFilter";
import ClassFilter from "./ClassFilter";

const RekapPage = () => {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const { data: activeAcademicYear } = useActiveAcademicYear();

  // Get filtered courses based on selections
  const { data: courses, isLoading: loadingCourses } = useCourses(
    selectedProgram,
    selectedLevel,
    selectedClass === "all" ? undefined : selectedClass,
    activeAcademicYear?.name
  );

  // Get all assignments for the selected class if specific class is chosen
  const { data: assignments, isLoading: loadingAssignments } = useAssignments(
    selectedClass === "all" ? undefined : selectedClass,
    activeAcademicYear?.name
  );

  // Prepare report data
  const reportData = courses?.map(course => {
    const courseAssignments = course.assignedLecturers || [];
    
    // If specific class is selected, filter assignments for that class
    const relevantLecturers = selectedClass !== "all" 
      ? courseAssignments.filter(lecturer => lecturer.classId === selectedClass)
      : courseAssignments;

    return {
      id: course.id,
      name: course.name,
      sks: course.sks,
      level: course.level,
      lecturers: relevantLecturers,
      lecturerCount: relevantLecturers.length,
      lecturerNames: relevantLecturers.map(l => l.name).filter(Boolean).join(", ") || "Belum ada dosen"
    };
  }) || [];

  // Calculate totals
  const totalCourses = reportData.length;
  const totalSKS = reportData.reduce((sum, course) => sum + Number(course.sks), 0);
  const totalAssignedCourses = reportData.filter(course => course.lecturerCount > 0).length;
  const unassignedCourses = totalCourses - totalAssignedCourses;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Create print-friendly content
    const printContent = document.getElementById('report-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Rekap Ploting Dosen</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .header { text-align: center; margin-bottom: 20px; }
                .summary { margin: 20px 0; }
                .summary-item { display: inline-block; margin-right: 30px; }
                @media print { 
                  body { margin: 0; } 
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loadingCourses || loadingAssignments) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rekap Ploting Dosen</h1>
          <p className="text-muted-foreground">
            Laporan mata kuliah dan dosen yang mengampu
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Simpan PDF
          </Button>
        </div>
      </div>

      {/* Filters - Hidden in print */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <ProgramFilter
          selectedProgram={selectedProgram}
          onProgramChange={setSelectedProgram}
          className="w-full"
        />
        
        <LevelFilter
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          className="w-full"
        />
        
        <ClassFilter
          selectedClass={selectedClass}
          onClassChange={setSelectedClass}
          selectedLevel={selectedLevel}
          className="w-full"
        />
      </div>

      <div id="report-content">
        {/* Report Header */}
        <div className="header">
          <h2 className="text-2xl font-bold">Laporan Ploting Dosen</h2>
          <p className="text-muted-foreground">
            {selectedProgram !== "all" ? `Program: ${selectedProgram}` : "Semua Program"} | 
            {selectedLevel !== "all" ? ` Tingkat: ${selectedLevel}` : " Semua Tingkat"} | 
            {selectedClass !== "all" ? ` Kelas: ${selectedClass}` : " Semua Kelas"}
          </p>
          <p className="text-sm text-muted-foreground">
            Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Summary Statistics */}
        <Card className="summary">
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="summary-item">
                <div className="text-2xl font-bold text-primary">{totalCourses}</div>
                <div className="text-sm text-muted-foreground">Total Mata Kuliah</div>
              </div>
              <div className="summary-item">
                <div className="text-2xl font-bold text-green-600">{totalAssignedCourses}</div>
                <div className="text-sm text-muted-foreground">Sudah Ada Dosen</div>
              </div>
              <div className="summary-item">
                <div className="text-2xl font-bold text-red-600">{unassignedCourses}</div>
                <div className="text-sm text-muted-foreground">Belum Ada Dosen</div>
              </div>
              <div className="summary-item">
                <div className="text-2xl font-bold text-blue-600">{totalSKS}</div>
                <div className="text-sm text-muted-foreground">Total SKS</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Report Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detail Mata Kuliah dan Dosen Pengampu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Mata Kuliah</TableHead>
                    <TableHead className="w-16 text-center">Tingkat</TableHead>
                    <TableHead className="w-16 text-center">SKS</TableHead>
                    <TableHead>Dosen Pengampu</TableHead>
                    <TableHead className="w-20 text-center">Jml Dosen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((course, index) => (
                    <TableRow key={course.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell className="text-center">{course.level}</TableCell>
                      <TableCell className="text-center">{course.sks}</TableCell>
                      <TableCell>
                        {course.lecturerNames || (
                          <span className="text-muted-foreground italic">Belum ada dosen</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          course.lecturerCount > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {course.lecturerCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Tidak ada data</h3>
                <p className="text-muted-foreground">
                  Tidak ada mata kuliah yang sesuai dengan filter yang dipilih
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RekapPage;
