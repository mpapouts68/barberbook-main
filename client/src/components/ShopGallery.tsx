import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { ImagePlus, Loader2, Store, Trash2, X } from "lucide-react";
import type { ShopPhoto } from "@shared/schema";

export default function ShopGallery() {
  const { user } = useAuth();
  const { isEnglish } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const text = {
    title: isEnglish ? "OUR SHOP" : "ΤΟ ΚΟΜΜΩΤΗΡΙΟ ΜΑΣ",
    subtitle: isEnglish
      ? "Take a look inside PEQI Haircut Studio"
      : "Ρίξτε μια ματιά στο χώρο μας",
    empty: isEnglish ? "No photos yet" : "Δεν υπάρχουν φωτογραφίες ακόμα",
    emptyAdmin: isEnglish
      ? "Upload photos to showcase your shop"
      : "Ανεβάστε φωτογραφίες του χώρου",
    upload: isEnglish ? "Add photo" : "Προσθήκη φωτογραφίας",
    uploading: isEnglish ? "Uploading..." : "Μεταφόρτωση...",
    delete: isEnglish ? "Remove" : "Αφαίρεση",
    uploadSuccess: isEnglish ? "Photo added" : "Η φωτογραφία προστέθηκε",
    uploadError: isEnglish ? "Upload failed" : "Αποτυχία μεταφόρτωσης",
    deleteSuccess: isEnglish ? "Photo removed" : "Η φωτογραφία αφαιρέθηκε",
    deleteError: isEnglish ? "Could not remove photo" : "Αποτυχία αφαίρεσης",
  };

  const { data: photos = [], isLoading } = useQuery<ShopPhoto[]>({
    queryKey: ["/api/shop-photos"],
    queryFn: () => api.getShopPhotos(),
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadShopPhoto(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-photos"] });
      toast({ title: text.uploadSuccess });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: () => {
      toast({ title: text.uploadError, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteShopPhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-photos"] });
      toast({ title: text.deleteSuccess });
      setPreviewUrl(null);
    },
    onError: () => {
      toast({ title: text.deleteError, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
  };

  return (
    <>
      <Card className="metal-gradient border-steel h-full flex flex-col overflow-hidden">
        <CardContent className="p-5 flex flex-col flex-1 min-h-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-oswald text-xl font-bold text-whiskey flex items-center gap-2">
                <Store className="w-5 h-5" />
                {text.title}
              </h3>
              <p className="text-gray-400 text-sm mt-1">{text.subtitle}</p>
            </div>
            {isAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 border-whiskey/50 text-whiskey hover:bg-whiskey/10"
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">
                    {uploadMutation.isPending ? text.uploading : text.upload}
                  </span>
                </Button>
              </>
            )}
          </div>

          {isLoading ? (
            <div className="flex-1 grid grid-cols-2 gap-2 animate-pulse">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-steel/40 rounded-lg aspect-[4/3]" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4 border border-dashed border-steel rounded-lg">
              <Store className="w-12 h-12 text-gray-500 mb-3 opacity-60" />
              <p className="text-gray-300">{text.empty}</p>
              {isAdmin && (
                <p className="text-gray-500 text-sm mt-1">{text.emptyAdmin}</p>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-steel/60 bg-charcoal"
                  >
                    <button
                      type="button"
                      className="absolute inset-0 w-full h-full"
                      onClick={() => setPreviewUrl(photo.url)}
                      aria-label={photo.caption || "Shop photo"}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || "PEQI shop"}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </button>
                    {isAdmin && (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8 opacity-90"
                        disabled={deleteMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(photo.id);
                        }}
                        title={text.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={previewUrl}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
