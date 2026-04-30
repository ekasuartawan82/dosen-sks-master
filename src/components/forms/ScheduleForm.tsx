import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useAssignments } from "@/hooks/useAssignments";
import { useCreateSchedule, useCheckScheduleConflicts, TIME_SLOTS, DAYS } from "@/hooks/useSchedules";

const formSchema = z.object({
  assignment_id: z.string().min(1, "Pilih mata kuliah"),
});

interface ScheduleFormProps {
  classId: string;
  academicYear: string;
  dayOfWeek: number;
  timeSlot: number;
  open: boolean;
  onClose: () => void;
}

const ScheduleForm = ({
  classId,
  academicYear,
  dayOfWeek,
  timeSlot,
  open,
  onClose,
}: ScheduleFormProps) => {
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<any[]>([]);
  const [pendingSubmission, setPendingSubmission] = useState<any>(null);

  const { data: assignments } = useAssignments(classId, academicYear);
  const createScheduleMutation = useCreateSchedule();
  const checkConflictsMutation = useCheckScheduleConflicts();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assignment_id: "",
    },
  });

  // Get assignments for the selected class - these are already filtered by classId
  const classAssignments = assignments || [];

  const selectedDay = DAYS.find(d => d.id === dayOfWeek);
  const selectedTimeSlot = TIME_SLOTS.find(t => t.id === timeSlot);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Check for conflicts first
      const conflicts = await checkConflictsMutation.mutateAsync({
        assignmentId: values.assignment_id,
        dayOfWeek,
        timeSlot,
        academicYear
      });

      if (conflicts && conflicts.length > 0) {
        setConflictData(conflicts);
        setPendingSubmission({
          ...values,
          academic_year: academicYear,
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          has_conflict: true
        });
        setShowConflictDialog(true);
        return;
      }

      // No conflicts, proceed with normal submission
      await createScheduleMutation.mutateAsync({
        assignment_id: values.assignment_id,
        academic_year: academicYear,
        day_of_week: dayOfWeek,
        time_slot: timeSlot,
        has_conflict: false
      });

      form.reset();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleConfirmWithConflict = async () => {
    if (pendingSubmission) {
      try {
        await createScheduleMutation.mutateAsync(pendingSubmission);
        form.reset();
        setShowConflictDialog(false);
        setPendingSubmission(null);
        onClose();
      } catch (error) {
        console.error('Error saving schedule with conflict:', error);
      }
    }
  };

  const handleCancelConflict = () => {
    setShowConflictDialog(false);
    setPendingSubmission(null);
    setConflictData([]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedDay?.label} - {selectedTimeSlot?.label}
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="assignment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mata Kuliah</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih mata kuliah" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classAssignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{assignment.courses.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {assignment.lecturers.name} • {assignment.courses.sks} SKS
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={createScheduleMutation.isPending || checkConflictsMutation.isPending}
                >
                  {createScheduleMutation.isPending || checkConflictsMutation.isPending 
                    ? "Menyimpan..." 
                    : "Simpan Jadwal"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Konflik Jadwal Terdeteksi
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>Dosen berikut sudah memiliki jadwal mengajar pada waktu yang sama:</p>
                <div className="bg-muted p-3 rounded-md space-y-2">
                  {conflictData.map((conflict, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{conflict.conflicted_lecturer_name}</div>
                      <div className="text-muted-foreground">
                        {conflict.conflicted_course_name} di {conflict.conflicted_class_name}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm mt-3">
                  Apakah Anda yakin ingin melanjutkan menyimpan jadwal ini? 
                  Jadwal akan ditandai sebagai konflik.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConflict}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWithConflict}>
              Lanjutkan Simpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ScheduleForm;
