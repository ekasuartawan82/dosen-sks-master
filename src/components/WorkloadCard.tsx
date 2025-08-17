import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "./StatusBadge";
import { User, BookOpen, Award } from "lucide-react";

interface WorkloadCardProps {
  lecturer: {
    id: string;
    name: string;
    status: string;
    structuralPosition: string;
    teachingSKS: number;
    structuralSKS: number;
    totalWorkload: number;
  };
}

const WorkloadCard = ({ lecturer }: WorkloadCardProps) => {
  const targetSKS = 12;
  const progressPercentage = Math.min((lecturer.totalWorkload / targetSKS) * 100, 100);
  
  const getWorkloadStatus = (total: number) => {
    if (total < targetSKS) return "insufficient";
    if (total === targetSKS) return "sufficient";
    return "excess";
  };

  const status = getWorkloadStatus(lecturer.totalWorkload);

  return (
    <Card className="bg-gradient-to-br from-card to-card/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{lecturer.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{lecturer.status}</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Workload Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Beban</span>
            <span className="font-medium">{lecturer.totalWorkload.toFixed(1)} / {targetSKS} SKS</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
        </div>

        {/* SKS Breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">SKS Mengajar</p>
              <p className="font-semibold">{lecturer.teachingSKS.toFixed(1)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Award className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">SKS Jabatan</p>
              <p className="font-semibold">{lecturer.structuralSKS}</p>
            </div>
          </div>
        </div>

        {lecturer.structuralPosition !== "Tidak Ada" && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">Jabatan: <span className="font-medium text-foreground">{lecturer.structuralPosition}</span></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkloadCard;