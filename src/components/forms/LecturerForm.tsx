import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePrograms } from "@/hooks/usePrograms";
import type { Database } from "@/integrations/supabase/types";

type LecturerStatus = Database["public"]["Enums"]["lecturer_status"];
type StructuralPosition = Database["public"]["Enums"]["structural_position"];

interface LecturerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecturer?: {
    id: string;
    name: string;
    status: LecturerStatus;
    structural_position: StructuralPosition;
    program_id?: string;
  };
}

const LecturerForm = ({ open, onOpenChange, lecturer }: LecturerFormProps) => {
  const [name, setName] = useState(lecturer?.name || "");
  const [status, setStatus] = useState<LecturerStatus | "">(lecturer?.status || "");
  const [structuralPosition, setStructuralPosition] = useState<StructuralPosition>(lecturer?.structural_position || "Tidak Ada");
  const [programId, setProgramId] = useState(lecturer?.program_id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: programs = [] } = usePrograms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !status || !programId) return;

    setIsSubmitting(true);
    try {
      if (lecturer) {
        // Update existing lecturer
        const { error } = await supabase
          .from('lecturers')
          .update({
            name: name.trim(),
            status: status as LecturerStatus,
            structural_position: structuralPosition,
            program_id: programId,
            updated_at: new Date().toISOString()
          })
          .eq('id', lecturer.id);

        if (error) throw error;
        toast({ title: "Dosen berhasil diperbarui" });
      } else {
        // Create new lecturer
        const { error } = await supabase
          .from('lecturers')
          .insert({
            name: name.trim(),
            status: status as LecturerStatus,
            structural_position: structuralPosition,
            program_id: programId
          });

        if (error) throw error;
        toast({ title: "Dosen berhasil ditambahkan" });
      }

      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      onOpenChange(false);
      
      // Reset form
      setName("");
      setStatus("");
      setStructuralPosition("Tidak Ada");
      setProgramId("");
    } catch (error) {
      console.error('Error saving lecturer:', error);
      toast({
        title: "Gagal menyimpan dosen",
        description: "Terjadi kesalahan saat menyimpan data dosen",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lecturer ? "Edit Dosen" : "Tambah Dosen Baru"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Dosen</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama dosen"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as LecturerStatus)} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fungsional">Fungsional</SelectItem>
                <SelectItem value="Non-Fungsional">Non-Fungsional</SelectItem>
                <SelectItem value="Praktisi">Praktisi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="structural_position">Jabatan Struktural</Label>
            <Select value={structuralPosition} onValueChange={(value) => setStructuralPosition(value as StructuralPosition)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jabatan struktural" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tidak Ada">Tidak Ada</SelectItem>
                <SelectItem value="Direktur">Direktur</SelectItem>
                <SelectItem value="Wadir">Wadir</SelectItem>
                <SelectItem value="Kapus">Kapus</SelectItem>
                <SelectItem value="Kanit">Kanit</SelectItem>
                <SelectItem value="Kaprodi">Kaprodi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Program Studi</Label>
            <Select value={programId} onValueChange={setProgramId} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Program Studi" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name} ({program.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !status || !programId}>
              {isSubmitting ? "Menyimpan..." : lecturer ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LecturerForm;