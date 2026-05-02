import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Schedule, useSchedules, TIME_SLOTS, DAYS, useDeleteSchedule } from '@/hooks/useSchedules';
import { Skeleton } from '@/components/ui/skeleton';

interface DroppableScheduleGridProps {
  classId: string;
  academicYear: string;
  programId?: string;
  onDrop: (assignmentId: string, dayOfWeek: number, timeSlot: number) => void;
  draggedSKS: number | null;
  activeId: string | null;
}

interface DroppableSlotProps {
  dayId: number;
  timeSlotId: number;
  sks: number;
  onDrop: (assignmentId: string, dayOfWeek: number, timeSlot: number) => void;
  isActive: boolean;
  children: React.ReactNode;
}

const DroppableSlot = ({ dayId, timeSlotId, sks, onDrop, isActive, children }: DroppableSlotProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${dayId}-${timeSlotId}`,
    data: { dayId, timeSlotId, sks }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative transition-all duration-300",
        isOver && isActive && "bg-success/20 ring-2 ring-success/50 rounded-lg",
        isOver && !isActive && "bg-destructive/20 ring-2 ring-destructive/50 rounded-lg"
      )}
    >
      {children}
    </div>
  );
};

interface DraggableScheduledCardProps {
  schedule: Schedule & {
    slotIndex: number;
    totalSlots: number;
    segmentIndex: number;
    segmentCount: number;
    totalSks: number;
  };
  onDelete: (scheduleId: string) => void;
}

const DraggableScheduledCard = ({ schedule, onDelete }: DraggableScheduledCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `schedule:${schedule.id}`,
    data: {
      type: 'schedule',
      schedule,
    },
  });

  const style = {
    gridRowEnd: `span ${schedule.totalSlots}`,
    minHeight: `${schedule.totalSlots * 4}rem`,
    ...(transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 text-xs flex flex-col items-start justify-between relative rounded-lg transition-all duration-200 cursor-grab",
        "bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20",
        "hover:from-primary/15 hover:to-primary/10 hover:border-primary/30 hover:shadow-md",
        schedule.has_conflict && "border-destructive bg-gradient-to-br from-destructive/10 to-destructive/5",
        isDragging && "opacity-70 scale-[1.02] shadow-xl z-50"
      )}
      {...listeners}
      {...attributes}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(schedule.id);
        }}
        className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Hapus jadwal"
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="w-full space-y-2 pr-8">
        <div className="font-semibold text-sm leading-tight text-primary">
          {schedule.assignments.courses.name}
        </div>
        {schedule.segmentCount > 1 && schedule.segmentIndex > 0 && (
          <div className="text-[11px] font-medium text-primary/70">
            Lanjutan setelah istirahat
          </div>
        )}
        <div className="text-xs text-muted-foreground leading-tight font-medium">
          {schedule.assignments.lecturers.name}
        </div>
        <div className="flex items-center gap-2 mt-auto">
          <Badge variant="outline" className="text-xs px-2 py-1 bg-background/50">
            {schedule.segmentCount > 1 && schedule.segmentIndex === 0
              ? `(${schedule.totalSks} SKS)`
              : schedule.totalSlots === schedule.totalSks
              ? `${schedule.totalSks} SKS`
              : `${schedule.totalSlots}/${schedule.totalSks} SKS`}
          </Badge>
          {schedule.has_conflict && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">Konflik</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DroppableScheduleGrid = ({ 
  classId, 
  academicYear, 
  programId,
  onDrop, 
  draggedSKS, 
  activeId 
}: DroppableScheduleGridProps) => {
  const { data: schedules, isLoading } = useSchedules(academicYear, classId, programId);
  const deleteSchedule = useDeleteSchedule();
  const draggedScheduleId = activeId?.startsWith('schedule:') ? activeId.replace('schedule:', '') : null;

  const getTeachingSlotIds = (startSlot: number, sks: number) => {
    const slotIds: number[] = [];
    let currentSlot = startSlot;

    while (slotIds.length < sks) {
      const timeSlotData = TIME_SLOTS.find(slot => slot.id === currentSlot);
      if (!timeSlotData) return slotIds;
      if (!timeSlotData.isBreak) slotIds.push(currentSlot);
      currentSlot++;
    }

    return slotIds;
  };

  const getOccupyingScheduleForSlot = (dayOfWeek: number, timeSlot: number) => {
    return schedules?.find((schedule) =>
      schedule.day_of_week === dayOfWeek &&
      getTeachingSlotIds(schedule.time_slot, schedule.assignments.courses.sks).includes(timeSlot)
    );
  };

  const canDropAt = (dayOfWeek: number, timeSlot: number, sks: number) => {
    if (!draggedSKS) return false;
    
    // Check if any required slots are occupied by existing schedules
    // For multi-SKS courses, we need to account for break times being skipped
    let currentSlot = timeSlot;
    let remainingSKS = sks;
    
    while (remainingSKS > 0) {
      const timeSlotData = TIME_SLOTS.find(slot => slot.id === currentSlot);
      
      // Check if slot exists
      if (!timeSlotData) return false;
      
      // If it's a break slot, skip it (don't count towards SKS)
      if (timeSlotData.isBreak) {
        currentSlot++;
        continue;
      }
      
      // Check if non-break slot is already occupied by another schedule
      const scheduleForSlot = getOccupyingScheduleForSlot(dayOfWeek, currentSlot);
      if (scheduleForSlot && scheduleForSlot.id !== draggedScheduleId) return false;
      
      // Count this slot towards our SKS requirement
      remainingSKS--;
      currentSlot++;
    }
    
    return true;
  };

  const handleDelete = (scheduleId: string) => {
    deleteSchedule.mutate(scheduleId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 54 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  // Create a map to track visual schedule segments. A course that crosses a
  // fixed break is rendered as separate before/after-break cards.
  const scheduleMap = new Map();
  schedules?.forEach(schedule => {
    const sks = schedule.assignments.courses.sks;
    let currentSlot = schedule.time_slot;
    let sksCount = 0;
    const segments: Array<Array<{ slotId: number; originalSlotIndex: number }>> = [];
    let currentSegment: Array<{ slotId: number; originalSlotIndex: number }> = [];

    while (sksCount < sks) {
      const timeSlotData = TIME_SLOTS.find(slot => slot.id === currentSlot);

      if (!timeSlotData) break;

      if (timeSlotData.isBreak) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        currentSlot++;
        continue;
      }

      if (timeSlotData && !timeSlotData.isBreak) {
        currentSegment.push({ slotId: currentSlot, originalSlotIndex: sksCount });
        sksCount++;
      }
      currentSlot++;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    segments.forEach((segment, segmentIndex) => {
      segment.forEach((slot, slotIndex) => {
        scheduleMap.set(
          `${schedule.day_of_week}-${slot.slotId}`,
          {
            ...schedule,
            slotIndex,
            originalSlotIndex: slot.originalSlotIndex,
            totalSlots: segment.length,
            segmentIndex,
            segmentCount: segments.length,
            totalSks: sks
          }
        );
      });
    });
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-6 gap-2">
          {/* Header */}
          <div className="font-medium text-center p-2 bg-muted rounded">
            Waktu
          </div>
          {DAYS.map((day) => (
            <div key={day.id} className="font-medium text-center p-2 bg-muted rounded">
              {day.label}
            </div>
          ))}

          {/* Schedule Grid */}
          {TIME_SLOTS.map((timeSlot) => (
            <div key={timeSlot.id} className="contents">
              {/* Time Slot Header */}
              <div className={cn(
                "p-2 text-xs flex items-center justify-center text-center rounded",
                timeSlot.isBreak 
                  ? "bg-muted text-muted-foreground font-medium" 
                  : "bg-muted/50 border"
              )}>
                <div>
                  <div className="font-medium">{timeSlot.label}</div>
                  {timeSlot.isBreak && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Istirahat
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule Slots for each day */}
              {DAYS.map((day) => {
                const scheduleData = scheduleMap.get(`${day.id}-${timeSlot.id}`);
                const isBreak = timeSlot.isBreak;
                const isDroppable = canDropAt(day.id, timeSlot.id, draggedSKS || 1);

                if (isBreak) {
                  return (
                    <div 
                      key={`${day.id}-${timeSlot.id}`}
                      className="h-16 p-2 bg-muted/30 rounded flex items-center justify-center border-2 border-muted-foreground/20"
                    >
                      <div className="text-center">
                        <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                        <span className="text-xs font-bold text-muted-foreground">ISTIRAHAT</span>
                      </div>
                    </div>
                  );
                }

                // If there's a schedule and it's the first slot of that schedule
                if (scheduleData && scheduleData.slotIndex === 0) {
                  return (
                    <DraggableScheduledCard
                      key={`${day.id}-${timeSlot.id}`}
                      schedule={scheduleData}
                      onDelete={handleDelete}
                    />
                  );
                }

                // If there's a schedule but it's not the first slot, render empty (handled by rowspan)
                if (scheduleData && scheduleData.slotIndex > 0) {
                  return null;
                }

                // Empty droppable slot
                return (
                  <DroppableSlot
                    key={`${day.id}-${timeSlot.id}`}
                    dayId={day.id}
                    timeSlotId={timeSlot.id}
                    sks={draggedSKS || 1}
                    onDrop={onDrop}
                    isActive={isDroppable}
                  >
                    <div className={cn(
                      "h-16 p-2 text-xs flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all duration-300",
                      "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30",
                      activeId && isDroppable && "border-success bg-success/10 shadow-lg scale-105",
                      activeId && !isDroppable && "border-destructive bg-destructive/10"
                    )}>
                      {activeId ? (
                        <div className="text-center">
                          <span className={cn(
                            "font-medium",
                            isDroppable ? "text-success" : "text-destructive"
                          )}>
                            {isDroppable ? "Drop di sini" : "Tidak valid"}
                          </span>
                          {isDroppable && draggedSKS && draggedSKS > 1 && (
                            <div className="text-xs text-success/70 mt-1">
                              {draggedSKS} slot diperlukan
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 text-center">
                          Belajar Mandiri
                        </span>
                      )}
                    </div>
                  </DroppableSlot>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DroppableScheduleGrid;
