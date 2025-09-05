import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProgram, useUpdateProgram } from "@/hooks/usePrograms";
import { toast } from "sonner";

interface ProgramFormProps {
  program?: any;
  onClose: () => void;
}

const ProgramForm = ({ program, onClose }: ProgramFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: ""
  });

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();

  // Update form data when program prop changes
  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name || "",
        code: program.code || "",
        description: program.description || ""
      });
    } else {
      // Reset form for new program
      setFormData({
        name: "",
        code: "",
        description: ""
      });
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Nama dan kode program studi harus diisi");
      return;
    }

    try {
      if (program) {
        await updateProgram.mutateAsync({ ...formData, id: program.id });
        toast.success("Program studi berhasil diperbarui");
      } else {
        await createProgram.mutateAsync(formData);
        toast.success("Program studi berhasil ditambahkan");
      }
      onClose();
    } catch (error: any) {
      toast.error(`Gagal menyimpan program studi: ${error.message}`);
    }
  };

  const isLoading = createProgram.isPending || updateProgram.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {program ? "Edit Program Studi" : "Tambah Program Studi"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Program Studi</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Teknik Informatika"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="code">Kode Program</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="Contoh: TI"
              maxLength={10}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi singkat program studi (opsional)"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              {isLoading ? "Menyimpan..." : (program ? "Perbarui" : "Simpan")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProgramForm;