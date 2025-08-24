import { useDroppable } from '@dnd-kit/core';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSchedules, TIME_SLOTS, DAYS, useDeleteSchedule } from '@/hooks/useSchedules';
import { Skeleton } from '@/components/ui/skeleton';

interface DroppableScheduleGridProps {
  classId: string;
  academicYear: string;
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
        "relative transition-colors duration-200",
        isOver && isActive && "bg-green-100 dark:bg-green-900/20 border-green-300",
        isOver && !isActive && "bg-red-100 dark:bg-red-900/20 border-red-300"
      )}
    >
      {children}
    </div>
  );
};

const DroppableScheduleGrid = ({ 
  classId, 
  academicYear, 
  onDrop, 
  draggedSKS, 
  activeId 
}: DroppableScheduleGridProps) => {
  const { data: schedules, isLoading } = useSchedules(academicYear, classId);
  const deleteSchedule = useDeleteSchedule();

  const getScheduleForSlot = (dayOfWeek: number, timeSlot: number) => {
    return schedules?.find(
      (schedule) => 
        schedule.day_of_week === dayOfWeek && 
        schedule.time_slot === timeSlot
    );
  };

  const canDropAt = (dayOfWeek: number, timeSlot: number, sks: number) => {
    if (!draggedSKS) return false;
    
    // Check if any required slots are occupied or are break slots
    for (let i = 0; i < sks; i++) {
      const slotToCheck = timeSlot + i;
      const timeSlotData = TIME_SLOTS.find(slot => slot.id === slotToCheck);
      
      // Check if slot exists and is not a break
      if (!timeSlotData || timeSlotData.isBreak) return false;
      
      // Check if slot is already occupied
      if (getScheduleForSlot(dayOfWeek, slotToCheck)) return false;
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

  // Create a map to track which schedules span multiple slots
  const scheduleMap = new Map();
  schedules?.forEach(schedule => {
    const sks = schedule.assignments.courses.sks;
    for (let i = 0; i < sks; i++) {
      scheduleMap.set(
        `${schedule.day_of_week}-${schedule.time_slot + i}`,
        { ...schedule, slotIndex: i, totalSlots: sks }
      );
    }
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
                const isDroppable = !isBreak && canDropAt(day.id, timeSlot.id, draggedSKS || 1);

                if (isBreak) {
                  return (
                    <div 
                      key={`${day.id}-${timeSlot.id}`}
                      className="p-2 bg-muted/20 rounded flex items-center justify-center"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  );
                }

                // If there's a schedule and it's the first slot of that schedule
                if (scheduleData && scheduleData.slotIndex === 0) {
                  const schedule = scheduleData;
                  return (
                    <div
                      key={`${day.id}-${timeSlot.id}`}
                      className={cn(
                        "p-2 text-xs flex flex-col items-start justify-start relative bg-secondary border border-border rounded",
                        `row-span-${schedule.totalSlots}`,
                        schedule.has_conflict && "border-destructive bg-destructive/10"
                      )}
                      style={{
                        gridRowEnd: `span ${schedule.totalSlots}`
                      }}
                    >
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus jadwal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      
                      <div className="w-full space-y-1">
                        <div className="font-medium text-xs leading-tight pr-6">
                          {schedule.assignments.courses.name}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight">
                          {schedule.assignments.lecturers.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {schedule.assignments.courses.sks} SKS
                          </Badge>
                          {schedule.has_conflict && (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </div>
                    </div>
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
                      "h-16 p-2 text-xs flex flex-col items-center justify-center border-2 border-dashed rounded transition-colors duration-200",
                      "border-muted-foreground/20 hover:border-muted-foreground/40",
                      activeId && isDroppable && "border-green-300 bg-green-50 dark:bg-green-900/10",
                      activeId && !isDroppable && "border-red-300 bg-red-50 dark:bg-red-900/10"
                    )}>
                      <span className="text-muted-foreground text-center">
                        {activeId && !isDroppable ? "Tidak valid" : "Drop di sini"}
                      </span>
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