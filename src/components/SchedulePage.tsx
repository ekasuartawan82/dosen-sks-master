import { useState, useEffect } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Settings, Zap, AlertTriangle } from "lucide-react";
import DroppableScheduleGrid from "./DroppableScheduleGrid";
import CourseBank from "./CourseBank";
import DragCourseCard from "./DragCourseCard";
import SchedulePrintView from "./SchedulePrintView";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SettingsDialog from "./SettingsDialog";
import ProgramFilter from "./ProgramFilter";
import LevelFilter from "./LevelFilter";
import { useClasses } from "@/hooks/useClasses";
import { useSetting } from "@/hooks/useSettings";
import { useCreateSchedule, useCheckScheduleConflicts, useGenerateAutoSchedule, useCheckAllConflicts } from "@/hooks/useSchedules";
import { useAssignments, Assignment } from "@/hooks/useAssignments";
import { usePrograms } from "@/hooks/usePrograms";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const SchedulePage = () => {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>();
  const [showPrintView, setShowPrintView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);

  const programId = selectedProgram === "all" ? undefined : selectedProgram;
  const levelNum = selectedLevel === "all" ? undefined : parseInt(selectedLevel);

  const { data: programs } = usePrograms();
  const { data: classes, isLoading: isLoadingClasses } = useClasses(levelNum, programId);
  const { data: currentAcademicYear } = useSetting('current_academic_year');
  const { data: assignments } = useAssignments(selectedClass);
  const createSchedule = useCreateSchedule();
  const checkConflicts = useCheckScheduleConflicts();
  const generateAutoSchedule = useGenerateAutoSchedule();
  const checkAllConflicts = useCheckAllConflicts();
  const { toast } = useToast();

  // Set default academic year when currentAcademicYear loads
  useEffect(() => {
    if (currentAcademicYear?.value && !selectedAcademicYear) {
      setSelectedAcademicYear(currentAcademicYear.value);
    }
  }, [currentAcademicYear?.value, selectedAcademicYear]);

  // Check conflicts when filters change
  useEffect(() => {
    if (selectedAcademicYear) {
      checkAllConflicts.mutate({
        academicYear: selectedAcademicYear,
        programId: programId,
        level: levelNum
      }, {
        onSuccess: (data) => setConflicts(data)
      });
    }
  }, [selectedAcademicYear, programId, levelNum]);

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
          `PERINGATAN: Terdeteksi konflik jadwal!\n\n${conflictMessage}\n\nApakah Anda ingin tetap melanjutkan? Jadwal akan ditandai sebagai berpotensi konflik.`
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

  const handleGenerateAutoSchedule = () => {
    if (!selectedClass || !selectedAcademicYear || !assignments) return;

    const shouldProceed = window.confirm(
      `Generate jadwal otomatis untuk semua mata kuliah di kelas ini?\n\nJadwal akan ditempatkan secara otomatis dan dapat diedit setelahnya.`
    );

    if (shouldProceed) {
      generateAutoSchedule.mutate({
        classId: selectedClass,
        academicYear: selectedAcademicYear,
        assignmentIds: assignments.map(a => a.id)
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="text-sm font-medium mb-2 block">Program Studi</label>
                <ProgramFilter 
                  selectedProgram={selectedProgram}
                  onProgramChange={(value) => {
                    setSelectedProgram(value);
                    setSelectedClass(undefined);
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tingkat</label>
                <LevelFilter 
                  selectedLevel={selectedLevel}
                  onLevelChange={(value) => {
                    setSelectedLevel(value);
                    setSelectedClass(undefined);
                  }}
                />
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

            {/* Auto Generate Button */}
            {selectedClass && assignments && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleGenerateAutoSchedule}
                  className="flex items-center gap-2"
                  disabled={generateAutoSchedule.isPending}
                >
                  <Zap className="h-4 w-4" />
                  {generateAutoSchedule.isPending ? "Generating..." : "Generate Jadwal Otomatis"}
                </Button>
              </div>
            )}

            {/* Conflict Warning */}
            {conflicts.length > 0 && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Peringatan Konflik Jadwal:</strong> Ditemukan {conflicts.length} potensi konflik dosen. 
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="mt-1 text-sm">
                      • {conflict.lecturer_name}: {conflict.conflicts.length} konflik
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
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