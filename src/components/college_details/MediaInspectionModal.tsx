import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Download,
  Trash2,
  ExternalLink,
  Calendar,
  HardDrive,
  Folder,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  ShieldCheck
} from "lucide-react";
import { CollegeMediaItem } from "@/utils/college_details_api";
import { useToast } from "@/hooks/use-toast";

interface MediaInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: CollegeMediaItem | null;
  onDelete?: (mediaItem: CollegeMediaItem) => void;
  canDelete?: boolean;
}

export const MediaInspectionModal: React.FC<MediaInspectionModalProps> = ({
  isOpen,
  onClose,
  mediaItem,
  onDelete,
  canDelete = true
}) => {
  const { toast } = useToast();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(true);

  if (!mediaItem) return null;

  const isPdf = mediaItem.filename?.toLowerCase().endsWith(".pdf") || mediaItem.content_type === "application/pdf";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mediaItem.url);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Document link copied to clipboard."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const formatCategory = (cat: string) => {
    switch (cat) {
      case "campus_photos":
        return "Campus Photo";
      case "certificates":
        return "Accreditation / Certificate";
      case "facilities":
        return "Facility & Lab Asset";
      case "seals":
        return "Seal & Official Signature";
      default:
        return cat.replace(/_/g, " ").toUpperCase();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold truncate max-w-md">
                {mediaItem.title || mediaItem.filename}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/20">
                  {formatCategory(mediaItem.category)}
                </Badge>
                <span>•</span>
                <span className="truncate max-w-[200px]">{mediaItem.filename}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mr-6">
            {!isPdf && (
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom Out">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-medium px-1.5">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom In">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRotate} title="Rotate 90°">
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Scalable On-Demand Viewport */}
        <div className="relative w-full h-[52vh] sm:h-[60vh] bg-neutral-950/90 flex items-center justify-center overflow-auto p-4 select-none">
          {isPdf ? (
            <iframe
              src={`${mediaItem.url}#toolbar=0`}
              className="w-full h-full rounded-lg border border-neutral-800 bg-white"
              title={mediaItem.title}
            />
          ) : (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {isLoadingImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Loading document preview...</span>
                </div>
              )}
              <img
                src={mediaItem.url}
                alt={mediaItem.title || "College Asset"}
                onLoad={() => setIsLoadingImage(false)}
                onError={() => setIsLoadingImage(false)}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out"
                }}
                className={`max-w-full max-h-[50vh] sm:max-h-[55vh] object-contain rounded shadow-lg transition-opacity duration-300 ${
                  isLoadingImage ? "opacity-0" : "opacity-100"
                }`}
              />
            </div>
          )}
        </div>

        {/* Metadata Strip & Actions */}
        <div className="px-6 py-3.5 bg-muted/20 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            {mediaItem.size && (
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-primary" />
                <span>{mediaItem.size}</span>
              </span>
            )}
            {mediaItem.uploaded_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{new Date(mediaItem.uploaded_at).toLocaleDateString()}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Institutional Document</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCopyLink}>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => window.open(mediaItem.url, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open</span>
            </Button>
            <Button
              asChild
              variant="default"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <a href={mediaItem.url} download={mediaItem.filename} target="_blank" rel="noreferrer">
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  onDelete(mediaItem);
                  onClose();
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
