import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type LecturerStatus = Database["public"]["Enums"]["lecturer_status"];
type StructuralPosition = Database["public"]["Enums"]["structural_position"];

interface TeachingStaffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: {
    id: string;
    name: string;
    status: LecturerStatus;
    structural_position: StructuralPosition;
  };
}

const TeachingStaffForm = ({ open, onOpenChange, staff }: TeachingStaffFormProps) => {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"Non-Fungsional" | "Praktisi" | "">("");
  const [structuralPosition, setStructuralPosition] = useState<StructuralPosition>("Tidak Ada");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update form data when staff prop changes
  useEffect(() => {
    if (staff) {
      setName(staff.name || "");
      setStatus(staff.status as "Non-Fungsional" | "Praktisi" || "");
      setStructuralPosition(staff.structural_position || "Tidak Ada");
    } else {
      // Reset form for new staff
      setName("");
      setStatus("");
      setStructuralPosition("Tidak Ada");
    }
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !status) return;

    setIsSubmitting(true);
    try {
      if (staff) {
        // Update existing teaching staff
        const { error } = await supabase
          .from('lecturers')
          .update({
            name: name.trim(),
            status: status as LecturerStatus,
            structural_position: structuralPosition,
            program_id: null, // Non-functional and practitioner lecturers don't belong to specific programs
            updated_at: new Date().toISOString()
          })
          .eq('id', staff.id);

        if (error) throw error;
        toast({ title: "Data tenaga pengajar berhasil diperbarui" });
      } else {
        // Create new teaching staff
        const { error } = await supabase
          .from('lecturers')
          .insert({
            name: name.trim(),
            status: status as LecturerStatus,
            structural_position: structuralPosition,
            program_id: null // Non-functional and practitioner lecturers don't belong to specific programs
          });

        if (error) throw error;
        toast({ title: "Tenaga pengajar berhasil ditambahkan" });
      }

      queryClient.invalidateQueries({ queryKey: ['teaching-staff'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      onOpenChange(false);
      
      // Reset form
      setName("");
      setStatus("");
      setStructuralPosition("Tidak Ada");
    } catch (error) {
      console.error('Error saving teaching staff:', error);
      toast({
        title: "Gagal menyimpan tenaga pengajar",
        description: "Terjadi kesalahan saat menyimpan data",
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
            {staff ? "Edit Tenaga Pengajar" : "Tambah Tenaga Pengajar Baru"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Tenaga Pengajar</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama tenaga pengajar"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as "Non-Fungsional" | "Praktisi")} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !status}>
              {isSubmitting ? "Menyimpan..." : staff ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeachingStaffForm;