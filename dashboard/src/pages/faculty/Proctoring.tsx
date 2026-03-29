import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProctoringSession } from '@/types';
import { AlertTriangle, Filter, Mic, MicOff, Video, Wifi, WifiOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { createProctoringLog, listProctoringSessions } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';

const riskColors: Record<string, string> = {
  low: 'border-success/30 bg-success/5',
  medium: 'border-warning/30 bg-warning/5',
  high: 'border-destructive/30 bg-destructive/5',
  critical: 'border-destructive/50 bg-destructive/10',
};

const WARNING_PRESETS = [
  { key: 'look_screen', label: 'Look at the screen' },
  { key: 'object_spotted', label: 'Object spotted near candidate' },
  { key: 'face_not_visible', label: 'Face not clearly visible' },
  { key: 'suspicious_movement', label: 'Suspicious movement detected' },
  { key: 'custom', label: 'Custom warning' },
] as const;

const ProctoringPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [remark, setRemark] = useState('');
  const [warningType, setWarningType] = useState<string>(WARNING_PRESETS[0].key);
  const [customWarning, setCustomWarning] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeTwoWayKey, setActiveTwoWayKey] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [proctorStream, setProctorStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();
  const { data: sessions = [] } = useQuery({ queryKey: ['proctoring', 'sessions'], queryFn: listProctoringSessions });
  const peerMapRef = useRef<Record<string, RTCPeerConnection>>({});
  const socketMapRef = useRef<Record<string, WebSocket>>({});
  const listVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const focusVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});

  const getSessionKey = (session: ProctoringSession) => `${session.examId}:${session.studentId}`;

  const buildSignalUrl = (examId: string, studentId: string) => {
    const apiBase = ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api');
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      const wsBase = apiBase.replace(/^http/, 'ws');
      return `${wsBase}/proctoring/ws/${examId}/${studentId}?role=proctor`;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const normalizedBase = apiBase.startsWith('/') ? apiBase : `/${apiBase}`;
    return `${wsProtocol}://${window.location.host}${normalizedBase}/proctoring/ws/${examId}/${studentId}?role=proctor`;
  };

  const filtered = useMemo(() => (
    filter === 'all' ? sessions
      : filter === 'high-risk' ? sessions.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical')
      : sessions.filter(s => s.status === filter)
  ), [filter, sessions]);

  const selectedSession = useMemo(() => {
    if (!selectedKey) return null;
    return filtered.find((session) => getSessionKey(session) === selectedKey) || null;
  }, [selectedKey, filtered]);

  const applyStreamToVideo = (key: string) => {
    const stream = remoteStreamsRef.current[key];
    const listNode = listVideoRefs.current[key];
    const focusNode = focusVideoRefs.current[key];
    if (stream && listNode) {
      listNode.srcObject = stream;
      void listNode.play().catch(() => undefined);
    }
    if (stream && focusNode) {
      focusNode.srcObject = stream;
      void focusNode.play().catch(() => undefined);
    }
  };

  const sendSignal = (key: string, payload: Record<string, unknown>) => {
    const socket = socketMapRef.current[key];
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const syncTwoWayTracks = (key: string) => {
    const peer = peerMapRef.current[key];
    if (!peer) return;

    const hasTwoWay = key === activeTwoWayKey;
    const senders = peer.getSenders();

    if (!hasTwoWay || !proctorStream) {
      senders.forEach((sender) => {
        if (sender.track && (sender.track.kind === 'video' || sender.track.kind === 'audio')) {
          try {
            peer.removeTrack(sender);
          } catch {
            // no-op
          }
        }
      });
      return;
    }

    proctorStream.getTracks().forEach((track) => {
      const exists = senders.some((sender) => sender.track?.id === track.id);
      if (!exists) {
        peer.addTrack(track, proctorStream);
      }
    });
  };

  useEffect(() => {
    if (!activeTwoWayKey) {
      if (proctorStream) {
        proctorStream.getTracks().forEach((track) => track.stop());
        setProctorStream(null);
      }
      return;
    }

    let mounted = true;
    void navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setProctorStream(stream);
      })
      .catch(() => {
        setActiveTwoWayKey(null);
      });

    return () => {
      mounted = false;
    };
  }, [activeTwoWayKey]);

  useEffect(() => {
    if (!proctorStream) return;
    proctorStream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  }, [proctorStream, micEnabled]);

  useEffect(() => {
    Object.keys(peerMapRef.current).forEach((key) => {
      syncTwoWayTracks(key);
      sendSignal(key, { type: 'mode', mode: key === activeTwoWayKey ? 'two-way' : 'one-way' });
      sendSignal(key, { type: 'request-offer' });
    });
  }, [activeTwoWayKey, proctorStream]);

  useEffect(() => {
    const targetKeys = new Set(filtered.map((session) => `${session.examId}:${session.studentId}`));

    filtered.forEach((session) => {
      const key = `${session.examId}:${session.studentId}`;
      if (peerMapRef.current[key]) return;

      const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerMapRef.current[key] = peer;

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        const socket = socketMapRef.current[key];
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ type: 'signal-candidate', candidate: event.candidate }));
      };

      peer.ontrack = async (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        remoteStreamsRef.current[key] = stream;
        applyStreamToVideo(key);
      };

      const socket = new WebSocket(buildSignalUrl(session.examId, session.studentId));
      socketMapRef.current[key] = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'proctor-ready' }));
        socket.send(JSON.stringify({ type: 'mode', mode: key === activeTwoWayKey ? 'two-way' : 'one-way' }));
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'signal-offer' && message.sdp) {
            await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
            syncTwoWayTracks(key);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'signal-answer', sdp: answer }));
            return;
          }
          if (message.type === 'signal-candidate' && message.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
            return;
          }
          if (message.type === 'warning-ack' && typeof message.text === 'string') {
            toast({ title: 'Student Acknowledged', description: message.text });
          }
        } catch {
          // no-op
        }
      };
    });

    Object.keys(peerMapRef.current).forEach((key) => {
      if (targetKeys.has(key)) return;
      peerMapRef.current[key]?.close();
      delete peerMapRef.current[key];
      socketMapRef.current[key]?.close();
      delete socketMapRef.current[key];
      delete remoteStreamsRef.current[key];
      delete listVideoRefs.current[key];
      delete focusVideoRefs.current[key];
    });

    return () => {
      Object.values(peerMapRef.current).forEach((peer) => peer.close());
      Object.values(socketMapRef.current).forEach((socket) => socket.close());
      peerMapRef.current = {};
      socketMapRef.current = {};
      remoteStreamsRef.current = {};
      listVideoRefs.current = {};
      focusVideoRefs.current = {};
    };
  }, [filtered, activeTwoWayKey, proctorStream, toast]);

  const setOneWayFor = async (session: ProctoringSession) => {
    const key = getSessionKey(session);
    setSelectedKey(key);
    if (activeTwoWayKey === key) {
      setActiveTwoWayKey(null);
    }
    sendSignal(key, { type: 'mode', mode: 'one-way' });
    sendSignal(key, { type: 'request-offer' });
    await createProctoringLog({ examId: session.examId, studentId: session.studentId, action: 'mode_change', mode: 'one-way' }).catch(() => undefined);
  };

  const setTwoWayFor = async (session: ProctoringSession) => {
    const key = getSessionKey(session);
    const previousKey = activeTwoWayKey;
    setSelectedKey(key);
    setActiveTwoWayKey(key);
    if (previousKey && previousKey !== key) {
      sendSignal(previousKey, { type: 'mode', mode: 'one-way' });
      sendSignal(previousKey, { type: 'request-offer' });
    }
    sendSignal(key, { type: 'mode', mode: 'two-way' });
    sendSignal(key, { type: 'request-offer' });
    await createProctoringLog({ examId: session.examId, studentId: session.studentId, action: 'mode_change', mode: 'two-way' }).catch(() => undefined);
  };

  const sendWarning = async () => {
    if (!selectedSession) return;

    const warningMessage = warningType === 'custom'
      ? customWarning.trim()
      : (WARNING_PRESETS.find((item) => item.key === warningType)?.label || '').trim();

    if (!warningMessage) {
      toast({ title: 'Warning required', description: 'Select a warning option or enter a custom warning.', variant: 'destructive' });
      return;
    }

    const key = getSessionKey(selectedSession);
    sendSignal(key, { type: 'warning', text: warningMessage });
    await createProctoringLog({
      examId: selectedSession.examId,
      studentId: selectedSession.studentId,
      action: 'warning',
      remark: warningMessage,
      mode: key === activeTwoWayKey ? 'two-way' : 'one-way',
    }).catch(() => undefined);
    if (warningType === 'custom') {
      setCustomWarning('');
    }
    toast({ title: 'Warning Sent', description: warningMessage });
  };

  const saveRemark = async () => {
    if (!selectedSession || !remark.trim()) return;
    await createProctoringLog({
      examId: selectedSession.examId,
      studentId: selectedSession.studentId,
      action: 'remark',
      remark: remark.trim(),
      mode: getSessionKey(selectedSession) === activeTwoWayKey ? 'two-way' : 'one-way',
    }).then(() => {
      toast({ title: 'Remark Saved', description: 'Remark saved in proctoring logs.' });
      setRemark('');
    }).catch((error) => {
      toast({ title: 'Failed to save remark', description: (error as Error).message, variant: 'destructive' });
    });
  };

  return (
    <DashboardLayout>
      <PageHeader title="Live Proctoring" subtitle="Student-wise one-way/two-way monitoring" breadcrumbs={[{ label: 'Dashboard', path: '/faculty' }, { label: 'Proctoring' }]}
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="high-risk">High Risk Only</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-4">
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b text-sm font-semibold">Students (tiny live feeds + controls)</div>
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No real-time exam sessions are currently running.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((session) => {
                const key = getSessionKey(session);
                const selected = key === selectedKey;
                const twoWay = key === activeTwoWayKey;
                return (
                  <div key={key} className={`p-3 ${selected ? 'bg-muted/40' : ''}`}>
                    <div className="grid grid-cols-[88px_1fr_auto] gap-3 items-center">
                      <video
                        ref={(node) => {
                          listVideoRefs.current[key] = node;
                          applyStreamToVideo(key);
                        }}
                        autoPlay
                        muted
                        playsInline
                        className="w-[88px] h-[58px] rounded-md bg-muted object-cover border"
                      />
                      <button className="text-left" onClick={() => setSelectedKey(key)}>
                        <p className="text-sm font-semibold">{session.studentName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={session.status} />
                          <StatusBadge status={session.riskLevel} />
                          <span className={`text-xs font-medium ${session.violations.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            AI Violations: {session.violations.length}
                          </span>
                          {session.networkStrength === 'strong' ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant={twoWay ? 'outline' : 'default'} onClick={() => void setOneWayFor(session)}>One-way</Button>
                        <Button size="sm" variant={twoWay ? 'default' : 'outline'} onClick={() => void setTwoWayFor(session)}>
                          <Video className="h-4 w-4 mr-1" />Two-way
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`rounded-lg border p-4 ${selectedSession ? riskColors[selectedSession.riskLevel] : 'bg-card'}`}>
          {!selectedSession ? (
            <div className="text-sm text-muted-foreground">Select a student to view enlarged feed and actions.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedSession.studentName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedSession.status} />
                    <StatusBadge status={selectedSession.riskLevel} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Mode: <span className="font-medium">{selectedKey === activeTwoWayKey ? 'Two-way' : 'One-way'}</span>
                </div>
              </div>

              <video
                ref={(node) => {
                  if (!selectedSession) return;
                  const key = getSessionKey(selectedSession);
                  focusVideoRefs.current[key] = node;
                  applyStreamToVideo(key);
                }}
                autoPlay
                muted
                playsInline
                className="w-full h-64 rounded-md bg-muted object-cover border"
              />

              <div className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Face: {selectedSession.faceDetected ? 'Detected' : 'Not detected'}</span>
                <span>Progress: {selectedSession.progress}%</span>
                <span className={selectedSession.violations.length > 0 ? 'text-destructive font-medium' : ''}>AI Violations: {selectedSession.violations.length}</span>
                {selectedSession.violations.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />{selectedSession.violations.length} violation(s)</span>
                )}
              </div>

              {selectedKey === activeTwoWayKey && (
                <div className="flex items-center gap-2">
                  <Button variant={micEnabled ? 'default' : 'outline'} size="sm" onClick={() => setMicEnabled((prev) => !prev)}>
                    {micEnabled ? <Mic className="h-4 w-4 mr-1" /> : <MicOff className="h-4 w-4 mr-1" />}
                    {micEnabled ? 'Mic On' : 'Mic Off'}
                  </Button>
                  <span className="text-xs text-muted-foreground">Proctor can directly speak to this student.</span>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Warning / Remark</h4>
                <div className="space-y-2 mb-3">
                  <Select value={warningType} onValueChange={setWarningType}>
                    <SelectTrigger><SelectValue placeholder="Select warning" /></SelectTrigger>
                    <SelectContent>
                      {WARNING_PRESETS.map((option) => (
                        <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {warningType === 'custom' && (
                    <Input
                      placeholder="Type custom warning"
                      value={customWarning}
                      onChange={(e) => setCustomWarning(e.target.value)}
                    />
                  )}
                </div>
                <Textarea placeholder="Write internal remark..." value={remark} onChange={e => setRemark(e.target.value)} className="mb-2" />
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => void sendWarning()}>Raise Warning</Button>
                  <Button size="sm" variant="outline" onClick={() => void saveRemark()}>Save Remark</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProctoringPage;
