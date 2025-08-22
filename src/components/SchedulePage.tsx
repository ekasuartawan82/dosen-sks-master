import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Settings } from "lucide-react";
import ScheduleGrid from "./ScheduleGrid";
import ScheduleForm from "./forms/ScheduleForm";
import SchedulePrintView from "./SchedulePrintView";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import SettingsDialog from "./SettingsDialog";
import { useClasses } from "@/hooks/useClasses";
import { useSetting } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";

const SchedulePage = () => {
  const [selectedLevel, setSelectedLevel] = useState<number>();
  const [selectedClass, setSelectedClass] = useState<string>();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>();
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    dayOfWeek: number;
    timeSlot: number;
  } | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { data: classes, isLoading: isLoadingClasses } = useClasses(selectedLevel);
  const { data: currentAcademicYear } = useSetting('current_academic_year');

  const handleSlotClick = (dayOfWeek: number, timeSlot: number) => {
    setSelectedSlot({ dayOfWeek, timeSlot });
    setShowScheduleForm(true);
  };

  const handleCloseForm = () => {
    setShowScheduleForm(false);
    setSelectedSlot(null);
  };

  if (!currentAcademicYear) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Ploting Jadwal Kuliah</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Susun jadwal mata kuliah untuk setiap kelas berdasarkan ploting dosen
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Pengaturan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <SettingsDialog onClose={() => setShowSettings(false)} />
                </DialogContent>
              </Dialog>
              
              {selectedClass && (
                <Dialog open={showPrintView} onOpenChange={setShowPrintView}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Printer className="h-4 w-4 mr-2" />
                      Cetak Jadwal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <SchedulePrintView
                      classId={selectedClass}
                      academicYear={selectedAcademicYear || currentAcademicYear.value}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tahun Ajaran</label>
              <Select 
                value={selectedAcademicYear || currentAcademicYear.value} 
                onValueChange={setSelectedAcademicYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun ajaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentAcademicYear.value}>{currentAcademicYear.value}</SelectItem>
                  <SelectItem value="2024/2025 Genap">2024/2025 Genap</SelectItem>
                  <SelectItem value="2025/2026 Genap">2025/2026 Genap</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tingkat</label>
              <Select 
                value={selectedLevel?.toString()} 
                onValueChange={(value) => {
                  setSelectedLevel(parseInt(value));
                  setSelectedClass(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tingkat 1</SelectItem>
                  <SelectItem value="2">Tingkat 2</SelectItem>
                  <SelectItem value="3">Tingkat 3</SelectItem>
                  <SelectItem value="4">Tingkat 4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Kelas</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClasses ? (
                    <SelectItem value="loading" disabled>Memuat...</SelectItem>
                  ) : (
                    classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedAcademicYear && (
        <Card>
          <CardContent className="p-6">
            <ScheduleGrid
              classId={selectedClass}
              academicYear={selectedAcademicYear}
              onSlotClick={handleSlotClick}
            />
          </CardContent>
        </Card>
      )}

      {showScheduleForm && selectedSlot && selectedClass && selectedAcademicYear && (
        <ScheduleForm
          classId={selectedClass}
          academicYear={selectedAcademicYear}
          dayOfWeek={selectedSlot.dayOfWeek}
          timeSlot={selectedSlot.timeSlot}
          open={showScheduleForm}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default SchedulePage;