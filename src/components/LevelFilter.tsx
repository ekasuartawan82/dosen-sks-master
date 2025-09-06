import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LevelFilterProps {
  selectedLevel: string;
  onLevelChange: (level: string) => void;
  className?: string;
}

const LevelFilter = ({ selectedLevel, onLevelChange, className }: LevelFilterProps) => {
  // Static levels based on typical academic structure
  const levels = [
    { id: "1", name: "Level 1" },
    { id: "2", name: "Level 2" },
    { id: "3", name: "Level 3" },
    { id: "4", name: "Level 4" },
    { id: "5", name: "Level 5" },
    { id: "6", name: "Level 6" },
  ];

  return (
    <Select value={selectedLevel} onValueChange={onLevelChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Pilih Tingkat" />
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        <SelectItem value="all">Semua Tingkat</SelectItem>
        {levels.map((level) => (
          <SelectItem key={level.id} value={level.id}>
            {level.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LevelFilter;