import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  study_program_name: z.string().min(1, "Nama program studi harus diisi"),
  academic_official_name: z.string().min(1, "Nama pejabat harus diisi"),
  current_academic_year: z.string().min(1, "Tahun ajaran harus diisi"),
});

interface SettingsDialogProps {
  onClose: () => void;
}

const SettingsDialog = ({ onClose }: SettingsDialogProps) => {
  const { data: settings, isLoading } = useSettings();
  const updateSettingMutation = useUpdateSetting();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      study_program_name: "",
      academic_official_name: "",
      current_academic_year: "",
    },
  });

  // Update form values when settings data is loaded
  React.useEffect(() => {
    if (settings) {
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      form.reset({
        study_program_name: settingsMap.study_program_name || "",
        academic_official_name: settingsMap.academic_official_name || "",
        current_academic_year: settingsMap.current_academic_year || "",
      });
    }
  }, [settings, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Update each setting
      await Promise.all([
        updateSettingMutation.mutateAsync({
          key: "study_program_name",
          value: values.study_program_name,
        }),
        updateSettingMutation.mutateAsync({
          key: "academic_official_name",
          value: values.academic_official_name,
        }),
        updateSettingMutation.mutateAsync({
          key: "current_academic_year",
          value: values.current_academic_year,
        }),
      ]);

      onClose();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DialogHeader>
          <DialogTitle>Pengaturan Aplikasi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Pengaturan Aplikasi</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="study_program_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Program Studi</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: Teknik Informatika" {...field} />
                </FormControl>
                <FormDescription>
                  Nama program studi yang akan ditampilkan di header jadwal
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="academic_official_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Pejabat Akademik</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: Dr. John Doe, M.Kom" {...field} />
                </FormControl>
                <FormDescription>
                  Nama pejabat yang akan ditampilkan di tanda tangan jadwal
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_academic_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tahun Ajaran Aktif</FormLabel>
                <FormControl>
                  <Input placeholder="Contoh: 2025/2026 Ganjil" {...field} />
                </FormControl>
                <FormDescription>
                  Tahun ajaran yang sedang berjalan saat ini
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={updateSettingMutation.isPending}
            >
              {updateSettingMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default SettingsDialog;