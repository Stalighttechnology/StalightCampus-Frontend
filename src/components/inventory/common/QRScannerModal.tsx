import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Camera, Search, AlertCircle, RefreshCw, SwitchCamera, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string) => void;
}

export const QRScannerModal: React.FC<Props> = ({ isOpen, onClose, onScanSuccess }) => {
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize Scanner Reader & enumerate devices
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    const initDevices = async () => {
      try {
        const devices = await codeReader.current?.listVideoInputDevices();
        if (devices && devices.length > 0) {
          setVideoDevices(devices);
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          setSelectedDeviceId(backCam ? backCam.deviceId : devices[devices.length - 1].deviceId);
        }
      } catch (err) {
        console.error("Error listing video devices:", err);
      }
    };
    initDevices();

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Auto-start or stop scanning when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      if (codeReader.current) {
        codeReader.current.reset();
      }
      setScanning(false);
      setIsCameraStarting(false);
      setScanError(null);
      return;
    }

    setManualCode("");
    setScanError(null);

    // Short delay to allow Dialog DOM element to mount
    const timer = setTimeout(() => {
      startScanning();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (codeReader.current) {
        codeReader.current.reset();
      }
      setScanning(false);
      setIsCameraStarting(false);
    };
  }, [isOpen]);

  const startScanning = async (deviceIdToUse?: string) => {
    if (!codeReader.current || !videoRef.current) return;
    const targetDevice = deviceIdToUse || selectedDeviceId;

    setScanning(true);
    setIsCameraStarting(true);
    setScanError(null);

    try {
      const result = await codeReader.current.decodeOnceFromVideoDevice(targetDevice, videoRef.current);
      if (result) {
        const scannedText = result.getText();
        handleDetectedText(scannedText);
      }
    } catch (err: any) {
      if (!(err instanceof NotFoundException)) {
        console.error("Scan error:", err);
        setScanError(err?.message || "Camera access denied or device error.");
      }
    } finally {
      setIsCameraStarting(false);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setScanning(false);
    setIsCameraStarting(false);
  };

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDeviceId = videoDevices[nextIndex].deviceId;
      setSelectedDeviceId(nextDeviceId);

      if (scanning && codeReader.current && videoRef.current) {
        codeReader.current.reset();
        setIsCameraStarting(true);
        codeReader.current
          .decodeOnceFromVideoDevice(nextDeviceId, videoRef.current)
          .then((result) => {
            if (result) {
              handleDetectedText(result.getText());
            }
          })
          .catch((err) => {
            if (!(err instanceof NotFoundException)) {
              console.error(err);
            }
          })
          .finally(() => {
            setIsCameraStarting(false);
            setScanning(false);
          });
      }
    }
  };

  const handleDetectedText = (text: string) => {
    let itemCode = text.trim();

    // Check for JSON format
    try {
      const parsed = JSON.parse(text);
      if (parsed.item_code) itemCode = parsed.item_code;
      else if (parsed.code) itemCode = parsed.code;
      else if (parsed.id) itemCode = String(parsed.id);
    } catch {}

    // Check for STALIGHT-ASSET format
    if (text.includes("STALIGHT-ASSET:")) {
      const match = text.match(/STALIGHT-ASSET:([^|]+)/);
      if (match && match[1]) {
        itemCode = match[1].trim();
      }
    }

    stopScanning();
    setManualCode("");
    onScanSuccess(itemCode.trim());
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      const code = manualCode.trim().toUpperCase();
      stopScanning();
      setManualCode("");
      onScanSuccess(code);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Camera className="w-5 h-5 text-primary" />
              Scan Asset QR Code
            </DialogTitle>
            {videoDevices.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwitchCamera}
                title="Switch Camera"
                className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <SwitchCamera className="w-4 h-4" /> Switch Cam
              </Button>
            )}
          </div>
          <DialogDescription>
            Point your device camera at the item's QR badge or enter the code below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Camera Viewfinder */}
          <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border flex items-center justify-center">
            <video
              ref={videoRef}
              onPlaying={() => setIsCameraStarting(false)}
              className="w-full h-full object-cover bg-black"
              playsInline
              muted
            />

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-60 animate-pulse" />
                <p className="text-sm font-medium">Position item QR code in front of camera</p>
                <Button
                  onClick={() => startScanning()}
                  className="mt-3 bg-primary hover:bg-primary/90 text-white text-xs h-8"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5" /> Start Scanning
                </Button>
              </div>
            )}

            {isCameraStarting && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Starting camera...</p>
              </div>
            )}

            {scanError && (
              <div className="absolute inset-4 bg-background/95 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 z-10">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <p className="text-xs text-muted-foreground font-medium">{scanError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startScanning()}
                  className="mt-2 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry Camera
                </Button>
              </div>
            )}
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Or enter Item Code (e.g. E-LAP-0001)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="pl-9 font-mono uppercase text-sm"
              />
            </div>
            <Button type="submit" disabled={!manualCode.trim()}>
              Lookup
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
