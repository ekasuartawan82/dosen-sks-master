import { useState, useEffect } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Settings } from "lucide-react";
import DroppableScheduleGrid from "./DroppableScheduleGrid";
import CourseBank from "./CourseBank";
import DragCourseCard from "./DragCourseCard";
import SchedulePrintView from "./SchedulePrintView";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import SettingsDialog from "./SettingsDialog";
import { useClasses } from "@/hooks/useClasses";
import { useSetting } from "@/hooks/useSettings";
import { useCreateSchedule, useCheckScheduleConflicts } from "@/hooks/useSchedules";
import { useAssignments, Assignment } from "@/hooks/useAssignments";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const SchedulePage = () => {
  const [selectedLevel, setSelectedLevel] = useState<number>();
  const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>();
  const [showPrintView, setShowPrintView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);

  const { data: classes, isLoading: isLoadingClasses } = useClasses(selectedLevel);
  const { data: currentAcademicYear } = useSetting('current_academic_year');
  const { data: assignments } = useAssignments(selectedClass);
  const createSchedule = useCreateSchedule();
  const checkConflicts = useCheckScheduleConflicts();
  const { toast } = useToast();

  // Set default academic year when currentAcademicYear loads
  useEffect(() => {
    if (currentAcademicYear?.value && !selectedAcademicYear) {
      setSelectedAcademicYear(currentAcademicYear.value);
    }
  }, [currentAcademicYear?.value, selectedAcademicYear]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const assignment = assignments?.find(a => a.id === event.active.id);
    setDraggedAssignment(assignment || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedAssignment(null);

    if (!over || !selectedClass || !selectedAcademicYear) return;

    const [dayOfWeek, timeSlot] = (over.id as string).split('-').map(Number);
    const assignmentId = active.id as string;

    handleScheduleCreate(assignmentId, dayOfWeek, timeSlot);
  };

  const handleScheduleCreate = async (assignmentId: string, dayOfWeek: number, timeSlot: number) => {
    if (!selectedAcademicYear) return;

    try {
      // Check for conflicts first
      const conflicts = await checkConflicts.mutateAsync({
        assignmentId,
        dayOfWeek,
        timeSlot
      });

      let shouldProceed = true;
      
      if (conflicts.length > 0) {
        const conflictMessage = conflicts.map(c => 
          `${c.conflicted_lecturer_name} sudah mengajar "${c.conflicted_course_name}" di ${c.conflicted_class_name}`
        ).join(', ');

        shouldProceed = window.confirm(
          `PERINGATAN: Terdeteksi konflik jadwal!\n\n${conflictMessage}\n\nApakah Anda ingin tetap melanjutkan?`
        );
      }

      if (shouldProceed) {
        createSchedule.mutate({
          assignment_id: assignmentId,
          academic_year: selectedAcademicYear,
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          has_conflict: conflicts.length > 0
        });
      }
    } catch (error) {
      toast({
        title: "Gagal memeriksa konflik",
        description: "Terjadi kesalahan saat memeriksa konflik jadwal",
        variant: "destructive",
      });
    }
  };

  if (!currentAcademicYear) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Ploting Jadwal Kuliah Interaktif</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag mata kuliah dari bank ke grid jadwal untuk menjadwalkan
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Pengaturan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <SettingsDialog onClose={() => setShowSettings(false)} />
                  </DialogContent>
                </Dialog>
                
                {selectedClass && (
                  <Dialog open={showPrintView} onOpenChange={setShowPrintView}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Cetak Jadwal
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                      <SchedulePrintView
                        classId={selectedClass}
                        academicYear={selectedAcademicYear || currentAcademicYear?.value}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tahun Ajaran</label>
                <Select 
                  value={selectedAcademicYear || currentAcademicYear?.value} 
                  onValueChange={setSelectedAcademicYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tahun ajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currentAcademicYear?.value || ''}>{currentAcademicYear?.value}</SelectItem>
                    <SelectItem value="2024/2025 Genap">2024/2025 Genap</SelectItem>
                    <SelectItem value="2025/2026 Genap">2025/2026 Genap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tingkat</label>
                <Select 
                  value={selectedLevel?.toString()} 
                  onValueChange={(value) => {
                    setSelectedLevel(parseInt(value));
                    setSelectedClass(undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tingkat 1</SelectItem>
                    <SelectItem value="2">Tingkat 2</SelectItem>
                    <SelectItem value="3">Tingkat 3</SelectItem>
                    <SelectItem value="4">Tingkat 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Kelas</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingClasses ? (
                      <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : (
                      classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedClass && selectedAcademicYear && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Panel - Course Bank */}
            <div className="lg:col-span-1">
              <CourseBank 
                classId={selectedClass}
                academicYear={selectedAcademicYear}
              />
            </div>
            
            {/* Right Panel - Schedule Grid */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Grid Jadwal</CardTitle>
                </CardHeader>
                <CardContent>
                  <DroppableScheduleGrid
                    classId={selectedClass}
                    academicYear={selectedAcademicYear}
                    onDrop={handleScheduleCreate}
                    draggedSKS={draggedAssignment?.courses.sks || null}
                    activeId={activeId}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      <DragOverlay>
        {activeId && draggedAssignment ? (
          <DragCourseCard assignment={draggedAssignment} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SchedulePage;