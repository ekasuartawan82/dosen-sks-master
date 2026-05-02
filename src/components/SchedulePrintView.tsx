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

  // Create a map to track visual schedule segments. Courses that cross a fixed
  // break are split around the break so printed schedules do not imply that
  // break time moved.
  const scheduleMap = new Map();
  schedules?.forEach(schedule => {
    const sks = schedule.assignments.courses.sks;
    let currentSlot = schedule.time_slot;
    let sksCount = 0;
    const segments: Array<Array<{ slotId: number; originalSlotIndex: number }>> = [];
    let currentSegment: Array<{ slotId: number; originalSlotIndex: number }> = [];

    while (sksCount < sks) {
      const timeSlotData = TIME_SLOTS.find(slot => slot.id === currentSlot);
      if (!timeSlotData) break;

      if (timeSlotData.isBreak) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        currentSlot++;
        continue;
      }

      currentSegment.push({ slotId: currentSlot, originalSlotIndex: sksCount });
      sksCount++;
      currentSlot++;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    segments.forEach((segment, segmentIndex) => {
      segment.forEach((slot, slotIndex) => {
        scheduleMap.set(
          `${schedule.day_of_week}-${slot.slotId}`,
          {
            ...schedule,
            slotIndex,
            originalSlotIndex: slot.originalSlotIndex,
            totalSlots: segment.length,
            segmentIndex,
            segmentCount: segments.length,
            totalSks: sks
          }
        );
      });
    });
  });

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
    <div className="schedule-print-shell space-y-6">
      {/* Print Button - Hidden in print mode */}
      <div className="print:hidden space-y-2">
        <div className="flex justify-end">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak Jadwal
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Saat print, pilih A4 Landscape dan matikan opsi browser "Header and Footer" agar URL, tanggal, dan nomor halaman tidak ikut tercetak.
        </p>
      </div>

      {/* Print Content */}
      <div className="print-page schedule-print-document print:p-8 bg-white">
        {/* Header */}
        <div className="print-header schedule-print-header mb-6">
          <div className="schedule-print-logo-wrap">
            <img
              src="/logo_poltrada.png"
              alt="Logo Poltrada Bali"
              className="schedule-print-logo"
            />
          </div>
          <div className="schedule-print-title text-center space-y-1">
            <h1 className="text-xl font-bold">POLITEKNIK TRANSPORTASI DARAT BALI</h1>
            <h2 className="text-lg font-semibold">JADWAL KULIAH</h2>
            <p className="text-sm font-medium">{studyProgramName.value}</p>
          </div>
          <div className="schedule-print-header-spacer" aria-hidden="true" />
        </div>

        <div className="schedule-print-meta mb-4 flex justify-between items-start">
            <div className="text-sm">
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

        {/* Schedule Table */}
        <div className="schedule-print-grid schedule-print-table-wrap overflow-x-auto">
          <table className="schedule-print-grid schedule-print-table w-full border-collapse border border-gray-400">
            <thead>
              <tr>
                <th className="schedule-print-time-col border border-gray-400 p-2 bg-gray-100 text-center font-semibold">
                  Waktu
                </th>
                {DAYS.map((day) => (
                  <th key={day.id} className="schedule-print-day-col border border-gray-400 p-2 bg-gray-100 text-center font-semibold">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((timeSlot) => (
                <tr key={timeSlot.id} className="schedule-print-row">
                  <td className={cn(
                    "schedule-print-time-cell border border-gray-400 p-2 text-center text-sm font-medium",
                    timeSlot.isBreak ? "bg-gray-50" : ""
                  )}>
                    <div>{timeSlot.label}</div>
                    {timeSlot.isBreak && (
                      <div className="text-xs text-gray-500 mt-1">Istirahat</div>
                    )}
                  </td>
                  {DAYS.map((day) => {
                    const scheduleData = scheduleMap.get(`${day.id}-${timeSlot.id}`);
                    const isBreak = timeSlot.isBreak;

                    if (isBreak) {
                      return (
                        <td 
                          key={`${day.id}-${timeSlot.id}`}
                          className="schedule-print-break-cell border border-gray-400 p-2 text-xs bg-gray-100"
                        >
                          <div className="text-center font-bold text-gray-600">ISTIRAHAT</div>
                        </td>
                      );
                    }

                    // If there's a schedule and it's the first slot of that schedule
                    if (scheduleData && scheduleData.slotIndex === 0) {
                      const schedule = scheduleData;
                      return (
                        <td 
                          key={`${day.id}-${timeSlot.id}`}
                          className={cn(
                            "schedule-print-course-cell border border-gray-400 p-2 text-xs",
                            schedule.has_conflict && "bg-red-50"
                          )}
                          rowSpan={schedule.totalSlots}
                        >
                          <div className="schedule-print-cell-content space-y-1">
                            <div className="schedule-print-course-name font-semibold text-xs">
                              {schedule.assignments.courses.name}
                            </div>
                            {schedule.segmentCount > 1 && schedule.segmentIndex > 0 && (
                              <div className="schedule-print-continuation text-gray-500 text-[10px]">
                                lanjutan setelah istirahat
                              </div>
                            )}
                            <div className="schedule-print-lecturer text-gray-600">
                              {schedule.assignments.lecturers.name}
                            </div>
                            <div className="schedule-print-sks text-gray-500">
                              {schedule.segmentCount > 1 && schedule.segmentIndex === 0
                                ? `(${schedule.totalSks} SKS)`
                                : schedule.totalSlots === schedule.totalSks
                                ? `${schedule.totalSks} SKS`
                                : `${schedule.totalSlots}/${schedule.totalSks} SKS`}
                            </div>
                            {schedule.has_conflict && (
                              <div className="text-red-600 text-xs font-medium">
                                ⚠️ Konflik
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    }

                    // If there's a schedule but it's not the first slot, don't render (handled by rowspan)
                    if (scheduleData && scheduleData.slotIndex > 0) {
                      return null;
                    }

                    // Empty slot
                    return (
                      <td 
                        key={`${day.id}-${timeSlot.id}`}
                        className="schedule-print-empty-cell border border-gray-400 p-2 text-xs"
                      >
                        <div className="text-center text-gray-400">-</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with Signature */}
        <div className="schedule-print-signature mt-12 flex justify-end">
          <div className="text-center">
            <p className="mb-16">Kepala Bagian Akademik dan Ketarunaan</p>
            <div className="border-b border-gray-800 w-48 mx-auto mb-2"></div>
            <p className="font-semibold">{officialName.value}</p>
          </div>
        </div>

        {/* Conflict Legend */}
        {schedules?.some(s => s.has_conflict) && (
          <div className="schedule-print-legend mt-8 p-4 bg-red-50 border border-red-200 rounded">
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
            margin: 10mm;
          }

          html,
          #root,
          body {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body > *:not(:has(.print-page)) {
            display: none !important;
          }

          body > *:has(.print-page) {
            display: block !important;
            position: static !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
            overflow: visible !important;
            transform: none !important;
          }

          body * {
            visibility: hidden;
          }

          .print-page,
          .print-page * {
            visibility: visible;
          }

          [role="dialog"],
          [data-radix-popper-content-wrapper],
          .schedule-print-dialog,
          .schedule-print-dialog *,
          .schedule-print-shell,
          .schedule-print-shell *,
          .print-page,
          .print-page *,
          .schedule-print-grid,
          .schedule-print-table-wrap {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
            overflow: visible !important;
          }

          [role="dialog"],
          [data-radix-popper-content-wrapper],
          .schedule-print-dialog,
          .schedule-print-shell,
          .schedule-print-document,
          .schedule-print-dialog > * {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            transform: none !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            color: #111827 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 9px;
            line-height: 1.2;
            overflow: visible !important;
          }

          .schedule-print-shell {
            padding-top: 0 !important;
          }

          .schedule-print-dialog > button,
          .print\\:hidden {
            display: none !important;
          }

          .print-page {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
            padding-bottom: 0 !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
          }

          .schedule-print-header {
            display: grid;
            grid-template-columns: 22mm 1fr 22mm;
            align-items: center;
            gap: 8mm;
            margin-top: 0 !important;
            margin-bottom: 5mm !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .schedule-print-logo {
            width: 18mm;
            height: 18mm;
            object-fit: contain;
          }

          .schedule-print-title h1 {
            font-size: 13px !important;
            line-height: 1.2;
            margin: 0;
          }

          .schedule-print-title h2 {
            font-size: 12px !important;
            line-height: 1.2;
            margin: 0;
          }

          .schedule-print-title p,
          .schedule-print-meta,
          .schedule-print-meta p {
            font-size: 9px !important;
            line-height: 1.25;
            margin: 0;
          }

          .schedule-print-table-wrap {
            width: 100% !important;
            overflow: visible !important;
          }

          .schedule-print-grid {
            display: table !important;
            visibility: visible !important;
          }

          .schedule-print-table-wrap.schedule-print-grid {
            display: block !important;
          }

          .schedule-print-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .schedule-print-table th,
          .schedule-print-table td {
            padding: 2.5px 3px !important;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: anywhere;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .schedule-print-time-col {
            width: 14% !important;
          }

          .schedule-print-day-col {
            width: 17.2% !important;
          }

          .schedule-print-row,
          .schedule-print-course-cell,
          .schedule-print-break-cell,
          .schedule-print-cell-content {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .schedule-print-course-name,
          .schedule-print-lecturer,
          .schedule-print-sks,
          .schedule-print-continuation {
            font-size: 9px !important;
            line-height: 1.15;
          }

          .schedule-print-continuation {
            font-style: italic;
          }

          .schedule-print-signature {
            margin-top: 8mm !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .schedule-print-signature .mb-16 {
            margin-bottom: 14mm !important;
          }

          .schedule-print-signature p,
          .schedule-print-legend,
          .schedule-print-legend p {
            font-size: 9px !important;
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
