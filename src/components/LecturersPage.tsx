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
import { useLecturers } from "@/hooks/useLecturers";
import StatusBadge from "./StatusBadge";
import LecturerForm from "./forms/LecturerForm";
import ProgramFilter from "./ProgramFilter";

const LecturersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<any>(null);
  const { data: lecturers, isLoading } = useLecturers(selectedProgram);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredLecturers = lecturers?.filter(lecturer =>
    lecturer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecturer.status.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getWorkloadStatus = (total: number) => {
    const targetSKS = 12;
    if (total < targetSKS) return "insufficient";
    if (total === targetSKS) return "sufficient";
    return "excess";
  };

  const handleDelete = async (lecturerId: string, lecturerName: string) => {
    try {
      // Check if lecturer has assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('lecturer_id', lecturerId);

      if (assignments && assignments.length > 0) {
        toast({
          title: "Tidak dapat menghapus dosen",
          description: "Dosen masih memiliki penugasan mata kuliah. Hapus penugasan terlebih dahulu.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('lecturers')
        .delete()
        .eq('id', lecturerId);

      if (error) throw error;

      toast({ title: `Dosen ${lecturerName} berhasil dihapus` });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
    } catch (error) {
      console.error('Error deleting lecturer:', error);
      toast({
        title: "Gagal menghapus dosen",
        description: "Terjadi kesalahan saat menghapus data dosen",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (lecturer: any) => {
    setEditingLecturer(lecturer);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLecturer(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Data Dosen</h1>
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
            Data Dosen
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola data dosen dan pantau beban kerja mengajar
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity gap-2"
        >
          <Plus className="h-4 w-4" />
          Tambah Dosen
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-2 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari dosen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Program:</span>
          <ProgramFilter 
            selectedProgram={selectedProgram}
            onProgramChange={setSelectedProgram}
            className="w-64"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLecturers.map((lecturer) => (
          <Card key={lecturer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{lecturer.name}</h3>
                    <p className="text-muted-foreground">{lecturer.status}</p>
                    {lecturer.structuralPosition !== "Tidak Ada" && (
                      <Badge variant="outline" className="mt-1">
                        {lecturer.structuralPosition}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <div className="flex gap-2 justify-end mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(lecturer)}
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
                          <AlertDialogTitle>Hapus Dosen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus dosen {lecturer.name}? 
                            Aksi ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(lecturer.id, lecturer.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <StatusBadge status={getWorkloadStatus(lecturer.totalWorkload)} />
                  <div className="text-sm text-muted-foreground">
                    <div>Total: <span className="font-medium">{lecturer.totalWorkload.toFixed(1)} SKS</span></div>
                    <div>Mengajar: {lecturer.teachingSKS.toFixed(1)} | Jabatan: {lecturer.structuralSKS}</div>
                  </div>
                </div>
              </div>

              {lecturer.courses && lecturer.courses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium mb-2">Mata Kuliah yang Diampu:</h4>
                  <div className="flex flex-wrap gap-2">
                    {lecturer.courses.map((course) => (
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

      {filteredLecturers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Tidak ada dosen ditemukan</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Coba kata kunci lain" : "Belum ada data dosen"}
          </p>
        </div>
      )}

      <LecturerForm
        open={showForm}
        onOpenChange={handleFormClose}
        lecturer={editingLecturer}
      />
    </div>
  );
};

export default LecturersPage;