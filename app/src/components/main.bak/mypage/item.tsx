// src/types/Device.ts
export interface Item {
  id: string;
  category: '연세한국어' | '국립국어원' | '세종학당' | '서울대학교';
  icon: string; // 아이콘 컴포넌트 또는 URL을 위한 플레이스홀더
  description: string;
  deviceCount?: number; // CCTV, Lighting 등 기기 수
  statusValue?: string; // Climate의 온도 정보 등
  isOn: boolean;
  color: string; // 카드 배경색 (밝은/어두운)
}