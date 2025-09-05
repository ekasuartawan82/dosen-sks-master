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

interface CourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: {
    id: string;
    name: string;
    sks: number;
    level: number;
    program_id?: string;
  };
}

const CourseForm = ({ open, onOpenChange, course }: CourseFormProps) => {
  const [name, setName] = useState(course?.name || "");
  const [sks, setSks] = useState(course?.sks?.toString() || "");
  const [level, setLevel] = useState(course?.level?.toString() || "");
  const [programId, setProgramId] = useState(course?.program_id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: programs = [] } = usePrograms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sks || !level || !programId) return;

    const sksNum = parseInt(sks);
    const levelNum = parseInt(level);
    
    if (sksNum <= 0 || levelNum <= 0) {
      toast({
        title: "Input tidak valid",
        description: "SKS dan Level harus berupa angka positif",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (course) {
        // Update existing course
        const { error } = await supabase
          .from('courses')
          .update({
            name: name.trim(),
            sks: sksNum,
            level: levelNum,
            program_id: programId,
            updated_at: new Date().toISOString()
          })
          .eq('id', course.id);

        if (error) throw error;
        toast({ title: "Mata kuliah berhasil diperbarui" });
      } else {
        // Create new course
        const { error } = await supabase
          .from('courses')
          .insert({
            name: name.trim(),
            sks: sksNum,
            level: levelNum,
            program_id: programId
          });

        if (error) throw error;
        toast({ title: "Mata kuliah berhasil ditambahkan" });
      }

      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      onOpenChange(false);
      
      // Reset form
      setName("");
      setSks("");
      setLevel("");
      setProgramId("");
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Gagal menyimpan mata kuliah",
        description: "Terjadi kesalahan saat menyimpan data mata kuliah",
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
            {course ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Mata Kuliah</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama mata kuliah"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sks">SKS</Label>
            <Input
              id="sks"
              type="number"
              value={sks}
              onChange={(e) => setSks(e.target.value)}
              placeholder="Masukkan jumlah SKS"
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <Input
              id="level"
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Masukkan level (1-4)"
              min="1"
              max="4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Program Studi</Label>
            <Select value={programId} onValueChange={setProgramId}>
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
            <Button type="submit" disabled={isSubmitting || !name.trim() || !sks || !level || !programId}>
              {isSubmitting ? "Menyimpan..." : course ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CourseForm;