import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateClass, useUpdateClass } from "@/hooks/useClasses";
import { usePrograms } from "@/hooks/usePrograms";

interface ClassFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClass?: {
    id: string;
    name: string;
    level: number;
    program_id?: string | null;
  } | null;
  defaultProgramId?: string;
}

export const ClassForm = ({ open, onOpenChange, editingClass, defaultProgramId }: ClassFormProps) => {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [programId, setProgramId] = useState("");
  
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const { data: programs = [] } = usePrograms();
  
  const isEditing = !!editingClass;
  const isSubmitting = createClass.isPending || updateClass.isPending;

  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
      setLevel(editingClass.level);
      setProgramId(editingClass.program_id || defaultProgramId || "");
    } else {
      setName("");
      setLevel(null);
      setProgramId(defaultProgramId || "");
    }
  }, [defaultProgramId, editingClass, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !level || !programId) return;

    try {
      if (isEditing) {
        await updateClass.mutateAsync({
          id: editingClass.id,
          name: name.trim(),
          level,
          program_id: programId
        });
      } else {
        await createClass.mutateAsync({
          name: name.trim(),
          level,
          program_id: programId
        });
      }
      
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Kelas" : "Tambah Kelas Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Ubah nama kelas yang sudah ada."
              : "Buat kelas baru untuk tingkat pembelajaran tertentu."
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Kelas</Label>
            <Input
              id="name"
              placeholder="Contoh: Kelas A, Kelas B, Kelas Malam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Program Studi</Label>
            <Select value={programId} onValueChange={setProgramId} required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih program studi" />
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
          
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="level">Tingkat</Label>
              <Select 
                value={level?.toString()} 
                onValueChange={(value) => setLevel(parseInt(value))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tingkat 1</SelectItem>
                  <SelectItem value="2">Tingkat 2</SelectItem>
                  <SelectItem value="3">Tingkat 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim() || !programId || (!isEditing && !level)}
            >
              {isSubmitting ? "Menyimpan..." : (isEditing ? "Simpan Perubahan" : "Tambah Kelas")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
