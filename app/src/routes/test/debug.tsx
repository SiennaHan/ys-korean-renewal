import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';

export const Route = createFileRoute('/test/debug')({
  component: VoicePermissionIOS,
})

function VoicePermissionIOS() {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const requestPermission = async () => {
    try {
      console.log('🔍 디버그 정보:');
      console.log('- 프로토콜:', window.location.protocol);
      console.log('- User Agent:', navigator.userAgent);
      console.log('- iOS 감지:', /iPhone|iPad|iPod/.test(navigator.userAgent));
      
      // iOS에서는 더 간단한 constraints 사용
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: false
      };
      
      console.log('권한 요청 시작...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ 성공!');
      setStream(mediaStream);
      setPermission('granted');
      
      // 즉시 오디오 컨텍스트 생성 (iOS에서 중요)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      console.log('오디오 컨텍스트 생성됨');
      
    } catch (error) {
      const err = error as DOMException;
      console.error('❌ 실패:', err.name, err.message);
      
      if (err.name === 'NotAllowedError') {
        alert(
          'iOS 크롬에서 마이크 권한이 거부되었습니다.\n\n' +
          '해결 방법:\n' +
          '1. HTTPS 연결 확인\n' +
          '2. iOS 설정 > Safari > 카메라/마이크 권한 확인\n' +
          '3. 페이지 새로고침 후 다시 시도'
        );
      }
      
      setPermission('denied');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>iOS 크롬 마이크 테스트</h3>
      
      {/* 큰 버튼으로 명확한 사용자 제스처 */}
      <button 
        onClick={requestPermission}
        style={{
          padding: '20px 40px',
          fontSize: '18px',
          backgroundColor: '#007AFF',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        🎤 마이크 권한 요청
      </button>
      
      <div style={{ marginTop: 20 }}>
        <p>상태: {permission}</p>
        <p>프로토콜: {window.location.protocol}</p>
        <p>스트림: {stream ? '활성' : '없음'}</p>
      </div>
      
      {stream && (
        <button 
          onClick={() => {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
          }}
          style={{ marginTop: 10 }}
        >
          중지
        </button>
      )}
    </div>
  );
}

export default VoicePermissionIOS;


/*
interface LogEntry {
  timestamp: string;
  message: string;
}

function VoicePermissionDebug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const addLog = (message: string): void => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message
    };
    setLogs(prev => [...prev, entry]);
    console.log(message);
  };

  const checkBrowserSupport = (): boolean => {
    if (!navigator.mediaDevices) {
      addLog('❌ navigator.mediaDevices 미지원');
      return false;
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
      addLog('❌ getUserMedia 미지원');
      return false;
    }
    
    addLog('✅ 브라우저 지원 확인');
    return true;
  };

  const requestPermission = async (): Promise<void> => {
    addLog('🔍 환경 체크 시작');
    addLog(`프로토콜: ${window.location.protocol}`);
    addLog(`호스트: ${window.location.host}`);
    addLog(`User Agent: ${navigator.userAgent}`);
    
    if (!checkBrowserSupport()) {
      return;
    }
    
    try {
      addLog('📱 권한 요청 중...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog('✅ 성공!');
      
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        addLog(`트랙 종류: ${track.kind}`);
        addLog(`트랙 활성: ${track.enabled}`);
        addLog(`트랙 레이블: ${track.label}`);
      });
      
      // 테스트 후 정리
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      const err = error as DOMException;
      addLog(`❌ 실패: ${err.name}`);
      addLog(`메시지: ${err.message}`);
      addLog(`전체 정보: ${JSON.stringify(err, null, 2)}`);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={requestPermission}>권한 요청 테스트</button>
      <div style={{ 
        marginTop: 20, 
        fontSize: 12, 
        fontFamily: 'monospace',
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 4,
        maxHeight: 400,
        overflow: 'auto'
      }}>
        {logs.map((log, i) => (
          <div key={i}>
            <strong>{log.timestamp}</strong>: {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VoicePermissionDebug;
*/