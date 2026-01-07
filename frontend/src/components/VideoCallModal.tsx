import { useCall } from '../context/CallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

export default function VideoCallModal() {
    const {
        call, callAccepted, callEnded, isCalling,
        myVideo, userVideo,
        answerCall, leaveCall, toggleAudio, toggleVideo,
        isMyAudioOff, isMyVideoOff
    } = useCall();

    // Determine if we should show the modal
    // 1. Incoming Call (not accepted yet)
    // 2. Active Call (accepted)
    // 3. Outgoing Call (calling...)
    const showModal = (call?.isReceivedCall && !callAccepted) || (callAccepted && !callEnded) || isCalling;

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-fade-in text-white p-4">

            {/* Active Call UI */}
            {callAccepted && !callEnded ? (
                <div className="w-full h-full max-w-6xl flex flex-col gap-4 relative">
                    {/* Remote Video (Main) */}
                    <div className="flex-1 bg-black rounded-3xl overflow-hidden relative shadow-2xl border border-slate-700">
                        <video
                            playsInline
                            ref={userVideo}
                            autoPlay
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                            <span className="font-bold">{call?.name || "Người gọi"}</span>
                        </div>
                    </div>

                    {/* Local Video (Floating or Split) */}
                    <div className="absolute top-4 right-4 w-32 h-48 md:w-48 md:h-72 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-600 transition-all hover:scale-105">
                        <video
                            playsInline
                            muted
                            ref={myVideo}
                            autoPlay
                            className={`w-full h-full object-cover ${isMyVideoOff ? 'hidden' : ''}`}
                        />
                        {isMyVideoOff && <div className="w-full h-full flex items-center justify-center bg-slate-800 text-xs text-slate-400">Camera Off</div>}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 p-4 bg-slate-800/80 backdrop-blur-xl rounded-full shadow-2xl border border-slate-600">
                        <button
                            onClick={toggleAudio}
                            className={`p-4 rounded-full transition-all ${isMyAudioOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            {isMyAudioOff ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        <button
                            onClick={() => leaveCall()}
                            className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white shadow-lg shadow-red-600/30 scale-110 hover:scale-125 transition-all"
                        >
                            <PhoneOff size={32} />
                        </button>

                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-full transition-all ${isMyVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            {isMyVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                        </button>
                    </div>
                </div>
            ) : (
                /* Incoming Call or Calling UI */
                <div className="bg-slate-800/50 p-8 rounded-3xl backdrop-blur-xl border border-slate-700 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full animate-scale-in">
                    <div className="relative">
                        {/* Avatar Placeholder or Image */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold mb-4 shadow-lg shadow-indigo-500/30">
                            {(call?.name?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                            <div className="bg-green-500 p-2 rounded-full animate-pulse">
                                <Phone size={16} fill="white" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold">{isCalling ? "Đang gọi..." : (call?.name || "Tin nhắn ẩn danh")}</h2>
                        <p className="text-slate-400 mt-1">{isCalling ? "Đang chờ bắt máy..." : "Cuộc gọi video đến"}</p>
                    </div>

                    <div className="flex items-center gap-8 mt-4">
                        {call?.isReceivedCall && !callAccepted && (
                            <button
                                onClick={answerCall}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-all animate-bounce">
                                    <Phone size={24} fill="currentColor" />
                                </div>
                                <span className="text-sm font-medium text-green-400">Trả lời</span>
                            </button>
                        )}

                        <button
                            onClick={() => leaveCall()}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-all">
                                <PhoneOff size={24} />
                            </div>
                            <span className="text-sm font-medium text-red-400">{isCalling ? "Hủy" : "Từ chối"}</span>
                        </button>
                    </div>

                    {/* Ringtone would play here */}
                </div>
            )}
        </div>
    );
}
