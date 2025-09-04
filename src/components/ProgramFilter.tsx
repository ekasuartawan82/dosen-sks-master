import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrograms } from "@/hooks/usePrograms";
import { Loader2 } from "lucide-react";

interface ProgramFilterProps {
  selectedProgram: string;
  onProgramChange: (programId: string) => void;
  className?: string;
}

const ProgramFilter = ({ selectedProgram, onProgramChange, className }: ProgramFilterProps) => {
  const { data: programs = [], isLoading } = usePrograms();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Memuat program...</span>
      </div>
    );
  }

  return (
    <Select value={selectedProgram} onValueChange={onProgramChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Pilih Program Studi" />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        <SelectItem value="all">Semua Program Studi</SelectItem>
        {programs.map((program) => (
          <SelectItem key={program.id} value={program.id}>
            {program.name} ({program.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ProgramFilter;