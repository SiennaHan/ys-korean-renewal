import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useRef, useState } from "react";

export const Route = createFileRoute('/test/realtime')({
  component: RouteComponent,
})

interface WebSocketMessage {
  type: string;
  text?: string;
  delta?: string;
}

export default function RouteComponent() {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<string>("연결 중...");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // AudioContext 초기화
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioContextClass();

    // FastAPI WebSocket에 연결
    wsRef.current = new WebSocket("ws://localhost:8000/ws");

    wsRef.current.onopen = () => {
      console.log("WebSocket 연결됨");
      setWsStatus("연결됨 ✓");
    };

    wsRef.current.onmessage = async (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

				console.log("data=>", data);

        // 1. 텍스트 토큰 실시간 표시
        if (data.type === "response.output_text.delta" && data.text) {
          setMessages((prev) => {
            const newMessages = [...prev];
            if (newMessages.length > 0 && typeof newMessages[newMessages.length - 1] === 'string') {
              // 마지막 메시지에 추가
              newMessages[newMessages.length - 1] += data.text;
            } else {
              // 새 메시지 추가
              newMessages.push(data.text || "");
            }
            return newMessages;
          });
        }

        // 텍스트 완료
        if (data.type === "response.output_text.done") {
          setMessages((prev) => [...prev, "\n---\n"]);
        }

        // 2. 오디오 스트리밍 재생
        if (data.type === "response.audio.delta" && data.delta && audioCtxRef.current) {
          // Base64 디코딩
          const binaryString = atob(data.delta);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // AudioContext resume (사용자 인터랙션 후)
          if (audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume();
          }

          try {
            const audioBuffer = await audioCtxRef.current.decodeAudioData(bytes.buffer);
            playAudioBuffer(audioBuffer);
          } catch (error) {
            console.error("오디오 디코딩 실패:", error);
          }
        }
      } catch (error) {
        console.error("메시지 처리 오류:", error);
      }
    };

    wsRef.current.onerror = (error: Event) => {
      console.error("WebSocket 오류:", error);
      setWsStatus("오류 발생 ✗");
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket 연결 종료");
      setWsStatus("연결 끊김 ✗");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // 오디오 버퍼를 순차적으로 재생
  const playAudioBuffer = (audioBuffer: AudioBuffer) => {
    if (!audioCtxRef.current) return;

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtxRef.current.destination);

    const currentTime = audioCtxRef.current.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);
    
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  // 사용자 메시지 보내기
  const sendMessage = () => {
    const inputElement = document.getElementById("msg") as HTMLInputElement;
    if (!inputElement) return;
    const msg = inputElement.value.trim();

    if (!msg) {
      console.log("메시지가 비어있습니다");
      return;
    }

    if (!wsRef.current) {
      console.error("WebSocket이 초기화되지 않았습니다");
      setWsStatus("WebSocket 없음 ✗");
      return;
    }

    console.log("WebSocket readyState:", wsRef.current.readyState);
    console.log("OPEN 상태:", WebSocket.OPEN);

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket이 열려있지 않습니다. 현재 상태:", wsRef.current.readyState);
      setWsStatus("연결 안됨 ✗");
      alert("WebSocket이 연결되지 않았습니다. 서버를 확인해주세요.");
      return;
    }

    // 사용자 메시지 표시
    setMessages((prev) => [...prev, `You: ${msg}`, ""]);

    // WebSocket으로 전송
    wsRef.current.send(
      JSON.stringify({
        type: "conversation.item.create",
				item: {
					type: "message",
					role: "user",
					content: [
						{
							type: "input_text",
							text: msg
						}
					]
				}
			})
    );

    // 입력 필드 초기화
    inputElement.value = "";
    nextStartTimeRef.current = 0; // 오디오 타이밍 리셋
  };

  // Enter 키로 전송
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>Realtime Chat with OpenAI</h2>
        <div style={{ 
          padding: "8px 16px", 
          backgroundColor: wsStatus.includes("✓") ? "#d4edda" : "#f8d7da",
          color: wsStatus.includes("✓") ? "#155724" : "#721c24",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: "bold"
        }}>
          {wsStatus}
        </div>
      </div>
      <div
        style={{
          border: "1px solid #ddd",
          padding: 10,
          height: 400,
          overflowY: "scroll",
          marginBottom: 20,
          backgroundColor: "#f9f9f9",
          borderRadius: 4,
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: "#999" }}>메시지를 입력하세요...</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              {m}
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          id="msg"
          type="text"
          placeholder="메시지를 입력하세요..."
          style={{
            flex: 1,
            padding: 10,
            fontSize: 14,
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
          onKeyPress={handleKeyPress}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}