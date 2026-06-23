import React, { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { useTheme } from "../../context/ThemeContext";
import { Camera, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./button";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  title?: string;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Scan Barcode"
}) => {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      // Resume context to bypass browser autoplay restrictions
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (e) {
      console.warn('Audio API not supported or blocked', e);
    }
  };

  // Initialize
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    
    const initDevices = async () => {
      codeReader.current?.listVideoInputDevices()
        .then((devices) => {
          setVideoDevices(devices);
          if (devices.length > 0) {
            // Try to default to the rear/back camera
            const backCamera = devices.find(d => /back|rear|environment/i.test(d.label));
            if (backCamera) {
              setSelectedDeviceId(backCamera.deviceId);
            } else {
              // Fallback to the last device (often the back camera on Android if labels are generic)
              setSelectedDeviceId(devices[devices.length - 1].deviceId);
            }
          }
        })
        .catch(err => console.error(err));
    };

    initDevices();

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen && codeReader.current) {
      codeReader.current.reset();
      setScanning(false);
      setScanError(null);
    }
  }, [isOpen]);

  const startScanning = async () => {
    if (!codeReader.current || !videoRef.current) return;
    setScanning(true);
    setIsCameraStarting(true);
    setScanError(null);

    try {
      const result = await codeReader.current.decodeOnceFromVideoDevice(selectedDeviceId, videoRef.current);
      if (result) {
        playBeep();
        onScan(result.getText());
        onClose();
      }
    } catch (err) {
      if (err instanceof NotFoundException) {
        // Ignored or handled as not found
      } else {
        console.error(err);
        setScanError("Camera access denied or no camera found.");
        setTimeout(() => setScanError(null), 3000);
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
    setScanError(null);
  };

  const handleSwitchCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDeviceId = videoDevices[nextIndex].deviceId;
      setSelectedDeviceId(nextDeviceId);
      
      if (scanning && codeReader.current) {
        codeReader.current.reset();
        setIsCameraStarting(true);
        // Immediately start scanning with new device
        codeReader.current.decodeOnceFromVideoDevice(nextDeviceId, videoRef.current)
          .then(result => {
            if (result) {
              playBeep();
              onScan(result.getText());
              onClose();
            }
          })
          .catch(err => {
            if (!(err instanceof NotFoundException)) {
              console.error(err);
            }
          });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`w-[90vw] sm:max-w-md border p-6 shadow-2xl rounded-xl ${theme === 'dark' ? 'bg-[#2c2c2e] border-[#3a3a3c] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative aspect-square w-full max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            onPlaying={() => setIsCameraStarting(false)}
            className="w-full h-full object-cover rounded-lg bg-black"
            playsInline
            muted 
          />
          
          {!scanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click "Start Scanning" to begin</p>
            </div>
          )}
          
          {scanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[40%] border-2 border-emerald-500 rounded-md shadow-[0_0_0_100vw_rgba(0,0,0,0.4)]"></div>
            </div>
          )}
        </div>
        
        {scanError && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {!scanning ? (
            <Button onClick={startScanning} className="flex-1 bg-primary hover:bg-primary/90 text-white">
              <Camera className="h-4 w-4 mr-2" /> Start Scanning
            </Button>
          ) : (
            <>
              {isCameraStarting ? (
                <Button disabled className="flex-1 bg-primary hover:bg-primary/90 text-white">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Camera...
                </Button>
              ) : (
                <>
                  {videoDevices.length > 1 && (
                    <Button onClick={handleSwitchCamera} variant="outline" className="flex-1" title="Switch Camera">
                      Switch Cam
                    </Button>
                  )}
                  <Button onClick={stopScanning} variant="outline" className="flex-1">
                    Stop
                  </Button>
                </>
              )}
            </>
          )}
          <Button onClick={() => onClose()} variant="outline">
            Close
          </Button>
        </div>
        
        <p className="text-center text-xs mt-4 opacity-70">
          Center the barcode inside the camera view.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerModal;
