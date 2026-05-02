import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses } from "@/hooks/useClasses";
import { Loader2 } from "lucide-react";

interface ClassFilterProps {
  selectedClass: string;
  onClassChange: (classId: string) => void;
  selectedLevel?: string;
  selectedProgram?: string;
  className?: string;
}

const ClassFilter = ({ selectedClass, onClassChange, selectedLevel, selectedProgram, className }: ClassFilterProps) => {
  const levelNumber = selectedLevel && selectedLevel !== "all" ? parseInt(selectedLevel) : undefined;
  const programId = selectedProgram && selectedProgram !== "all" ? selectedProgram : undefined;
  const { data: classes = [], isLoading } = useClasses(levelNumber, programId);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Memuat kelas...</span>
      </div>
    );
  }

  return (
    <Select value={selectedClass} onValueChange={onClassChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Pilih Kelas" />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        <SelectItem value="all">Semua Kelas</SelectItem>
        {classes.map((classItem) => (
          <SelectItem key={classItem.id} value={classItem.id}>
            {classItem.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ClassFilter;
