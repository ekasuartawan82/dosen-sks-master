import { useSchedules, TIME_SLOTS, DAYS } from "@/hooks/useSchedules";
import { useSetting } from "@/hooks/useSettings";
import { useClasses } from "@/hooks/useClasses";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulePrintViewProps {
  classId: string;
  academicYear: string;
}

const SchedulePrintView = ({ classId, academicYear }: SchedulePrintViewProps) => {
  const { data: schedules, isLoading: isLoadingSchedules } = useSchedules(academicYear, classId);
  const { data: studyProgramName } = useSetting('study_program_name');
  const { data: officialName } = useSetting('academic_official_name');
  const { data: classes } = useClasses();

  const selectedClass = classes?.find(cls => cls.id === classId);

  const getScheduleForSlot = (dayOfWeek: number, timeSlot: number) => {
    return schedules?.find(
      (schedule) => 
        schedule.day_of_week === dayOfWeek && 
        schedule.time_slot === timeSlot
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingSchedules || !studyProgramName || !officialName || !selectedClass) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Button - Hidden in print mode */}
      <div className="print:hidden flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Cetak Jadwal
        </Button>
      </div>

      {/* Print Content */}
      <div className="print:p-8 bg-white">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-xl font-bold">{studyProgramName.value}</h1>
          <h2 className="text-lg font-semibold">JADWAL KULIAH</h2>
          <div className="flex justify-between items-center mt-4">
            <div>
              <p><strong>Tahun Ajaran:</strong> {academicYear}</p>
              <p><strong>Kelas:</strong> {selectedClass.name}</p>
            </div>
            <div className="text-right text-sm">
              <p>Tanggal: {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr>
                <th className="border border-gray-400 p-2 bg-gray-100 text-center font-semibold">
                  Waktu
                </th>
                {DAYS.map((day) => (
                  <th key={day.id} className="border border-gray-400 p-2 bg-gray-100 text-center font-semibold">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot) => (
                <tr key={timeSlot.id}>
                  <td className={cn(
                    "border border-gray-400 p-2 text-center text-sm font-medium",
                    timeSlot.isBreak ? "bg-gray-50" : ""
                  )}>
                    <div>{timeSlot.label}</div>
                    {timeSlot.isBreak && (
                      <div className="text-xs text-gray-500 mt-1">Istirahat</div>
                    )}
                  </td>
                  {DAYS.map((day) => {
                    const schedule = getScheduleForSlot(day.id, timeSlot.id);
                    const isBreak = timeSlot.isBreak;

                    return (
                      <td 
                        key={`${day.id}-${timeSlot.id}`}
                        className={cn(
                          "border border-gray-400 p-2 text-xs",
                          isBreak && "bg-gray-50",
                          schedule?.has_conflict && "bg-red-50"
                        )}
                      >
                        {isBreak ? (
                          <div className="text-center text-gray-400">-</div>
                        ) : schedule ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-xs">
                              {schedule.assignments.courses.name}
                            </div>
                            <div className="text-gray-600">
                              {schedule.assignments.lecturers.name}
                            </div>
                            <div className="text-gray-500">
                              {schedule.assignments.courses.sks} SKS
                            </div>
                            {schedule.has_conflict && (
                              <div className="text-red-600 text-xs font-medium">
                                ⚠️ Konflik
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">-</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with Signature */}
        <div className="mt-12 flex justify-end">
          <div className="text-center">
            <p className="mb-16">Kepala Bagian Akademik dan Ketarunaan</p>
            <div className="border-b border-gray-800 w-48 mx-auto mb-2"></div>
            <p className="font-semibold">{officialName.value}</p>
          </div>
        </div>

        {/* Conflict Legend */}
        {schedules?.some(s => s.has_conflict) && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800 mb-2">Keterangan:</h3>
            <p className="text-sm text-red-700">
              ⚠️ Jadwal yang ditandai "Konflik" menunjukkan bahwa dosen tersebut memiliki jadwal mengajar 
              di kelas lain pada waktu yang sama. Harap koordinasi ulang untuk menghindari bentrok jadwal.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          
          body {
            font-size: 12px;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:p-8 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SchedulePrintView;