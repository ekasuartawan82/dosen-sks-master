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
        "relative transition-all duration-300",
        isOver && isActive && "bg-success/20 ring-2 ring-success/50 rounded-lg",
        isOver && !isActive && "bg-destructive/20 ring-2 ring-destructive/50 rounded-lg"
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
    
    // Check if any required slots are occupied by existing schedules
    for (let i = 0; i < sks; i++) {
      const slotToCheck = timeSlot + i;
      const timeSlotData = TIME_SLOTS.find(slot => slot.id === slotToCheck);
      
      // Check if slot exists
      if (!timeSlotData) return false;
      
      // Check if slot is already occupied by another schedule
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
                const isDroppable = canDropAt(day.id, timeSlot.id, draggedSKS || 1);

                if (isBreak && !scheduleData) {
                  // Break slot that can be droppable for multi-SKS courses
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
                        "bg-muted/20 border-muted-foreground/20",
                        activeId && isDroppable && "border-success bg-success/10 shadow-lg scale-105",
                        activeId && !isDroppable && "border-destructive bg-destructive/10"
                      )}>
                        <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                        {activeId ? (
                          <span className={cn(
                            "font-medium text-center",
                            isDroppable ? "text-success" : "text-destructive"
                          )}>
                            {isDroppable ? "Drop di sini" : "Tidak valid"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-center">
                            Istirahat
                          </span>
                        )}
                      </div>
                    </DroppableSlot>
                  );
                }

                // If there's a schedule and it's the first slot of that schedule
                if (scheduleData && scheduleData.slotIndex === 0) {
                  const schedule = scheduleData;
                  return (
                    <div
                      key={`${day.id}-${timeSlot.id}`}
                      className={cn(
                        "group p-3 text-xs flex flex-col items-start justify-between relative rounded-lg transition-all duration-200",
                        "bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20",
                        "hover:from-primary/15 hover:to-primary/10 hover:border-primary/30 hover:shadow-md",
                        schedule.has_conflict && "border-destructive bg-gradient-to-br from-destructive/10 to-destructive/5"
                      )}
                      style={{
                        gridRowEnd: `span ${schedule.totalSlots}`,
                        minHeight: `${schedule.totalSlots * 4}rem`
                      }}
                    >
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(schedule.id)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
                        title="Hapus jadwal"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      
                      <div className="w-full space-y-2 pr-8">
                        <div className="font-semibold text-sm leading-tight text-primary">
                          {schedule.assignments.courses.name}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight font-medium">
                          {schedule.assignments.lecturers.name}
                        </div>
                        <div className="flex items-center gap-2 mt-auto">
                          <Badge variant="outline" className="text-xs px-2 py-1 bg-background/50">
                            {schedule.assignments.courses.sks} SKS
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
                          Kosong
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