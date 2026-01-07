import { createContext, useState, useRef, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUtils';
import { sendMessage } from '../services/api';

interface CallContextType {
    call: { isReceivedCall: boolean; from: number; name?: string; avatar?: string; signal: any; conversationId?: number } | null;
    callAccepted: boolean;
    callEnded: boolean;
    isCalling: boolean;
    myVideo: React.RefObject<HTMLVideoElement | null>;
    userVideo: React.RefObject<HTMLVideoElement | null>;
    stream: MediaStream | null;
    callInfo: { name: string; avatar?: string } | null;
    callUser: (user: { id: number; name: string; avatar?: string }, conversationId?: number) => void;
    answerCall: () => void;
    leaveCall: (reason?: 'missed' | 'rejected' | 'ended' | 'canceled') => void;
    toggleAudio: () => void;
    toggleVideo: () => void;
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
    const [isMyVideoOff, setIsMyVideoOff] = useState(false);
    const [isMyAudioOff, setIsMyAudioOff] = useState(false);
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

    // Define helper to clear resources
    const cleanupCall = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }

        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            setStream(null);
            streamRef.current = null;
        }
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
        });

        socket.on('call_incoming', (data) => {
            console.log("Receive Call Incoming:", data);
            setCall({
                isReceivedCall: true,
                from: data.fromUser,
                name: data.name,
                avatar: data.avatar,
                signal: data.signalData,
                conversationId: data.conversationId
            });
            if (data.conversationId) setConversationId(data.conversationId);

            // Play Ringtone
            try {
                if (ringtoneRef.current) ringtoneRef.current.pause();
                ringtoneRef.current = new Audio('/annc19324_sound.mp3');
                ringtoneRef.current.loop = true;
                const playPromise = ringtoneRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error("Ringtone error:", e);
                    });
                }
            } catch (e) { }
        });

        socket.on('call_accepted', async (data) => {
            console.log("Call Accepted Info:", data);
            setCallAccepted(true);
            setIsCalling(false);

            const signal = data.signal || data;
            if (data.name) {
                setCallInfo({ name: data.name, avatar: data.avatar });
            }

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }

            if (connectionRef.current) {
                try {
                    await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
                } catch (err) {
                    console.error("Error setting remote desc on answer:", err);
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
                try {
                    await connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
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
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("ice_candidate", {
                    to: targetId,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            console.log("Received Remote Stream");
            if (userVideo.current) {
                userVideo.current.srcObject = event.streams[0];
            }
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

        // Start Dial Tone
        try {
            if (ringtoneRef.current) ringtoneRef.current.pause();
            ringtoneRef.current = new Audio('https://upload.wikimedia.org/wikipedia/commons/e/e0/Synthesized_Device_Dial_Tone.ogg');
            ringtoneRef.current.volume = 1.0;
            ringtoneRef.current.loop = true;
            const playPromise = ringtoneRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') console.error("Dial tone error:", e);
                });
            }
        } catch (e) { console.error("Audio init error", e); }
    };

    const answerCall = async () => {
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }

        setCallAccepted(true);
        const currentStream = await getMedia();
        if (!currentStream) return;

        if (!call) return;
        setOtherUserId(call.from);

        const peer = createPeer(call.from, false);

        try {
            await peer.setRemoteDescription(new RTCSessionDescription(call.signal));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            if (socketRef.current) {
                socketRef.current.emit("answer_call", {
                    to: call.from,
                    signal: answer,
                    name: user.fullName || user.username,
                    avatar: getAvatarUrl(user.avatar)
                });
            }
        } catch (error) {
            console.error("Answer Error:", error);
            toast.error("Lỗi khi trả lời cuộc gọi");
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
            callInfo,
            callUser,
            answerCall,
            leaveCall,
            toggleAudio,
            toggleVideo,
            isMyAudioOff,
            isMyVideoOff,
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
