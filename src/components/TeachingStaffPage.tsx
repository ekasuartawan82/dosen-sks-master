import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "./StatusBadge";
import TeachingStaffForm from "./forms/TeachingStaffForm";

interface TeachingStaff {
  id: string;
  name: string;
  status: "Non-Fungsional" | "Praktisi";
  structural_position: string;
  teachingSKS: number;
  structuralSKS: number;
  totalWorkload: number;
  courses: Array<{
    id: string;
    name: string;
    sks: number;
    sharedWith: number;
    className?: string;
    classId?: string;
  }>;
}

const getStructuralSKS = (position: string): number => {
  switch (position) {
    case 'Direktur': return 5;
    case 'Wadir': return 4;
    case 'Kapus':
    case 'Kanit':
    case 'Kaprodi': return 3;
    default: return 0;
  }
};

const useTeachingStaff = () => {
  return useQuery({
    queryKey: ['teaching-staff'],
    queryFn: async (): Promise<TeachingStaff[]> => {
      // Get non-functional and practitioner lecturers
      const { data: lecturers, error } = await supabase
        .from('lecturers')
        .select(`
          id,
          name,
          status,
          structural_position,
          assignments (
            course_id,
            class_id,
            courses (
              id,
              name,
              sks,
              program_id
            ),
            classes (
              id,
              name,
              program_id
            )
          )
        `)
        .in('status', ['Non-Fungsional', 'Praktisi']);

      if (error) throw error;

      // Get course assignment counts for team teaching calculation
      const { data: courseCounts, error: countsError } = await supabase
        .from('assignments')
        .select(`
          course_id, 
          class_id,
          lecturers!inner(status),
          courses!inner(program_id)
        `);

      if (countsError) throw countsError;

      // Count how many FUNCTIONAL lecturers are assigned to each course per class
      const courseAssignmentCounts = courseCounts.reduce((acc, assignment) => {
        const key = `${assignment.course_id}-${assignment.class_id || 'no-class'}`;
        // Only count functional lecturers for team teaching calculation
        if (assignment.lecturers.status === 'Fungsional') {
          acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Calculate workload for each lecturer
      return lecturers.map(lecturer => {
        const structuralSKS = getStructuralSKS(lecturer.structural_position);
        
        let teachingSKS = 0;
        const courses = lecturer.assignments.map(assignment => {
          const course = assignment.courses;
          const classInfo = assignment.classes;
          const key = `${course.id}-${assignment.class_id || 'no-class'}`;
          
          let sksShare: number;
          let sharedWith: number;
          
          // For non-functional and practitioner lecturers
          const functionalCount = courseAssignmentCounts[key] || 0;
          if (functionalCount > 0) {
            sksShare = 0; // Non-functional/practitioner doesn't get SKS if functional lecturer exists
            sharedWith = functionalCount;
          } else {
            sksShare = course.sks; // Only gets full SKS if no functional lecturer
            sharedWith = 1;
          }
          
          teachingSKS += sksShare;
          
          return {
            id: course.id,
            name: course.name,
            sks: course.sks,
            sharedWith,
            className: classInfo?.name,
            classId: classInfo?.id
          };
        });

        const totalWorkload = Math.round((teachingSKS + structuralSKS) * 100) / 100;

        return {
          id: lecturer.id,
          name: lecturer.name,
          status: lecturer.status as "Non-Fungsional" | "Praktisi",
          structural_position: lecturer.structural_position,
          teachingSKS: Math.round(teachingSKS * 100) / 100,
          structuralSKS,
          totalWorkload,
          courses
        };
      });
    }
  });
};

const TeachingStaffPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const { data: teachingStaff, isLoading } = useTeachingStaff();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredStaff = teachingStaff?.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staff.status.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getWorkloadStatus = (total: number) => {
    const targetSKS = 12;
    if (total < targetSKS) return "insufficient";
    if (total === targetSKS) return "sufficient";
    return "excess";
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    try {
      // Check if staff has assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('lecturer_id', staffId);

      if (assignments && assignments.length > 0) {
        toast({
          title: "Tidak dapat menghapus tenaga pengajar",
          description: "Tenaga pengajar masih memiliki penugasan mata kuliah. Hapus penugasan terlebih dahulu.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('lecturers')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      toast({ title: `${staffName} berhasil dihapus` });
      queryClient.invalidateQueries({ queryKey: ['teaching-staff'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
    } catch (error) {
      console.error('Error deleting teaching staff:', error);
      toast({
        title: "Gagal menghapus tenaga pengajar",
        description: "Terjadi kesalahan saat menghapus data",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStaff(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tenaga Pengajar Perguruan Tinggi</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Tenaga Pengajar Perguruan Tinggi
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola data dosen Non-Fungsional dan Praktisi
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity gap-2"
        >
          <Plus className="h-4 w-4" />
          Tambah Tenaga Pengajar
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari tenaga pengajar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredStaff.map((staff) => (
          <Card key={staff.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{staff.name}</h3>
                    <p className="text-muted-foreground">{staff.status}</p>
                    {staff.structural_position !== "Tidak Ada" && (
                      <Badge variant="outline" className="mt-1">
                        {staff.structural_position}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <div className="flex gap-2 justify-end mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(staff)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Tenaga Pengajar</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus {staff.name}? 
                            Aksi ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(staff.id, staff.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <StatusBadge status={getWorkloadStatus(staff.totalWorkload)} />
                  <div className="text-sm text-muted-foreground">
                    <div>Total: <span className="font-medium">{staff.totalWorkload.toFixed(1)} SKS</span></div>
                    <div>Mengajar: {staff.teachingSKS.toFixed(1)} | Jabatan: {staff.structuralSKS}</div>
                  </div>
                </div>
              </div>

              {staff.courses && staff.courses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium mb-2">Mata Kuliah yang Diampu:</h4>
                  <div className="flex flex-wrap gap-2">
                    {staff.courses.map((course) => (
                      <Badge key={course.id} variant="secondary" className="text-xs">
                        {course.name} ({course.sks} SKS)
                        {course.sharedWith > 1 && (
                          <span className="ml-1 text-muted-foreground">
                            ÷{course.sharedWith}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Tidak ada tenaga pengajar ditemukan</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Coba kata kunci lain" : "Belum ada data tenaga pengajar"}
          </p>
        </div>
      )}

      <TeachingStaffForm
        open={showForm}
        onOpenChange={handleFormClose}
        staff={editingStaff}
      />
    </div>
  );
};

export default TeachingStaffPage;