import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

type LoginPortal = 'student' | 'institute' | 'dev';

const roleRoutes: Record<UserRole, string> = {
  super_admin: '/super-admin',
  institute_admin: '/institute',
  faculty: '/faculty',
  student: '/student',
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // STEP CONTROL
  const [step, setStep] = useState(1);
  const [portal, setPortal] = useState<LoginPortal>('student');

  // FORM FIELDS
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    idNumber: '',
    email: '',
    phone: '',
    password: '',
  });

  // OTP
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // VIDEO
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoDone, setVideoDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // CAMERA
  useEffect(() => {
    if (showVideoModal) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        });
    }

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [showVideoModal]);

  const handleRecord = () => {
    setRecording(true);

    setTimeout(() => {
      setRecording(false);
      setVideoDone(true);

      toast({
        title: "Video captured successfully"
      });

    }, 2000);
  };

  const handleSubmit = async () => {
    try {
      const user = await login(form.email, form.password, portal);
      navigate(roleRoutes[user.role]);
    } catch (err) {
      toast({
        title: "Login failed",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="max-w-lg text-center space-y-6">

          <div className="inline-flex items-center gap-3">
            <Shield className="h-12 w-12 text-accent" />
            <span className="text-4xl font-bold text-primary-foreground">ProctorX</span>
          </div>

          <h2 className="text-xl text-primary-foreground/80">
            AI-Powered Exam Proctoring
          </h2>

          <p className="text-primary-foreground/60">
            Enterprise-grade proctoring platform with real-time AI monitoring.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-6">
            {[
              { val: '50K+', label: 'Students' },
              { val: '99.9%', label: 'Uptime' },
              { val: '<1s', label: 'Detection' }
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-bold text-accent">{s.val}</p>
                <p className="text-xs text-primary-foreground/50">{s.label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">

          <h1 className="text-2xl font-bold">Verification Required</h1>

          {/* STEP INDICATOR */}
          <div className="flex justify-between text-xs">
            {["Details", "OTP", "Video", "Submit"].map((s, i) => (
              <span key={i} className={step >= i + 1 ? "text-primary font-semibold" : "text-muted-foreground"}>
                {s}
              </span>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-3">

              <label className="text-sm font-medium" htmlFor="portal">
                Login Portal
              </label>
              <select
                id="portal"
                value={portal}
                onChange={(e) => setPortal(e.target.value as LoginPortal)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="student">Student Portal</option>
                <option value="institute">Institute Portal</option>
                <option value="dev">Developer Portal</option>
              </select>

              <Input placeholder="First Name" onChange={e => setForm({ ...form, firstName: e.target.value })} />
              <Input placeholder="Last Name" onChange={e => setForm({ ...form, lastName: e.target.value })} />
              <Input type="date" onChange={e => setForm({ ...form, dob: e.target.value })} />
              <Input placeholder="ID Number" onChange={e => setForm({ ...form, idNumber: e.target.value })} />
              <Input placeholder="Email" onChange={e => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Password" type="password" onChange={e => setForm({ ...form, password: e.target.value })} />
              <Input placeholder="Phone" onChange={e => setForm({ ...form, phone: e.target.value })} />

              <Button onClick={() => {
                setOtpSent(true);
                toast({ title: "OTP sent successfully" });
                setStep(2);
              }} className="w-full">
                Continue
              </Button>

            </div>
          )}

          {/* STEP 2 OTP */}
          {step === 2 && (
            <div className="space-y-3">

              <Input placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />

              <Button onClick={() => {
                setOtpVerified(true);
                toast({ title: "OTP Verified" });
                setStep(3);
              }} className="w-full">
                Verify OTP
              </Button>

            </div>
          )}

          {/* STEP 3 VIDEO */}
          {step === 3 && (
            <div className="space-y-3">

              <Button onClick={() => setShowVideoModal(true)} className="w-full">
                {videoDone ? "Re-record Video" : "Capture Video"}
              </Button>

              {videoDone && (
                <p className="text-green-500 text-sm">✔ Video Verified</p>
              )}

              <Button
                disabled={!videoDone}
                onClick={() => setStep(4)}
                className="w-full"
              >
                Continue
              </Button>

            </div>
          )}

          {/* STEP 4 FINAL */}
          {step === 4 && (
            <Button onClick={handleSubmit} className="w-full bg-accent">
              Complete Login
            </Button>
          )}

        </div>
      </div>

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-xl w-96 space-y-4">

            <h3 className="font-semibold">Video KYC</h3>

            <video ref={videoRef} autoPlay className="w-full h-48 rounded" />

            <Button onClick={handleRecord} disabled={recording} className="w-full">
              {recording ? "Recording..." : "Record Video"}
            </Button>

            <Button onClick={() => setShowVideoModal(false)} variant="outline" className="w-full">
              Close
            </Button>

          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;