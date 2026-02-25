import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { setFaceDescriptor } from "../../lib/faceStore";

interface Props {
  onVerified: () => void;
}

export const Verification: React.FC<Props> = ({ onVerified }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Initializing camera...");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      // 1️⃣ Load models
      setStatus("Loading face recognition models...");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      // 2️⃣ Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play();
        };
      }

      setStatus("Align your face properly and stay still...");
      startCapture();

    } catch (err) {
      setStatus("Camera access denied");
    }
  };

  const startCapture = () => {
    const interval = setInterval(async () => {
      if (!videoRef.current) return;

      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus("Face not detected. Sit in front of camera.");
        return;
      }

      // 🎯 STORE FACE BIOMETRIC
      setFaceDescriptor(detection.descriptor);

      setStatus("Face captured successfully ✔ Starting exam...");

      // stop camera
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());

      clearInterval(interval);

      // move to exam page
      setTimeout(() => {
        onVerified();
      }, 1500);

    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br from-purple-700 to-purple-900">
      <h1 className="text-3xl font-bold mb-6">Candidate Verification</h1>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width="420"
        height="320"
        className="rounded-xl border-2 border-purple-400 shadow-lg"
      />

      <p className="mt-6 text-lg text-purple-200">{status}</p>
    </div>
  );
};
