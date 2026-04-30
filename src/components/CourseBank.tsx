import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAssignments } from '@/hooks/useAssignments';
import { useSchedules } from '@/hooks/useSchedules';
import DragCourseCard from './DragCourseCard';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseBankProps {
  classId?: string;
  academicYear?: string;
}

const CourseBank = ({ classId, academicYear }: CourseBankProps) => {
  const { data: assignments, isLoading: isLoadingAssignments } = useAssignments(classId, academicYear);
  const { data: schedules, isLoading: isLoadingSchedules } = useSchedules(academicYear, classId);

  // Filter out assignments that are already scheduled
  const availableAssignments = assignments?.filter(assignment => 
    !schedules?.some(schedule => schedule.assignment_id === assignment.id)
  ) || [];

  if (isLoadingAssignments || isLoadingSchedules) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Bank Mata Kuliah</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-gradient-to-br from-card to-card/50 border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          🏦 Bank Mata Kuliah
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag mata kuliah ke grid jadwal untuk menjadwalkan
        </p>
        {availableAssignments.length > 0 && (
          <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full inline-block w-fit">
            {availableAssignments.length} mata kuliah tersedia
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {availableAssignments.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-sm font-medium text-muted-foreground">
                Semua mata kuliah sudah dijadwalkan
              </p>
              <p className="text-xs text-muted-foreground/70">
                Jadwal kelas ini sudah lengkap
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableAssignments.map((assignment) => (
                <DragCourseCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CourseBank;
