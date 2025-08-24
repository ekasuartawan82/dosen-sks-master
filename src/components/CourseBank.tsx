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
  const { data: assignments, isLoading: isLoadingAssignments } = useAssignments(classId);
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Bank Mata Kuliah</CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag mata kuliah ke grid jadwal untuk menjadwalkan
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {availableAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Semua mata kuliah sudah dijadwalkan</p>
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