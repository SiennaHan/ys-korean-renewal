import { getTtsUrl } from '@/api/chat';
import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react';

export const Route = createFileRoute('/test/audio')({
  component: RouteComponent,
})

function RouteComponent() {
  const [text, setText] = useState<string>("안녕하세요. 테스트 음성입니다.");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);


  async function handleGenerate() {
    setIsLoading(true);
    try {
      const url = await getTtsUrl(text);
      if (!url) throw new Error("TTS 요청 실패");

      setAudioUrl(url);

      // 자동 재생
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error(err);
      alert("TTS 실패: " + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReplay() {
    if (!audioUrl) {
      alert("먼저 음성 생성(Generate)을 해주세요.");
      return;
    }

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  }

  function handlePause() {
    audioRef.current?.pause();
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: "1rem auto", fontFamily: "sans-serif" }}>
      <h3>OpenAI TTS 데모</h3>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? "생성중..." : "Generate & Play"}
        </button>
        <button onClick={handleReplay} style={{ marginLeft: 8 }}>
          Replay
        </button>
        <button onClick={handlePause} style={{ marginLeft: 8 }}>
          Pause
        </button>
        <button onClick={handleStop} style={{ marginLeft: 8 }}>
          Stop
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <audio ref={audioRef} controls style={{ width: "100%" }}>
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}