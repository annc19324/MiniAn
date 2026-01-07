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
    const showModal = (call?.isReceivedCall && !callAccepted) || (callAccepted && !callEnded) || isCalling;

    if (!showModal) return null;

    // Prioritize callInfo (which contains updated name from accepted event)
    // If isCalling was true but now false (accepted), we still want callInfo.
    // Only use 'call' for incoming calls that haven't been accepted yet (callInfo might be null).
    const displayInfo = (callInfo && callInfo.name) ? callInfo : call;

    const displayName = (displayInfo?.name && displayInfo.name !== "Người dùng") ? displayInfo.name : "Người dùng";
    const displayAvatar = displayInfo?.avatar;
    const displayInitial = (displayName?.[0] || "?").toUpperCase();

    // Minimized View
    if (showModal && isMinimized && callAccepted && !callEnded) {
        return (
            <>
                {/* Global Top Banner for Easy Return */}
                {/* Return Text Button - Top Right */}
                <div
                    onClick={() => setIsMinimized(false)}
                    className="fixed top-[130px] right-4 z-[10000] cursor-pointer animate-fade-in bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg hover:bg-black/60 transition-all flex items-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-white text-xs font-bold">Quay lại cuộc gọi</span>
                </div>

                {/* Mini Floating Video - Below Text */}
                <div className="fixed top-[170px] right-4 w-32 h-44 md:bottom-4 md:right-4 md:top-auto md:w-64 md:h-40 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 z-[9999] group animate-fade-in ring-1 ring-white/10">
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
                            title="Phóng to"
                        >
                            <Maximize2 size={20} />
                        </button>
                        <button
                            onClick={() => leaveCall('ended')}
                            className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg scale-90 hover:scale-100 transition-all"
                            title="Kết thúc"
                        >
                            <PhoneOff size={20} />
                        </button>
                    </div>
                    <div className="absolute top-1 left-2 text-[10px] text-white/80 font-bold truncate max-w-[80px] drop-shadow-md">
                        {displayName}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center animate-fade-in text-white p-4">
            {/* Minimize Button */}
            {callAccepted && !callEnded && (
                <button
                    onClick={() => setIsMinimized(true)}
                    className="absolute top-14 left-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all z-50 group border border-white/10 shadow-lg"
                    title="Thu nhỏ"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            )}

            {/* Active Call UI (Hidden, not Unmounted) */}
            <div
                className={`relative w-full max-w-5xl aspect-[9/16] md:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col md:flex-row transition-all duration-300 ${(!callAccepted || callEnded) ? 'hidden' : 'flex'}`}
            >
                {/* Remote Video (Full Container) */}
                <div className="absolute inset-0 w-full h-full">
                    <video
                        ref={userVideo}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                    />
                    {/* Info Overlay */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 bg-black/40 pr-4 pl-1 py-1 rounded-full backdrop-blur-sm flex items-center gap-3 border border-white/10 z-20 transition-all hover:bg-black/60">
                        {displayAvatar ? (
                            <img src={displayAvatar} className="w-8 h-8 rounded-full border border-white/20" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs shadow-inner text-white">
                                {displayInitial}
                            </div>
                        )}
                        <span className="font-bold text-sm md:text-base text-white/90">{displayName}</span>
                    </div>
                </div>

                {/* Local Video (PiP) */}
                <div className="absolute top-20 right-4 w-28 h-40 md:top-6 md:right-6 md:w-48 md:h-36 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 z-30 group/pip ring-1 ring-black/50 transition-all hover:scale-105">
                    <video
                        ref={myVideo}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover mirror ${isMyVideoOff ? 'hidden' : ''}`}
                    />
                    {isMyVideoOff && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500">
                            <VideoOff size={20} className="mb-1 opacity-50" />
                            <span className="text-[10px]">Off</span>
                        </div>
                    )}
                    <div className="absolute bottom-1 left-2 text-[10px] text-white/70 font-semibold drop-shadow-md">Bạn</div>
                </div>

                {/* Controls Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 md:bottom-8 md:gap-6 md:p-3 bg-slate-900/60 backdrop-blur-xl rounded-full shadow-2xl border border-white/10 z-40 transition-all hover:bg-slate-900/80">
                    <button
                        onClick={toggleVideo}
                        className={`p-3 rounded-full transition-all ${isMyVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isMyVideoOff ? "Bật Camera" : "Tắt Camera"}
                    >
                        {isMyVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>

                    <button
                        onClick={toggleAudio}
                        className={`p-3 rounded-full transition-all ${isMyAudioOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isMyAudioOff ? "Bật Mic" : "Tắt Mic"}
                    >
                        {isMyAudioOff ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                        onClick={() => leaveCall('ended')}
                        className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-lg shadow-red-600/30 transition-all hover:scale-110 mx-2"
                        title="Kết thúc"
                    >
                        <PhoneOff size={24} fill="white" />
                    </button>
                </div>
            </div>

            {/* Incoming/Outgoing Call UI */}
            {!callAccepted && !callEnded && (
                <div className="relative bg-slate-800/50 p-8 rounded-3xl backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full animate-scale-in border-t border-white/10">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full ring-4 ring-indigo-500/30 overflow-hidden shadow-2xl">
                            {displayAvatar ? (
                                <img src={displayAvatar} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
                                    {displayInitial}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2">
                            <div className="bg-indigo-500 p-3 rounded-full animate-pulse shadow-lg ring-4 ring-slate-900">
                                <Phone size={20} fill="white" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold">{isCalling ? "Đang gọi..." : displayName}</h2>
                        <p className="text-slate-400 mt-1">{isCalling ? `Đang gọi cho ${displayName}...` : "Cuộc gọi video đến"}</p>
                    </div>

                    <div className="flex items-center gap-10 mt-6 md:gap-12">
                        {call?.isReceivedCall && !callAccepted && (
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={answerCall}
                                    className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-all animate-bounce"
                                >
                                    <Phone size={28} fill="currentColor" />
                                </button>
                                <span className="text-sm font-medium text-green-400">Trả lời</span>
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => leaveCall(isCalling ? 'canceled' : 'rejected')}
                                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 hover:scale-110 transition-all scale-100"
                            >
                                <PhoneOff size={28} />
                            </button>
                            <span className="text-sm font-medium text-red-400">{isCalling ? "Hủy" : "Từ chối"}</span>
                        </div>
                    </div>

                    {/* Hints or Status */}
                    {isCalling && <p className="text-xs text-slate-500 mt-2">Đang chờ phản hồi...</p>}
                </div>
            )}
        </div >
    );
}
