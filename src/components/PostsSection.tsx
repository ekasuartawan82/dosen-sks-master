import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pin, Calendar, User } from "lucide-react";
import { usePosts, useCreatePost } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const PostsSection = () => {
  const { data: posts, isLoading } = usePosts();
  const { user } = useAuth();
  const createPost = useCreatePost();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState<{
    title: string;
    content: string;
    type: 'announcement' | 'news' | 'update';
    is_pinned: boolean;
  }>({
    title: "",
    content: "",
    type: "announcement",
    is_pinned: false
  });

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createPost.mutateAsync(newPost);
      toast.success("Pengumuman berhasil dibuat!");
      setIsCreateDialogOpen(false);
      setNewPost({
        title: "",
        content: "",
        type: "announcement",
        is_pinned: false
      });
    } catch (error) {
      toast.error("Gagal membuat pengumuman");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800';
      case 'news': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement': return 'Pengumuman';
      case 'news': return 'Berita';
      case 'update': return 'Update';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Pengumuman & Berita</h2>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pengumuman & Berita</h2>
        {user && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Buat Pengumuman
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Pengumuman Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul</Label>
                  <Input
                    id="title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="Judul pengumuman"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Konten</Label>
                  <Textarea
                    id="content"
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="Isi pengumuman"
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipe</Label>
                  <Select
                    value={newPost.type}
                    onValueChange={(value) => 
                      setNewPost({ ...newPost, type: value as "announcement" | "news" | "update" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Pengumuman</SelectItem>
                      <SelectItem value="news">Berita</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={newPost.is_pinned}
                    onChange={(e) => setNewPost({ ...newPost, is_pinned: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="pinned">Pin pengumuman</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createPost.isPending} className="flex-1">
                    {createPost.isPending ? "Menyimpan..." : "Buat Pengumuman"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && (
                        <Pin className="h-4 w-4 text-primary" />
                      )}
                      <Badge className={getTypeColor(post.type)}>
                        {getTypeLabel(post.type)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {post.content}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{post.profiles?.full_name || post.profiles?.email || 'System'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(post.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Pin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Belum ada pengumuman</h3>
            <p className="text-muted-foreground">
              {user ? "Buat pengumuman pertama" : "Belum ada pengumuman tersedia"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostsSection;