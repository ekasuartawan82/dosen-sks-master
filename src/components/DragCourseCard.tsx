import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Assignment } from '@/hooks/useAssignments';
import { cn } from '@/lib/utils';

interface DragCourseCardProps {
  assignment: Assignment;
}

const DragCourseCard = ({ assignment }: DragCourseCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: assignment.id,
    data: assignment,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab transition-all duration-300 group border-2",
        isDragging 
          ? 'opacity-80 scale-110 rotate-3 shadow-xl border-primary z-50' 
          : 'hover:shadow-lg hover:scale-105 hover:border-primary/50 border-border'
      )}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight mb-2 text-primary group-hover:text-primary/80">
              {assignment.courses.name}
            </div>
            <div className="text-xs text-muted-foreground mb-3 font-medium">
              {assignment.lecturers.name}
            </div>
            <Badge variant="outline" className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20">
              {assignment.courses.sks} SKS
            </Badge>
          </div>
          <GripVertical className="h-5 w-5 text-muted-foreground/60 group-hover:text-primary flex-shrink-0 mt-1 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
};

export default DragCourseCard;