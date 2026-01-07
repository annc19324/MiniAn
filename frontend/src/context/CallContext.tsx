import { createContext, useState, useRef, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';
import { sendMessage } from '../services/api';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';


interface CallContextType {
    call: { isReceivedCall: boolean; from: number; name?: string; avatar?: string; signal: any; conversationId?: number } | null;
    callAccepted: boolean;
    callEnded: boolean;
    isCalling: boolean;
    myVideo: React.RefObject<HTMLVideoElement | null>;
    userVideo: React.RefObject<HTMLVideoElement | null>;
    stream: MediaStream | null;
    remoteStream: MediaStream | null; // Added state
    callInfo: { name: string; avatar?: string } | null;
    callUser: (user: { id: number; name: string; avatar?: string }, conversationId?: number) => void;
    answerCall: () => void;
    leaveCall: (reason?: 'missed' | 'rejected' | 'ended' | 'canceled') => void;
    returnToCall: () => void;
    toggleAudio: () => void;
    toggleVideo: () => void;
    isMinimized: boolean; // Added
    setIsMinimized: (value: boolean) => void; // Added
    isMyVideoOff: boolean;
    isMyAudioOff: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

// WebRTC Configuration/STUN Servers
const peerConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [call, setCall] = useState<CallContextType['call']>(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null); // Added state
    const [isMyVideoOff, setIsMyVideoOff] = useState(false);
    const [isMyAudioOff, setIsMyAudioOff] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false); // Added state
    const [callInfo, setCallInfo] = useState<{ name: string; avatar?: string } | null>(null);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [otherUserId, setOtherUserId] = useState<number | null>(null);
    const [isCalling, setIsCalling] = useState(false);

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const dialToneOscRef = useRef<OscillatorNode | null>(null);
    const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]); // Queue for connected peer (waiting for RemoteDesc)
    const incomingCandidatesBuffer = useRef<any[]>([]); // Buffer for candidates received BEFORE peer exists (Receiver side)

    // Define helper to clear resources
    const stopDialTone = () => {
        try {
            if (dialToneOscRef.current) {
                dialToneOscRef.current.stop();
                dialToneOscRef.current.disconnect();
                dialToneOscRef.current = null;
            }
            if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
                audioCtxRef.current.suspend();
            }
        } catch (e) { }
    };

    const cleanupCall = () => {
        if (notificationIntervalRef.current) {
            clearInterval(notificationIntervalRef.current);
            notificationIntervalRef.current = null;
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
        stopDialTone();

        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            setStream(null);
            streamRef.current = null;
        }
        setRemoteStream(null); // Clear remote stream
    };

    const leaveCall = (reason: 'missed' | 'rejected' | 'ended' | 'canceled' = 'ended') => {
        cleanupCall();

        // If we are connected and remote ends, we don't need to emit end again.
        // But if reason is 'ended', it means user clicked Hangup.
        let targetId = otherUserId;
        if (!targetId && call?.from) targetId = call.from;

        if (socketRef.current && targetId) {
            socketRef.current.emit("end_call", { to: targetId });
        }

        // Send System Message
        console.log("Leaving call, reason:", reason, "CID:", conversationId);
        if (conversationId) {
            let msg = "";
            if (reason === 'missed') msg = "Bạn đã bỏ lỡ cuộc gọi video";
            else if (reason === 'rejected') msg = "Đã từ chối cuộc gọi video";
            else if (reason === 'ended' && callAccepted) msg = "Cuộc gọi video đã kết thúc";

            if (msg) {
                sendMessage(conversationId, "_" + msg + "_").catch(e => console.error("Msg Error", e));
            }
        }

        setCallEnded(true);
        setIsCalling(false);
        setCall(null);
        setCallAccepted(false);
        setOtherUserId(null);
        setCallInfo(null);
        setConversationId(null);
    };

    // Initialize Socket
    useEffect(() => {
        if (!user) return;

        const socket = io(import.meta.env.VITE_SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Call Socket Connected:', socket.id);
            socket.emit('user_connected', user.id);

            // Request Notification Permission
            if ("Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission();
            }
        });

        socket.on('call_incoming', async (data) => {
            console.log("Receive Call Incoming:", data);
            setCallEnded(false);
            setCall({
                isReceivedCall: true,
                from: data.fromUser,
                name: data.name,
                avatar: data.avatar,
                signal: data.signalData,
                conversationId: data.conversationId
            });
            if (data.conversationId) setConversationId(data.conversationId);

            // === NATIVE MOBILE LOGIC ===
            if (Capacitor.isNativePlatform()) {
                // Schedule Local Notification
                try {
                    await LocalNotifications.requestPermissions();
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: `📞 Cuộc gọi từ ${data.name || "Người dùng"}`,
                            body: "Nhấn để mở ứng dụng và trả lời",
                            id: 1,
                            schedule: { at: new Date(Date.now() + 100) }, // Now
                            sound: undefined, // Use default or configure 'annc19324_sound.wav' if mapped
                            actionTypeId: 'OPEN_APP_ACTION',
                            extra: { type: 'call_incoming' },
                            channelId: 'calls_channel' // Defined in Android generic setup or default
                        }]
                    });
                    // Create channel if needed (Android O+)
                    await LocalNotifications.createChannel({
                        id: 'calls_channel',
                        name: 'Call Notifications',
                        importance: 5, // High
                        visibility: 1,
                        sound: 'annc19324_sound.mp3', // Requires file in res/raw (already there)
                        vibration: true
                    });
                } catch (e) {
                    console.error("LocalNotif Error", e);
                }
            }
            // === WEB LOGIC ===
            else {
                if ("Notification" in window && Notification.permission === "granted") {
                    const showNotification = () => {
                        if (document.visibilityState === 'visible') return;

                        // Vibrate
                        if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);

                        const notif = new Notification(`Cuộc gọi đến từ ${data.name || "Người dùng"}`, {
                            body: "Nhấn để trả lời ngay",
                            icon: getAvatarUrl(data.avatar),
                            tag: "call_incoming",
                            // @ts-ignore
                            renotify: true,
                            requireInteraction: true,
                            silent: false
                        });
                        notif.onclick = () => {
                            window.focus();
                            setIsMinimized(false);
                            if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
                        };
                    };
                    showNotification();
                    notificationIntervalRef.current = setInterval(showNotification, 4000);
                }
            }

            // Play Ringtone (Common)
            try {
                if (ringtoneRef.current) ringtoneRef.current.pause();
                ringtoneRef.current = new Audio('/annc19324_sound.mp3');
                ringtoneRef.current.loop = true;
                const playPromise = ringtoneRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => { console.error("Ringtone error:", e); });
                }
            } catch (e) { }
        });

        socket.on('call_accepted', async (data) => {
            console.log("Call Accepted Info DEBUG:", data);
            toast.success(`Connected with ${data.name || "Unknown"}`);

            // Robust Name Fetching
            if (data.name && data.name !== "Người dùng") {
                setCallInfo({ name: data.name, avatar: data.avatar });
            } else {
                // Fallback: Fetch profile directly
                try {
                    // We need the other user ID. 
                    // 'call' object might still be 'connected' state, so use 'call.from' if we are receiver?
                    // But here we are the CALLER (Call Accepted usually means we called).
                    // If we are caller, who did we call? 'otherUserId' might be set.
                    // Or use 'call.to'? No, call object is local.
                    // The 'data' from 'call_accepted' might contain 'from'?
                    // Usually 'call_accepted' is sent to the caller.
                    // We can rely on 'otherUserId' state if set in 'callUser'.

                    // If we have otherUserId, fetch it.
                    // Use ID from payload (embedded in signal or direct) to avoid closure staleness
                    const targetId = data.fromId || data.signal?.fromId || (data.type === 'answer' && data.fromId);

                    if (targetId) {
                        const { getProfile } = await import('../services/api');
                        const res = await getProfile(targetId);
                        if (res.data) {
                            setCallInfo({ name: res.data.fullName || res.data.username, avatar: getAvatarUrl(res.data.avatar) });
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch profile for call info", e);
                }
            }

            setCallAccepted(true);
            setIsCalling(false);

            // Ensure we are not minimized on start
            setIsMinimized(false);

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
            stopDialTone();

            if (connectionRef.current) {
                try {
                    // If data is just signal
                    const signal = data.signal || data;
                    await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));

                    // Process Queued Candidates
                    while (iceCandidatesQueue.current.length > 0) {
                        const candidate = iceCandidatesQueue.current.shift();
                        if (candidate) {
                            try {
                                await connectionRef.current.addIceCandidate(candidate);
                                console.log("Added queued candidate");
                            } catch (e) { console.error("Error adding queued candidate", e); }
                        }
                    }
                } catch (err) {
                    console.error("Error setting remote description", err);
                }
            }
        });

        socket.on('call_ended', () => {
            // Remote ended. Pure cleanup.
            cleanupCall();
            setCallEnded(true);
            setIsCalling(false);
            setCall(null);
            setCallAccepted(false);
            setOtherUserId(null);
            setCallInfo(null);
            setConversationId(null);
            toast('Cuộc gọi đã kết thúc');
        });

        socket.on('ice_candidate_received', async (candidate) => {
            if (connectionRef.current && candidate) {
                const iceCandidate = new RTCIceCandidate(candidate);
                if (connectionRef.current.remoteDescription) {
                    try {
                        await connectionRef.current.addIceCandidate(iceCandidate);
                    } catch (e) { console.error("Error adding ice candidate", e); }
                } else {
                    iceCandidatesQueue.current.push(iceCandidate);
                }
            } else if (!connectionRef.current && candidate) {
                // Buffer candidates if peer doesn't exist yet (Receiver ringing state)
                console.log("Buffering candidate (No Peer)");
                incomingCandidatesBuffer.current.push(candidate);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Setup Media Stream
    const getMedia = async () => {
        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(currentStream);
            streamRef.current = currentStream;
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
            }
            return currentStream;
        } catch (err) {
            console.error("Failed to get media", err);
            toast.error("Không thể truy cập Camera/Microphone");
            return null;
        }
    };

    const createPeer = (targetId: number, _isInitiator: boolean) => {
        const peer = new RTCPeerConnection(peerConfiguration);

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.emit("ice_candidate", {
                    to: targetId,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            console.log("Track received:", event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                peer.addTrack(track, streamRef.current!);
            });
        }

        connectionRef.current = peer;
        return peer;
    };

    const callUser = async (targetUser: { id: number; name: string; avatar?: string }, cid?: number) => {
        const currentStream = await getMedia();
        if (!currentStream) return;

        setCallAccepted(false);
        setCallEnded(false);
        setIsCalling(true);
        setCallInfo(targetUser);
        setOtherUserId(targetUser.id);
        if (cid) setConversationId(cid);
        setIsMinimized(false); // Force maximize on new call

        const peer = createPeer(targetUser.id, true);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        if (socketRef.current && user) {
            socketRef.current.emit("call_user", {
                userToCall: targetUser.id,
                signalData: offer,
                fromUser: user.id,
                name: user.fullName || user.username,
                avatar: getAvatarUrl(user.avatar), // Fix Avatar
                conversationId: cid
            });
        }

        // Timeout 60s
        timeoutRef.current = setTimeout(() => {
            toast("Không có phản hồi");
            leaveCall('missed');
        }, 60000);

        // Start Dial Tone (Custom MP3)
        try {
            stopDialTone();
            if (ringtoneRef.current) ringtoneRef.current.pause();
            ringtoneRef.current = new Audio('/annc19324_sound.mp3');
            ringtoneRef.current.loop = true;
            ringtoneRef.current.play().catch(e => console.error("Dialtone Play Error", e));
        } catch (e) { console.error("Dialtone Init Error", e); }
    };

    const answerCall = async () => {
        if (!user) return;
        if (notificationIntervalRef.current) {
            clearInterval(notificationIntervalRef.current);
            notificationIntervalRef.current = null;
        }
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
        stopDialTone();

        setCallAccepted(true);
        setIsMinimized(false); // Force maximize on answer
        const currentStream = await getMedia();
        if (!currentStream) return;

        if (!call) return;
        setOtherUserId(call.from);

        const peer = createPeer(call.from, false);
        connectionRef.current = peer;

        try {
            await peer.setRemoteDescription(new RTCSessionDescription(call.signal));
            // Tracks are already added by createPeer if stream exists


            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            if (socketRef.current) {
                console.log("Sending answer with info embedded:", user.fullName || user.username);
                // Embed info into signal to ensure it passes through old backend logic
                const signalWithInfo = {
                    ...answer,
                    name: user.fullName || user.username,
                    avatar: getAvatarUrl(user.avatar),
                    fromId: user.id
                };

                socketRef.current.emit("answer_call", {
                    to: call.from,
                    signal: signalWithInfo,
                    name: user.fullName || user.username, // Send separately too just in case
                    avatar: getAvatarUrl(user.avatar)
                });
            }
        } catch (error) {
            console.error("Answer Error:", error);
            toast.error("Lỗi khi trả lời cuộc gọi");
        }
    };

    const returnToCall = () => {
        // Force UI state to show modal if call object exists
        if (call) {
            if (call.isReceivedCall) setCallAccepted(true);
            else setIsCalling(true);
        }
    };

    const toggleAudio = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMyAudioOff(!isMyAudioOff);
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsMyVideoOff(!isMyVideoOff);
        }
    };

    return (
        <CallContext.Provider value={{
            call,
            callAccepted,
            callEnded,
            myVideo,
            userVideo,
            stream,
            remoteStream, // Export
            callInfo,
            callUser,
            answerCall,
            leaveCall,
            returnToCall, // Added
            toggleAudio,
            toggleVideo,
            isMyAudioOff,
            isMyVideoOff,
            isMinimized, // Added
            setIsMinimized, // Added
            isCalling
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within CallProvider');
    return context;
};
