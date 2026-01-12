import { useEffect } from 'react';
import { useCall } from '../context/CallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, ArrowLeft } from 'lucide-react';

export default function VideoCallModal() {
    const {
        call, callAccepted, callEnded, isCalling, callInfo,
        myVideo, userVideo, stream, remoteStream,
        answerCall, leaveCall, toggleAudio, toggleVideo,
        isMyAudioOff, isMyVideoOff, isMinimized, setIsMinimized
    } = useCall();

    useEffect(() => {
        const timer = setTimeout(() => {
            if (myVideo.current && stream) {
                console.log("Attaching stream to local video (Retried)");
                myVideo.current.srcObject = stream;
                myVideo.current.play().catch(e => console.error("Local video play error", e));
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [stream, callAccepted, isCalling, isMinimized]);

    useEffect(() => {
        // Debounce to ensure DOM is ready
        const timer = setTimeout(() => {
            if (userVideo.current && remoteStream) {
                console.log("Attaching remote stream to user video (Retried)");
                userVideo.current.srcObject = remoteStream;
                userVideo.current.play().catch(e => console.error("Play error", e));
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [remoteStream, callAccepted, isCalling, isMinimized]);

    // Determine if we should show the modal
    const showModal = (callAccepted && !callEnded) || isCalling;
    const showIncomingBanner = (call?.isReceivedCall && !callAccepted && !callEnded);

    if (!showModal && !showIncomingBanner) return null;

    // Prioritize callInfo (which contains updated name from accepted event)
    const displayInfo = (callInfo && callInfo.name) ? callInfo : call;
    const displayName = (displayInfo?.name && displayInfo.name !== "Người dùng") ? displayInfo.name : "Người dùng";
    const displayAvatar = displayInfo?.avatar;
    const displayInitial = (displayName?.[0] || "?").toUpperCase();

    // 1. Incoming Call Banner (Heads-up)
    if (showIncomingBanner) {
        return (
            <div className="fixed top-0 left-0 right-0 z-[10001] p-4 flex justify-center animate-slide-down pointer-events-none">
                <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20">
                                {displayAvatar ? (
                                    <img src={displayAvatar} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-indigo-500 flex items-center justify-center font-bold text-white">
                                        {displayInitial}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-slate-900">
                                <Phone size={10} className="text-white fill-current" />
                            </div>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">{displayName}</p>
                            <p className="text-indigo-400 text-xs font-medium animate-pulse">Cuộc gọi video đến...</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => leaveCall('rejected')}
                            className="p-3 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                            title="Từ chối"
                        >
                            <PhoneOff size={20} />
                        </button>
                        <button
                            onClick={answerCall}
                            className="p-3 bg-green-500 text-white hover:bg-green-600 rounded-xl shadow-lg shadow-green-500/30 transition-all animate-bounce"
                            title="Trả lời"
                        >
                            <Phone size={20} className="fill-current" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Minimized View (Active Call)
    if (showModal && isMinimized) {
        return (
            <>
                <div
                    onClick={() => setIsMinimized(false)}
                    className="fixed top-[180px] right-4 z-[10000] cursor-pointer animate-fade-in bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg hover:bg-black/60 transition-all flex items-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-white text-xs font-bold">Quay lại cuộc gọi</span>
                </div>

                <div className="fixed top-[220px] right-4 w-32 h-44 md:bottom-4 md:right-4 md:top-auto md:w-64 md:h-40 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 z-[9999] group animate-fade-in ring-1 ring-white/10">
                    <video
                        ref={userVideo}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                        <button
                            onClick={() => setIsMinimized(false)}
                            className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 shadow-lg scale-90 hover:scale-100 transition-all"
                        >
                            <Maximize2 size={20} />
                        </button>
                        <button
                            onClick={() => leaveCall('ended')}
                            className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg scale-90 hover:scale-100 transition-all"
                        >
                            <PhoneOff size={20} />
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // 3. Full Screen View (Active/Outgoing Call)
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center animate-fade-in text-white p-4">
            {callAccepted && !callEnded && (
                <button
                    onClick={() => setIsMinimized(true)}
                    className="absolute top-14 left-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all z-50 group border border-white/10 shadow-lg"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            )}

            <div
                className={`relative w-full max-w-5xl aspect-[9/16] md:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col md:flex-row transition-all duration-300`}
            >
                {/* Outgoing Call Waiting UI */}
                {isCalling && !callAccepted && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500 animate-pulse mb-6">
                            {displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-4xl font-bold">{displayInitial}</div>}
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Đang gọi...</h2>
                        <p className="text-slate-400">Đang chờ {displayName} trả lời</p>
                    </div>
                )}

                <div className="absolute inset-0 w-full h-full">
                    <video
                        ref={userVideo}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                    />
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-black/40 pr-4 pl-1 py-1 rounded-full backdrop-blur-sm flex items-center gap-3 border border-white/10 z-20">
                        {displayAvatar ? <img src={displayAvatar} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs">{displayInitial}</div>}
                        <span className="font-bold text-sm md:text-base">{displayName}</span>
                    </div>
                </div>

                <div className="absolute top-20 right-4 w-28 h-40 md:top-6 md:right-6 md:w-48 md:h-36 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 z-30 group/pip">
                    <video
                        ref={myVideo}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover mirror ${isMyVideoOff ? 'hidden' : ''}`}
                    />
                    {isMyVideoOff && <div className="w-full h-full flex items-center justify-center bg-slate-800"><VideoOff size={24} /></div>}
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 md:bottom-8 md:gap-6 md:p-3 bg-slate-900/60 backdrop-blur-xl rounded-full shadow-2xl border border-white/10 z-40">
                    <button onClick={toggleVideo} className={`p-3 rounded-full transition-all ${isMyVideoOff ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}>
                        {isMyVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                    <button onClick={toggleAudio} className={`p-3 rounded-full transition-all ${isMyAudioOff ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}>
                        {isMyAudioOff ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                        onClick={() => leaveCall(isCalling ? 'canceled' : 'ended')}
                        className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-lg mx-2"
                    >
                        <PhoneOff size={24} fill="white" />
                    </button>
                </div>
            </div>
        </div>
    );
}
