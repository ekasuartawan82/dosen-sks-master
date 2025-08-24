import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Assignment } from '@/hooks/useAssignments';

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
      className={`cursor-grab transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95 rotate-2' : 'hover:shadow-md'
      }`}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm leading-tight mb-1">
              {assignment.courses.name}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {assignment.lecturers.name}
            </div>
            <Badge variant="secondary" className="text-xs">
              {assignment.courses.sks} SKS
            </Badge>
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
};

export default DragCourseCard;