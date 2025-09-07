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
import ProgramFilter from "../ProgramFilter";

interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProgram?: string;
  selectedLevel?: string;
  selectedClass?: string;
}

const AssignmentForm = ({ open, onOpenChange, selectedProgram = "all", selectedLevel = "all", selectedClass = "all" }: AssignmentFormProps) => {
  const [formProgram, setFormProgram] = useState(selectedProgram);
  const [formLevel, setFormLevel] = useState(selectedLevel);
  const [formClass, setFormClass] = useState(selectedClass);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
  const [lecturerType, setLecturerType] = useState("program_studi"); // "program_studi" or "tenaga_pengajar"
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: courses } = useCourses(formProgram, formLevel);
  const { data: programLecturers } = useLecturers(formProgram);
  const { data: teachingStaff } = useLecturers(undefined, true); // Get all lecturers including teaching staff
  const { data: allClasses } = useClasses();

  // Courses are already filtered by the hook
  const availableCourses = courses || [];

  // Filter classes by selected level
  const availableClasses = allClasses?.filter(cls => 
    !formLevel || formLevel === "all" || cls.level.toString() === formLevel
  ) || [];

  useEffect(() => {
    if (open) {
      setFormProgram(selectedProgram);
      setFormLevel(selectedLevel);
      setFormClass(selectedClass);
      setSelectedCourse("");
      setSelectedLecturers([]);
      setLecturerType("program_studi");
    }
  }, [open, selectedProgram, selectedLevel, selectedClass]);

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
      setLecturerType("program_studi");
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

  // Get available lecturers based on selected type
  const getAvailableLecturers = () => {
    let lecturerList = [];
    
    if (lecturerType === "program_studi") {
      // Show lecturers from all programs (allow cross-program assignments)
      lecturerList = teachingStaff?.filter(lecturer => lecturer.programId) || [];
    } else {
      // Show teaching staff (lecturers without program_id)
      lecturerList = teachingStaff?.filter(lecturer => !lecturer.programId) || [];
    }
    
    // Filter out already assigned lecturers
    return lecturerList.filter(lecturer => 
      !alreadyAssignedLecturerIds.includes(lecturer.id)
    );
  };

  const availableLecturers = getAvailableLecturers();

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
          {/* Program Selection */}
          <div className="space-y-2">
            <Label>Program Studi</Label>
            <ProgramFilter
              selectedProgram={formProgram}
              onProgramChange={setFormProgram}
            />
          </div>

          {/* Level Selection */}
          <div className="space-y-2">
            <Label>Tingkat</Label>
            <Select value={formLevel} onValueChange={setFormLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tingkat</SelectItem>
                <SelectItem value="1">Tingkat 1</SelectItem>
                <SelectItem value="2">Tingkat 2</SelectItem>
                <SelectItem value="3">Tingkat 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Class Selection */}
          {formLevel && formLevel !== "all" && (
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
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
          {formProgram && formProgram !== "all" && formLevel && formLevel !== "all" && formClass && formClass !== "all" && (
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

          {/* Lecturer Type Selection */}
          {selectedCourse && formClass && (
            <div className="space-y-2">
              <Label>Tipe Dosen</Label>
              <Select value={lecturerType} onValueChange={(value) => {
                setLecturerType(value);
                setSelectedLecturers([]); // Reset selection when switching types
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tipe Dosen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program_studi">Dosen Program Studi</SelectItem>
                  <SelectItem value="tenaga_pengajar">Tenaga Pengajar PT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Lecturer Selection */}
          {selectedCourse && formClass && lecturerType && (
            <div className="space-y-4">
              <Label>
                {lecturerType === "program_studi" ? "Dosen Program Studi yang Tersedia" : "Tenaga Pengajar PT yang Tersedia"}
              </Label>
              
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