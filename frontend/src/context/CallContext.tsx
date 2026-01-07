import { createContext, useState, useRef, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface CallContextType {
    call: { isReceivedCall: boolean; from: number; name?: string; avatar?: string; signal: any } | null;
    callAccepted: boolean;
    callEnded: boolean;
    isCalling: boolean;
    myVideo: React.RefObject<HTMLVideoElement | null>;
    userVideo: React.RefObject<HTMLVideoElement | null>;
    stream: MediaStream | null;
    name: string;
    setName: (name: string) => void;
    callUser: (id: number) => void;
    answerCall: () => void;
    leaveCall: () => void;
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
    const [name, setName] = useState('');

    const [otherUserId, setOtherUserId] = useState<number | null>(null);
    const [isCalling, setIsCalling] = useState(false);

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    // Initialize Socket and Stream
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
                from: data.from,
                name: data.name,
                avatar: data.avatar,
                signal: data.signalData
            });
            // Play Ringtone
            try {
                if (ringtoneRef.current) ringtoneRef.current.pause();
                ringtoneRef.current = new Audio('https://www.soundjay.com/phone/phone-ringing-1.mp3');
                ringtoneRef.current.loop = true;
                ringtoneRef.current.play().catch(e => console.log("Ringtone blocked", e));
            } catch (e) { }
        });

        socket.on('call_accepted', async (signal) => {
            console.log("Call Accepted, setting remote desc");
            setCallAccepted(true);
            setIsCalling(false);
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
            leaveCall(false); // Do not emit end_call again if received
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

    const callUser = async (id: number) => {
        const currentStream = await getMedia();
        if (!currentStream) return;

        setCallAccepted(false);
        setCallEnded(false);
        setIsCalling(true);
        setOtherUserId(id);

        const peer = createPeer(id, true);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        if (socketRef.current && user) {
            socketRef.current.emit("call_user", {
                userToCall: id,
                signalData: offer,
                fromUser: user.id,
                name: user.fullName || user.username,
                avatar: user.avatar
            });
        }

        // Start Dial Tone
        try {
            if (ringtoneRef.current) ringtoneRef.current.pause();
            ringtoneRef.current = new Audio('https://www.soundjay.com/phone/phone-calling-1.mp3');
            ringtoneRef.current.loop = true;
            ringtoneRef.current.play().catch(e => console.log("Dial tone blocked", e));
        } catch (e) { }
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
                    signal: answer
                });
            }
        } catch (error) {
            console.error("Answer Error:", error);
            toast.error("Lỗi khi trả lời cuộc gọi");
        }
    };

    const leaveCall = (emitEnd = true) => {
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }

        setCallEnded(true);
        setIsCalling(false);
        if (connectionRef.current) {
            connectionRef.current.close();
            connectionRef.current = null;
        }

        // Stop all tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            setStream(null);
            streamRef.current = null;
        }

        if (emitEnd && socketRef.current && otherUserId) {
            socketRef.current.emit("end_call", { to: otherUserId });
        }

        setCall(null);
        setCallAccepted(false);
        setOtherUserId(null);
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
            name,
            setName,
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
