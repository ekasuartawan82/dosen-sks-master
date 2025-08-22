import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSchedules, TIME_SLOTS, DAYS } from "@/hooks/useSchedules";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduleGridProps {
  classId: string;
  academicYear: string;
  onSlotClick: (dayOfWeek: number, timeSlot: number) => void;
}

const ScheduleGrid = ({ classId, academicYear, onSlotClick }: ScheduleGridProps) => {
  const { data: schedules, isLoading } = useSchedules(academicYear, classId);

  const getScheduleForSlot = (dayOfWeek: number, timeSlot: number) => {
    return schedules?.find(
      (schedule) => 
        schedule.day_of_week === dayOfWeek && 
        schedule.time_slot === timeSlot
    );
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
                const schedule = getScheduleForSlot(day.id, timeSlot.id);
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

                return (
                  <Button
                    key={`${day.id}-${timeSlot.id}`}
                    variant={isEmpty ? "outline" : "secondary"}
                    className={cn(
                      "h-16 p-2 text-xs flex flex-col items-start justify-start relative",
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