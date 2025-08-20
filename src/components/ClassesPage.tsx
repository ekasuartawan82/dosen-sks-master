import { useState } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses, useDeleteClass } from "@/hooks/useClasses";
import { ClassForm } from "@/components/forms/ClassForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const ClassesPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const { data: classes, isLoading } = useClasses();
  const deleteClass = useDeleteClass();

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteClass.mutateAsync(id);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClass(null);
  };

  const groupedClasses = classes?.reduce((acc, classItem) => {
    if (!acc[classItem.level]) {
      acc[classItem.level] = [];
    }
    acc[classItem.level].push(classItem);
    return acc;
  }, {} as Record<number, typeof classes>) || {};

  if (isLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Kelas</h1>
          <p className="text-muted-foreground">
            Kelola kelas untuk setiap tingkat pembelajaran
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </div>

      {[1, 2, 3].map(level => (
        <div key={level} className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Tingkat {level}</h2>
            <Badge variant="secondary">
              {groupedClasses[level]?.length || 0} kelas
            </Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groupedClasses[level]?.map((classItem) => (
              <Card key={classItem.id} className="group hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(classItem)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Kelas</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus kelas "{classItem.name}"? 
                              Semua penugasan dosen yang terkait dengan kelas ini akan ikut terhapus.
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(classItem.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardDescription>
                    Tingkat {classItem.level}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    Siap untuk penugasan dosen
                  </div>
                </CardContent>
              </Card>
            )) || (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Belum ada kelas untuk tingkat {level}
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowForm(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Kelas Pertama
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ))}

      <ClassForm
        open={showForm}
        onOpenChange={handleCloseForm}
        editingClass={editingClass}
      />
    </div>
  );
};

export default ClassesPage;