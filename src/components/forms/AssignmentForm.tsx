import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCourses } from "@/hooks/useCourses";
import { useLecturers } from "@/hooks/useLecturers";

interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AssignmentForm = ({ open, onOpenChange }: AssignmentFormProps) => {
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: courses } = useCourses();
  const { data: lecturers } = useLecturers();

  const handleLecturerToggle = (lecturerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLecturers(prev => [...prev, lecturerId]);
    } else {
      setSelectedLecturers(prev => prev.filter(id => id !== lecturerId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || selectedLecturers.length === 0) return;

    setIsSubmitting(true);
    try {
      // Create assignments for each selected lecturer
      const assignments = selectedLecturers.map(lecturerId => ({
        course_id: selectedCourse,
        lecturer_id: lecturerId
      }));

      const { error } = await supabase
        .from('assignments')
        .insert(assignments);

      if (error) throw error;

      toast({ title: "Penugasan berhasil ditambahkan" });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      onOpenChange(false);
      
      // Reset form
      setSelectedCourse("");
      setSelectedLecturers([]);
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Gagal menyimpan penugasan",
        description: "Terjadi kesalahan saat menyimpan data penugasan",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourseData = courses?.find(c => c.id === selectedCourse);
  const availableLecturers = lecturers?.filter(lecturer => 
    !selectedCourseData?.assignedLecturers?.some(assigned => assigned.id === lecturer.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Penugasan Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course">Mata Kuliah</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih mata kuliah" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} ({course.sks} SKS, Level {course.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourse && (
            <div className="space-y-2">
              <Label>Pilih Dosen</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                {availableLecturers.length > 0 ? (
                  availableLecturers.map((lecturer) => (
                    <div key={lecturer.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={lecturer.id}
                        checked={selectedLecturers.includes(lecturer.id)}
                        onCheckedChange={(checked) => 
                          handleLecturerToggle(lecturer.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={lecturer.id} className="text-sm cursor-pointer flex-1">
                        <div>
                          <div className="font-medium">{lecturer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {lecturer.status} • Total: {lecturer.totalWorkload.toFixed(1)} SKS
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {selectedCourseData?.assignedLecturers?.length ? 
                      "Semua dosen sudah ditugaskan untuk mata kuliah ini" :
                      "Tidak ada dosen yang tersedia"
                    }
                  </p>
                )}
              </div>
              {selectedLecturers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedLecturers.length} dosen dipilih
                  {selectedLecturers.length > 1 && selectedCourseData && (
                    <span> • SKS per dosen: {(selectedCourseData.sks / selectedLecturers.length).toFixed(1)}</span>
                  )}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedCourse || selectedLecturers.length === 0}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentForm;