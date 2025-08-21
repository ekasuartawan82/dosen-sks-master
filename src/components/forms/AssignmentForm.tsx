import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCourses } from "@/hooks/useCourses";
import { useLecturers } from "@/hooks/useLecturers";
import { useClasses } from "@/hooks/useClasses";
import StatusBadge from "@/components/StatusBadge";

interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLevel?: string;
  selectedClass?: string;
}

const AssignmentForm = ({ open, onOpenChange, selectedLevel = "", selectedClass = "" }: AssignmentFormProps) => {
  const [formLevel, setFormLevel] = useState(selectedLevel);
  const [formClass, setFormClass] = useState(selectedClass);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: courses } = useCourses();
  const { data: lecturers } = useLecturers();
  const { data: allClasses } = useClasses();

  // Filter courses by selected level
  const availableCourses = courses?.filter(course => 
    !formLevel || course.level.toString() === formLevel
  ) || [];

  // Filter classes by selected level
  const availableClasses = allClasses?.filter(cls => 
    !formLevel || cls.level.toString() === formLevel
  ) || [];

  useEffect(() => {
    if (open) {
      setFormLevel(selectedLevel);
      setFormClass(selectedClass);
      setSelectedCourse("");
      setSelectedLecturers([]);
    }
  }, [open, selectedLevel, selectedClass]);

  const handleLecturerToggle = (lecturerId: string) => {
    setSelectedLecturers(prev => 
      prev.includes(lecturerId) 
        ? prev.filter(id => id !== lecturerId)
        : [...prev, lecturerId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedCourse || selectedLecturers.length === 0) {
      toast({
        title: "Error",
        description: "Pilih mata kuliah dan minimal satu dosen",
        variant: "destructive",
      });
      return;
    }

    if (!formClass) {
      toast({
        title: "Error", 
        description: "Pilih kelas untuk penugasan",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const assignments = selectedLecturers.map(lecturerId => ({
        course_id: selectedCourse,
        lecturer_id: lecturerId,
        class_id: formClass
      }));

      const { error } = await supabase
        .from('assignments')
        .insert(assignments);

      if (error) throw error;

      const selectedCourseName = availableCourses.find(c => c.id === selectedCourse)?.name;
      const selectedClassName = availableClasses.find(c => c.id === formClass)?.name;

      toast({
        title: "Penugasan berhasil dibuat",
        description: `${selectedLecturers.length} dosen telah ditugaskan untuk ${selectedCourseName} di ${selectedClassName}.`,
      });

      // Reset form and close dialog
      setSelectedCourse("");
      setSelectedLecturers([]);
      onOpenChange(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat penugasan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Find already assigned lecturers for the selected course and specific class
  const selectedCourseData = courses?.find(c => c.id === selectedCourse);
  const alreadyAssignedLecturerIds = selectedCourseData?.assignedLecturers
    ?.filter(lecturer => lecturer.classId === formClass)
    ?.map(lecturer => lecturer.id) || [];

  // Filter available lecturers (exclude only those assigned to same course AND same class)
  const availableLecturers = lecturers?.filter(lecturer => 
    !alreadyAssignedLecturerIds.includes(lecturer.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Penugasan Dosen</DialogTitle>
          <DialogDescription>
            Pilih mata kuliah, kelas, dan dosen yang akan ditugaskan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Level Selection */}
          <div className="space-y-2">
            <Label>Tingkat</Label>
            <Select value={formLevel} onValueChange={setFormLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Tingkat 1</SelectItem>
                <SelectItem value="2">Tingkat 2</SelectItem>
                <SelectItem value="3">Tingkat 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class Selection */}
          {formLevel && (
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Course Selection */}
          {formLevel && formClass && (
            <div className="space-y-2">
              <Label>Mata Kuliah</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mata kuliah" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.sks} SKS)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lecturer Selection */}
          {selectedCourse && formClass && (
            <div className="space-y-4">
              <Label>Dosen yang Tersedia</Label>
              
              {availableLecturers.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {availableLecturers.map((lecturer) => (
                    <Card key={lecturer.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={lecturer.id}
                            checked={selectedLecturers.includes(lecturer.id)}
                            onCheckedChange={() => handleLecturerToggle(lecturer.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{lecturer.name}</h4>
                              <StatusBadge status={lecturer.status} />
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span>SKS: {lecturer.totalWorkload}/12</span>
                              {lecturer.structuralPosition !== "Tidak Ada" && (
                                <span className="ml-4">Jabatan: {lecturer.structuralPosition}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      {alreadyAssignedLecturerIds.length > 0 
                        ? "Semua dosen sudah ditugaskan untuk mata kuliah ini di kelas yang dipilih"
                        : "Tidak ada dosen yang tersedia"
                      }
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedLecturers.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">
                    {selectedLecturers.length} dosen dipilih
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedCourse || !formClass || selectedLecturers.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Penugasan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentForm;