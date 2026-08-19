// src/components/DeviceCard.tsx
import React from 'react';
import { Item } from './item';
// IconPlaceholder는 실제 아이콘 컴포넌트를 대체합니다.
const IconPlaceholder = ({ name, color }: { name: string, color: string }) => (
  <div className={`p-2 rounded-full ${color}`}>
    {/* 실제 아이콘 (예: <IoIosSnow />) 대신 문자열 사용 */}
    <span className="text-xl">{name.substring(0, 1)}</span> 
  </div>
);

interface ItemCardProps {
  device: Item;
  onToggle: (id: string, isOn: boolean) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ device, onToggle }) => {
  // Dark/Light 모드에 따른 동적 클래스 설정
  const isDark = device.color === 'dark';
  const bgColor = isDark ? 'bg-gray-800' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const switchColor = isDark ? 'bg-gray-700' : 'bg-gray-200';
  const iconBgColor = isDark ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <div className={`
      p-4 rounded-3xl h-48 flex flex-col justify-between 
      ${bgColor} ${textColor} shadow-lg transition-all duration-300
    `}>
      {/* Card Header: Climate Status & Toggle */}
      <div className="flex justify-between items-start">
        {/* {device.category === 'Climate' && (
          <p className="text-4xl font-light">
            {device.statusValue}
          </p>
        )} */}

        {/* **Custom Toggle Switch (Tailwind)** */}
        <button
          onClick={() => onToggle(device.id, !device.isOn)}
          className={`
            w-12 h-6 flex items-center rounded-full p-0.5 transition-colors duration-300
            ${device.isOn ? 'bg-blue-600' : switchColor}
          `}
        >
          <div className={`
            bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300
            ${device.isOn ? 'translate-x-6' : 'translate-x-0'}
          `} />
        </button>
      </div>
      
      {/* Card Body: Icon, Category, Description */}
      <div className="flex flex-col space-y-1">
        {/* Placeholder for actual icon */}
        {/* <IconPlaceholder name={device.category} color={iconBgColor} /> */}
        
        <h3 className="text-lg font-semibold mt-2">{device.category}</h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {device.description || (device.deviceCount ? `${device.deviceCount} devices` : '')}
        </p>
      </div>
    </div>
  );
};

export default ItemCard;