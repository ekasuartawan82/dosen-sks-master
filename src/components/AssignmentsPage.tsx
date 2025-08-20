import { useState } from "react";
import { Trash2, Search, Plus, BookOpen, Users, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useLecturers } from "@/hooks/useLecturers";
import { useCourses } from "@/hooks/useCourses";
import { useClasses } from "@/hooks/useClasses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import AssignmentForm from "./forms/AssignmentForm";

const AssignmentsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const { data: lecturers, isLoading: loadingLecturers } = useLecturers();
  const { data: courses, isLoading: loadingCourses } = useCourses();
  const { data: allClasses, isLoading: loadingClasses } = useClasses();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get classes for selected level
  const availableClasses = allClasses?.filter(cls => 
    !selectedLevel || cls.level.toString() === selectedLevel
  ) || [];

  // Get courses for selected level
  const availableCourses = courses?.filter(course => 
    !selectedLevel || course.level.toString() === selectedLevel
  ) || [];

  // Combine courses and lecturers to create assignments
  const assignments = availableCourses?.map(course => {
    const assignedLecturers = course.assignedLecturers || [];
    
    // Filter lecturers by selected class if a class is selected
    const filteredLecturers = selectedClass 
      ? assignedLecturers.filter(lecturer => lecturer.classId === selectedClass)
      : assignedLecturers;

    return {
      courseId: course.id,
      courseName: course.name,
      courseSKS: course.sks,
      courseLevel: course.level,
      lecturers: filteredLecturers,
      hasAssignments: filteredLecturers.length > 0
    };
  }) || [];

  // Filter assignments based on search query
  const filteredAssignments = assignments.filter(assignment => 
    assignment.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.lecturers.some(lecturer => 
      lecturer.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleRemoveAssignment = async (courseId: string, lecturerId: string, lecturerName: string, classId?: string) => {
    try {
      let query = supabase
        .from('assignments')
        .delete()
        .eq('course_id', courseId)
        .eq('lecturer_id', lecturerId);

      if (classId) {
        query = query.eq('class_id', classId);
      } else {
        query = query.is('class_id', null);
      }

      const { error } = await query;

      if (error) throw error;

      const className = classId 
        ? allClasses?.find(cls => cls.id === classId)?.name 
        : "tanpa kelas";

      toast({
        title: "Penugasan dihapus",
        description: `${lecturerName} telah dihapus dari mata kuliah ini (${className}).`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus penugasan",
        variant: "destructive",
      });
    }
  };

  if (loadingLecturers || loadingCourses || loadingClasses) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ploting Dosen</h1>
          <p className="text-muted-foreground">
            Kelola penugasan dosen untuk setiap mata kuliah berdasarkan kelas
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Penugasan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pilih Tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Tingkat</SelectItem>
              <SelectItem value="1">Tingkat 1</SelectItem>
              <SelectItem value="2">Tingkat 2</SelectItem>
              <SelectItem value="3">Tingkat 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedLevel && (
          <div className="flex-1">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kelas</SelectItem>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Cari mata kuliah atau dosen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {filteredAssignments.map((assignment) => (
          <Card key={assignment.courseId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{assignment.courseName}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        Tingkat {assignment.courseLevel}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {assignment.courseSKS} SKS
                      </span>
                    </div>
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {assignment.lecturers.length} dosen
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {assignment.lecturers.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Dosen yang Ditugaskan:</h4>
                  <div className="space-y-2">
                    {assignment.lecturers.map((lecturer) => (
                      <div key={`${lecturer.id}-${lecturer.classId}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {lecturer.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{lecturer.name}</span>
                            {lecturer.className && (
                              <span className="text-sm text-muted-foreground">
                                {lecturer.className}
                              </span>
                            )}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Penugasan</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus {lecturer.name} dari mata kuliah {assignment.courseName}
                                {lecturer.className ? ` di ${lecturer.className}` : ''}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleRemoveAssignment(assignment.courseId, lecturer.id, lecturer.name, lecturer.classId)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada dosen yang ditugaskan untuk filter ini</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Tidak ada mata kuliah ditemukan</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Coba kata kunci pencarian yang berbeda" : 
             selectedLevel ? "Pilih kelas atau ubah filter tingkat" : 
             "Pilih tingkat untuk melihat mata kuliah"}
          </p>
        </div>
      )}

      <AssignmentForm
        open={showForm}
        onOpenChange={setShowForm}
        selectedLevel={selectedLevel}
        selectedClass={selectedClass}
      />
    </div>
  );
};

export default AssignmentsPage;