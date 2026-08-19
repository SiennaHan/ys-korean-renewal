import clsx from "clsx";
import { useState, useEffect, useRef } from "react";
import { useAudioRecorder } from "react-audio-voice-recorder";

import { Mic, Upload, X, Trash2 } from 'lucide-react';
import { useToast } from "../toast/toast-context";
import { env } from "@/config/env";
import CircularProgress from "../ui/circular-progress";
import { postSpeaking } from "@/api/analyzeApi";
import { MicIcon } from "@/assets/icons";

interface Props {
  setResult: (isCorrect: boolean, resultWord: string, audioUrl: string) => void
  disabled?: boolean
}
type RecorderStatus = 'idle' | 'recording' | 'recorded' | 'uploading';

const baseButtonClasses = "flex justify-center items-center rounded-full text-[#fff] transition-all duration-200 ease-in-out cursor-pointer \
                          bg-[#0180FF] hover:bg-[#0180FFbb] active:bg-[#0180FFdd] \
                          disabled:text-gray-300 disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400";

const AudioRecorder = (props: Props) => {
  // const API_ENDPOINT = `${env.SPEAK_API_URL}/analyze/sound`;
  // const API_ENDPOINT = `${env.KOREAN_API_URL}/stt/convert`

  const { addToast } = useToast();
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderControls = useAudioRecorder();
  const { 
    startRecording, 
    stopRecording, 
    recordingBlob,
    isRecording, 
    mediaRecorder 
  } = recorderControls;

  useEffect(() => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
      }
      setRecorderStatus('recorded');
    }
  }, [recordingBlob]);

  const handlePrimaryAction = () => {
    if (recorderStatus === 'idle') {
      startRecording();
      setRecorderStatus('recording');
    } else if (recorderStatus === 'recording') {
      stopRecording();
    } else if (recorderStatus === 'recorded') {
      handleUpload();
    }
  };

  const handleCancelOrDelete = () => {
    if (isRecording) stopRecording();

    setIsPlaying(false);
    setRecorderStatus('idle');
    if (audioRef.current) audioRef.current.src = "";
  };
  
  const togglePlaying = () => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
    }
  };

  const handleUpload = async () => {
    if (recordingBlob) {
      setRecorderStatus('uploading');
      try {
        const resultMsg = await postSpeaking(recordingBlob)

        console.log('resultMsg=>', resultMsg);
        props.setResult(true, resultMsg ?? '', audioUrl ?? '');
      } catch (error) {
        console.error('API 호출 중 오류 발생:', error);
        addToast(`분석에 실패했습니다. 다시시도해 주세요`);
      } finally {
        handleCancelOrDelete();
      }
    }
  };

  // 재생 시간과 전체 길이를 추적하기 위한 상태 추가
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 오디오 시간 업데이트 핸들러
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // 오디오 메타데이터 로드 핸들러 (전체 길이 파악)
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="flex flex-col items-center pt-[10px]">
      <div className="pl-[12px] pr-[8px] flex justify-between items-center ">
        <div className="flex items-center size-[50px]">
          {(recorderStatus === 'recorded') && (
            <button
              onClick={handleCancelOrDelete}
              className={clsx(baseButtonClasses, "!bg-[#FFE8E8] size-[44px]")}
            >
              <Trash2 size={20} color={'#F15F49'}/>
            </button>
          )}
        </div>

        <div className="relative size-[70px]">
          <div className=''>
            <CircularProgress sqSize={66} isStart={recorderStatus === "recording"} />
          </div>
          <button
            onClick={handlePrimaryAction}
            disabled={props.disabled || recorderStatus === 'uploading'}
            className={clsx(
              baseButtonClasses,
              "w-[60px] h-[60px] z-10 absolute top-[3px] left-[3px]", // 48px 크기 적용
            )}
            aria-label="Primary action"
          >
            {recorderStatus === 'idle' && <MicIcon color={"#fff"}/>}
            {recorderStatus === 'recording' && <div className="size-[16px] rounded-[3px] bg-[#fff]" />}
            {recorderStatus === 'recorded' && <Upload size={24}/>}
            {recorderStatus === 'uploading' && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fff]"></div>}
          </button>
        </div>

        <div className="flex gap-[10px] items-center w-[50px]">
          {/** dummy */}
        </div>
      </div>
      
      {/* 숨겨진 audio 요소 */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate} // 시간 업데이트 감지
        onLoadedMetadata={handleLoadedMetadata} // 전체 길이 감지
        className="hidden"
      />
    </div>
  );
};

export default AudioRecorder;