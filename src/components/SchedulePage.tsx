import { useCallback, useState, useEffect } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Settings, Zap, AlertTriangle, RotateCcw } from "lucide-react";
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
import { useAcademicYears, useActiveAcademicYear } from "@/hooks/useAcademicYear";
import { ConflictCheck, DAYS, GeneratedScheduleConflict, Schedule, TIME_SLOTS, useCreateSchedule, useCheckScheduleConflicts, useGenerateAutoSchedule, useCheckAllConflicts, useUpdateSchedule, useRestoreLatestScheduleSnapshot, usePreviewGenerateAutoSchedule } from "@/hooks/useSchedules";
import { useAssignments, Assignment } from "@/hooks/useAssignments";
import { usePrograms } from "@/hooks/usePrograms";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface ConflictNotice {
  lecturer_name: string;
  conflicts: Array<{
    program_id?: string | null;
    class_name: string;
    course_name: string;
    day: number;
    time_slot: number;
    conflict_type: 'lecturer' | 'class';
  }>;
}

type DragData =
  | { type: 'assignment'; assignment: Assignment }
  | { type: 'schedule'; schedule: Schedule };

type GenerateScope = 'class' | 'program';

const SchedulePage = () => {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>();
  const [showPrintView, setShowPrintView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<Assignment | null>(null);
  const [draggedSchedule, setDraggedSchedule] = useState<Schedule | null>(null);
  const [conflicts, setConflicts] = useState<ConflictNotice[]>([]);
  const [generateConflicts, setGenerateConflicts] = useState<GeneratedScheduleConflict[]>([]);
  const [generateScope, setGenerateScope] = useState<GenerateScope>("class");

  const programId = selectedProgram === "all" ? undefined : selectedProgram;
  const levelNum = selectedLevel === "all" ? undefined : parseInt(selectedLevel);

  const { data: programs } = usePrograms();
  const { data: classes, isLoading: isLoadingClasses } = useClasses(levelNum, programId);
  const { data: academicYears = [] } = useAcademicYears();
  const { data: activeAcademicYear } = useActiveAcademicYear();
  const { data: assignments } = useAssignments(selectedClass, selectedAcademicYear, programId);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const checkConflicts = useCheckScheduleConflicts();
  const generateAutoSchedule = useGenerateAutoSchedule();
  const previewGenerateAutoSchedule = usePreviewGenerateAutoSchedule();
  const restoreLatestSnapshot = useRestoreLatestScheduleSnapshot();
  const { mutate: checkAllConflictsMutate } = useCheckAllConflicts();
  const { toast } = useToast();

  // Set default academic year when activeAcademicYear loads
  useEffect(() => {
    if (activeAcademicYear?.name && !selectedAcademicYear) {
      setSelectedAcademicYear(activeAcademicYear.name);
    }
  }, [activeAcademicYear?.name, selectedAcademicYear]);

  const refreshConflictNotices = useCallback(() => {
    if (selectedAcademicYear) {
      checkAllConflictsMutate({
        academicYear: selectedAcademicYear
      }, {
        onSuccess: (data) => setConflicts(data)
      });
    }
  }, [checkAllConflictsMutate, selectedAcademicYear]);

  // Check conflicts when filters change
  useEffect(() => {
    refreshConflictNotices();
  }, [refreshConflictNotices]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const dragData = event.active.data.current as DragData | undefined;

    if (dragData?.type === 'schedule') {
      setDraggedSchedule(dragData.schedule);
      setDraggedAssignment(null);
      return;
    }

    const assignment = dragData?.assignment || assignments?.find(a => `assignment:${a.id}` === event.active.id);
    setDraggedAssignment(assignment || null);
    setDraggedSchedule(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const dragData = active.data.current as DragData | undefined;
    setActiveId(null);
    setDraggedAssignment(null);
    setDraggedSchedule(null);

    if (!over || !selectedClass || !selectedAcademicYear) return;

    const [dayOfWeek, timeSlot] = (over.id as string).split('-').map(Number);

    if (dragData?.type === 'schedule') {
      handleScheduleMove(dragData.schedule, dayOfWeek, timeSlot);
      return;
    }

    const assignmentId = dragData?.assignment?.id || (active.id as string).replace('assignment:', '');
    handleScheduleCreate(assignmentId, dayOfWeek, timeSlot);
  };

  const getProgramCode = (programId?: string | null) => {
    return programs?.find(program => program.id === programId)?.code || "Tanpa Prodi";
  };

  const buildConflictMessage = (items: ConflictCheck[]) => {
    return items.map(c => {
      const day = DAYS.find(d => d.id === c.day_of_week)?.label || 'hari yang sama';
      const slot = TIME_SLOTS.find(s => s.id === c.time_slot)?.label || 'slot yang sama';
      const subject = c.conflict_type === 'class'
        ? `kelas ${c.conflicted_class_name}`
        : c.conflicted_lecturer_name;

      return `${subject} | ${getProgramCode(c.conflicted_program_id)} | ${c.conflicted_class_name} | ${day} ${slot} | ${c.conflicted_course_name}`;
    }).join('\n');
  };

  const handleScheduleCreate = async (assignmentId: string, dayOfWeek: number, timeSlot: number) => {
    if (!selectedAcademicYear) return;

    try {
      // Check for conflicts first
      const conflicts = await checkConflicts.mutateAsync({
        assignmentId,
        dayOfWeek,
        timeSlot,
        academicYear: selectedAcademicYear
      });

      let shouldProceed = true;
      
      if (conflicts.length > 0) {
        const conflictMessage = buildConflictMessage(conflicts);

        shouldProceed = window.confirm(
          `PERINGATAN: Terdeteksi jadwal bertabrakan!\n\n${conflictMessage}\n\nApakah Anda ingin tetap melanjutkan? Jadwal akan ditandai sebagai konflik.`
        );
      }

      if (shouldProceed) {
        createSchedule.mutate({
          assignment_id: assignmentId,
          academic_year: selectedAcademicYear,
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          has_conflict: conflicts.length > 0
        }, {
          onSuccess: refreshConflictNotices
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

  const handleScheduleMove = async (schedule: Schedule, dayOfWeek: number, timeSlot: number) => {
    if (!selectedAcademicYear) return;

    try {
      const conflicts = await checkConflicts.mutateAsync({
        assignmentId: schedule.assignment_id,
        dayOfWeek,
        timeSlot,
        academicYear: selectedAcademicYear,
        excludeScheduleId: schedule.id
      });

      let shouldProceed = true;

      if (conflicts.length > 0) {
        shouldProceed = window.confirm(
          `PERINGATAN: Slot tujuan bertabrakan!\n\n${buildConflictMessage(conflicts)}\n\nTetap pindahkan jadwal dan tandai sebagai konflik?`
        );
      }

      if (shouldProceed) {
        updateSchedule.mutate({
          id: schedule.id,
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          has_conflict: conflicts.length > 0
        }, {
          onSuccess: refreshConflictNotices
        });
      }
    } catch {
      toast({
        title: "Gagal memindahkan jadwal",
        description: "Terjadi kesalahan saat memeriksa slot tujuan",
        variant: "destructive",
      });
    }
  };

  const getGenerateTargetId = () => {
    if (generateScope === "class") return selectedClass;
    return programId;
  };

  const getGenerateScopeLabel = () => {
    if (generateScope === "class") {
      const className = classes?.find(cls => cls.id === selectedClass)?.name;
      return className ? `kelas ${className}` : "kelas terpilih";
    }

    if (generateScope === "program") {
      const programName = programs?.find(program => program.id === programId)?.code;
      return programName ? `prodi ${programName}` : "prodi terpilih";
    }

    return "prodi terpilih";
  };

  const canRunScopedScheduleAction = !!selectedAcademicYear
    && (generateScope !== "class" || !!selectedClass)
    && (generateScope !== "program" || !!programId);

  const getDayLabel = (dayId: number) => DAYS.find(day => day.id === dayId)?.label || `Hari ${dayId}`;

  const getTimeLabel = (timeSlot: number) => TIME_SLOTS.find(slot => slot.id === timeSlot)?.label || `Slot ${timeSlot}`;

  const buildGeneratedConflictMessage = (items: GeneratedScheduleConflict[]) => {
    return items.map((item, index) => (
      `${index + 1}. ${item.lecturer_name} | ${getProgramCode(item.program_id)} | ${item.class_name} | ${getDayLabel(item.day_of_week)} ${getTimeLabel(item.time_slot)} | ${item.course_name}`
    )).join('\n');
  };

  const handleGenerateAutoSchedule = async () => {
    if (!selectedAcademicYear || !canRunScopedScheduleAction) return;

    try {
      const params = {
        scope: generateScope,
        targetId: getGenerateTargetId(),
        academicYear: selectedAcademicYear,
      };
      const preview = await previewGenerateAutoSchedule.mutateAsync(params);
      setGenerateConflicts(preview.conflicts);

      const conflictSummary = preview.conflict_count > 0
        ? `${preview.conflict_count} konflik ditemukan:\n\n${buildGeneratedConflictMessage(preview.conflicts)}\n\n`
        : "Tidak ada konflik terdeteksi.\n\n";

      const shouldProceed = window.confirm(
        `Preview generate untuk ${getGenerateScopeLabel()} selesai.\n\n${conflictSummary}Generate akan menyimpan snapshot terlebih dahulu, lalu menyimpan ${preview.generated_count} jadwal hasil generate. Lanjutkan simpan hasil generate?`
      );

      if (!shouldProceed) return;

      generateAutoSchedule.mutate(params, {
        onSuccess: refreshConflictNotices
      });
    } catch (error) {
      toast({
        title: "Gagal preview generate jadwal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memeriksa konflik generate",
        variant: "destructive",
      });
    }
  };

  const handleRestoreLatestSnapshot = () => {
    if (!selectedAcademicYear || !canRunScopedScheduleAction) return;

    const shouldProceed = window.confirm(
      `Restore snapshot jadwal terakhir untuk ${getGenerateScopeLabel()}?\n\nRestore hanya akan menghapus dan mengganti jadwal dalam scope terpilih. Jadwal prodi/kelas lain tidak akan disentuh.`
    );

    if (shouldProceed) {
      restoreLatestSnapshot.mutate({
        scope: generateScope,
        targetId: getGenerateTargetId(),
        academicYear: selectedAcademicYear,
      }, {
        onSuccess: refreshConflictNotices
      });
    }
  };

  if (!activeAcademicYear) {
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
                    <DialogContent className="schedule-print-dialog max-w-4xl max-h-[90vh] overflow-auto">
                      <SchedulePrintView
                        classId={selectedClass}
                        academicYear={selectedAcademicYear || activeAcademicYear?.name}
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
                  value={selectedAcademicYear || activeAcademicYear?.name} 
                  onValueChange={setSelectedAcademicYear}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tahun ajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.id} value={year.name}>
                        {year.name} {year.is_active ? "(Aktif)" : ""}
                      </SelectItem>
                    ))}
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

            {/* Scoped Auto Generate / Restore */}
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:items-end">
                <div>
                  <label className="text-sm font-medium mb-2 block">Scope Generate</label>
                  <Select value={generateScope} onValueChange={(value) => setGenerateScope(value as GenerateScope)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">Generate per kelas</SelectItem>
                      <SelectItem value="program">Generate per prodi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={handleGenerateAutoSchedule}
                    className="flex items-center gap-2"
                    disabled={!canRunScopedScheduleAction || previewGenerateAutoSchedule.isPending || generateAutoSchedule.isPending || restoreLatestSnapshot.isPending}
                  >
                    <Zap className="h-4 w-4" />
                    {previewGenerateAutoSchedule.isPending ? "Preview..." : generateAutoSchedule.isPending ? "Generating..." : "Generate Jadwal Otomatis"}
                  </Button>
                  <Button
                    onClick={handleRestoreLatestSnapshot}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={!canRunScopedScheduleAction || generateAutoSchedule.isPending || restoreLatestSnapshot.isPending}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {restoreLatestSnapshot.isPending ? "Restoring..." : "Restore Snapshot Terakhir"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Generate selalu melakukan preview konflik global, meminta konfirmasi, lalu membuat snapshot database sebelum menyimpan hasil. Scope kelas/prodi hanya mengganti jadwal di target tersebut.
              </p>
            </div>

            {generateConflicts.length > 0 && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{generateConflicts.length} konflik ditemukan pada preview generate.</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    {generateConflicts.map((conflict, idx) => (
                      <div key={`${conflict.lecturer_name}-${conflict.day_of_week}-${conflict.time_slot}-${idx}`}>
                        {idx + 1}. {conflict.lecturer_name} | {getProgramCode(conflict.program_id)} | {conflict.class_name} | {getDayLabel(conflict.day_of_week)} {getTimeLabel(conflict.time_slot)} | {conflict.course_name}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Conflict Warning */}
            {conflicts.length > 0 && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Peringatan Konflik Jadwal:</strong> {conflicts.reduce((sum, conflict) => sum + conflict.conflicts.length, 0)} konflik ditemukan.
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="mt-1 text-sm">
                      • {conflict.lecturer_name}: {conflict.conflicts.length} jadwal bertabrakan
                      <div className="mt-1 pl-4">
                        {conflict.conflicts.map((item, itemIdx) => (
                          <div key={`${item.class_name}-${item.day}-${item.time_slot}-${itemIdx}`}>
                            {getProgramCode(item.program_id)} | {item.class_name} | {getDayLabel(item.day)} {getTimeLabel(item.time_slot)} | {item.course_name}
                          </div>
                        ))}
                      </div>
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
                programId={programId}
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
                    programId={programId}
                    onDrop={handleScheduleCreate}
                    draggedSKS={draggedAssignment?.courses.sks || draggedSchedule?.assignments.courses.sks || null}
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
          <DragCourseCard assignment={draggedAssignment} disabled />
        ) : activeId && draggedSchedule ? (
          <div className="rounded-lg border-2 border-primary bg-background p-3 shadow-xl">
            <div className="font-semibold text-sm text-primary">
              {draggedSchedule.assignments.courses.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {draggedSchedule.assignments.lecturers.name}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default SchedulePage;
