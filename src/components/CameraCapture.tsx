import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, AlertCircle, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capturar Foto'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setCapturedImage(null);
    
    try {
      // Stop existing stream
      stopCamera();
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Camera error:', err);
      setIsLoading(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada no dispositivo.');
        } else if (err.name === 'NotReadableError') {
          setError('Câmera em uso por outro aplicativo.');
        } else {
          setError('Erro ao acessar a câmera. Verifique as permissões.');
        }
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL (JPEG for smaller file size)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageDataUrl);
    
    // Stop the camera stream
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  }, [capturedImage, onCapture, onClose]);

  const toggleCamera = useCallback(async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setError(null);
    setIsLoading(true);
    
    try {
      stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Camera toggle error:', err);
      // Fallback: try without specific facingMode
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setIsLoading(false);
      } catch {
        setIsLoading(false);
        setError('Não foi possível alternar a câmera.');
      }
    }
  }, [facingMode, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X size={24} />
          </Button>
          <span className="text-white font-medium">{title}</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Camera View / Captured Image / Error */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {isLoading && !error && (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Iniciando câmera...</span>
          </div>
        )}
        
        {error && (
          <div className="flex flex-col items-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <p className="text-white text-lg">{error}</p>
            <Button 
              onClick={startCamera}
              variant="secondary"
              className="mt-4"
            >
              Tentar Novamente
            </Button>
          </div>
        )}
        
        {!capturedImage && !error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              isLoading && "opacity-0"
            )}
          />
        )}
        
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Foto capturada"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-safe bg-gradient-to-t from-black/70 to-transparent">
        {!capturedImage && !error && !isLoading && (
          <div className="flex items-center justify-center gap-8">
            {/* Switch camera button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <SwitchCamera size={24} />
            </Button>
            
            {/* Capture button */}
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>
            
            {/* Spacer for centering */}
            <div className="w-12 h-12" />
          </div>
        )}
        
        {capturedImage && (
          <div className="flex items-center justify-center gap-6">
            {/* Retake button */}
            <Button
              variant="ghost"
              onClick={retakePhoto}
              className="flex flex-col items-center gap-2 h-auto py-3 px-6 text-white hover:bg-white/20"
            >
              <RotateCcw size={28} />
              <span className="text-sm">Tirar Outra</span>
            </Button>
            
            {/* Confirm button */}
            <Button
              onClick={confirmPhoto}
              className="flex flex-col items-center gap-2 h-auto py-3 px-8 bg-green-600 hover:bg-green-700"
            >
              <Check size={28} />
              <span className="text-sm">Confirmar</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
