import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Edit, Trash2, School } from "lucide-react";
import { usePrograms, useDeleteProgram } from "@/hooks/usePrograms";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ProgramForm from "./forms/ProgramForm";

const ProgramsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);

  const { data: programs = [], isLoading, error } = usePrograms();
  const deleteProgram = useDeleteProgram();

  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (program: any) => {
    try {
      await deleteProgram.mutateAsync(program.id);
      toast.success(`Program ${program.name} berhasil dihapus`);
    } catch (error: any) {
      toast.error(`Gagal menghapus program: ${error.message}`);
    }
  };

  const handleEdit = (program: any) => {
    setEditingProgram(program);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProgram(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error memuat data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Program Studi
          </h1>
          <p className="text-muted-foreground mt-2">
            Kelola data program studi untuk sistem multi-prodi
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Program Studi
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Cari program studi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Programs Grid */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <School className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery ? "Program studi tidak ditemukan" : "Belum ada program studi"}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchQuery 
                ? "Coba ubah kata kunci pencarian atau tambah program studi baru"
                : "Tambahkan program studi pertama untuk memulai"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="bg-gradient-to-br from-card to-card/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{program.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {program.code}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {program.description && (
                  <p className="text-sm text-muted-foreground">
                    {program.description}
                  </p>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(program)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Program Studi</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus program studi "{program.name}"? 
                          Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi semua data terkait.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(program)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Program Form Dialog */}
      {showForm && (
        <ProgramForm
          program={editingProgram}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default ProgramsPage;