import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { setFaceDescriptor } from './faceStore';

interface VerificationProps {
  onVerified: () => void;
}

export function Verification({ onVerified }: VerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Click below to enable camera and microphone.');
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [canProceedFallback, setCanProceedFallback] = useState(false);

  const stopMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startFaceCapture = async () => {
    if (!videoRef.current) return;

    try {
      setStatus('Loading face recognition models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    } catch {
      setStatus('Face models not found. Camera is active; you can continue.');
      setCanProceedFallback(true);
      return;
    }

    setStatus('Align your face properly and stay still...');
    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current) return;
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus('Face not detected. Sit in front of camera.');
        return;
      }

      setFaceDescriptor(detection.descriptor);
      setStatus('Face captured successfully ✔ Starting exam...');
      stopMedia();
      window.setTimeout(onVerified, 1000);
    }, 1500);
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    setCanProceedFallback(false);
    try {
      setStatus('Requesting camera and microphone access...');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        setStatus('Camera enabled. Microphone permission denied; please enable mic before exam if required.');
      }

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await startFaceCapture();
    } catch {
      setHasPermission(false);
      setStatus('Camera access denied. Please allow camera permission and try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    return () => stopMedia();
  }, [onVerified]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-foreground bg-background p-4">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Candidate Verification</h1>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width={420}
        height={320}
        className="rounded-xl border-2 border-border card-shadow bg-card"
      />
      <p className="mt-6 text-lg text-muted-foreground">{status}</p>
      <button
        onClick={requestPermissions}
        disabled={isRequesting}
        className="mt-4 px-5 py-2.5 rounded-lg bg-primary hover:opacity-90 border border-primary text-primary-foreground disabled:opacity-60"
      >
        {isRequesting ? 'Requesting Permissions...' : hasPermission ? 'Retry Camera/Mic Check' : 'Enable Camera & Microphone'}
      </button>
      {canProceedFallback && (
        <button
          onClick={() => {
            stopMedia();
            onVerified();
          }}
          className="mt-3 px-5 py-2.5 rounded-lg bg-accent hover:opacity-90 border border-border text-accent-foreground"
        >
          Continue to Exam
        </button>
      )}
    </div>
  );
}
