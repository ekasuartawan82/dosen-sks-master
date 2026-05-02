import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchedules, TIME_SLOTS, DAYS } from "@/hooks/useSchedules";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleGridProps {
  classId: string;
  academicYear: string;
  programId?: string;
  onSlotClick: (dayOfWeek: number, timeSlot: number) => void;
}

const ScheduleGrid = ({ classId, academicYear, programId, onSlotClick }: ScheduleGridProps) => {
  const { data: schedules, isLoading } = useSchedules(academicYear, classId, programId);

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

      currentSegment.push({ slotId: currentSlot, originalSlotIndex: sksCount });
      sksCount++;
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
                const schedule = scheduleMap.get(`${day.id}-${timeSlot.id}`);
                const isEmpty = !schedule;
                const isBreak = timeSlot.isBreak;

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

                if (schedule && schedule.slotIndex > 0) {
                  return null;
                }

                return (
                  <Button
                    key={`${day.id}-${timeSlot.id}`}
                    variant={isEmpty ? "outline" : "secondary"}
                    style={schedule ? {
                      gridRowEnd: `span ${schedule.totalSlots}`,
                      minHeight: `${schedule.totalSlots * 4}rem`
                    } : undefined}
                    className={cn(
                      "h-16 p-2 text-xs flex flex-col items-start justify-start relative",
                      schedule && "h-auto",
                      isEmpty && "border-dashed hover:border-solid",
                      schedule?.has_conflict && "border-destructive bg-destructive/10"
                    )}
                    onClick={() => onSlotClick(day.id, timeSlot.id)}
                  >
                    {isEmpty ? (
                      <span className="text-muted-foreground">Klik untuk menambah</span>
                    ) : (
                      <div className="w-full space-y-1">
                        <div className="font-medium text-xs leading-tight">
                          {schedule.assignments.courses.name}
                        </div>
                        {schedule.segmentCount > 1 && schedule.segmentIndex > 0 && (
                          <div className="text-[11px] font-medium text-muted-foreground">
                            Lanjutan setelah istirahat
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground leading-tight">
                          {schedule.assignments.lecturers.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {schedule.segmentCount > 1 && schedule.segmentIndex === 0
                              ? `(${schedule.totalSks} SKS)`
                              : schedule.totalSlots === schedule.totalSks
                              ? `${schedule.totalSks} SKS`
                              : `${schedule.totalSlots}/${schedule.totalSks} SKS`}
                          </Badge>
                          {schedule.has_conflict && (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          )}
                        </div>
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
