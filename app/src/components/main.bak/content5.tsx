import { useCallback, useState } from "react";
import { Item } from "./mypage/item";
import ItemCard from "./mypage/item-card";
import { User } from 'lucide-react';
export default function Content5() {

	const mockItems: Item[] = [
		{ id: '1', category: '연세한국어', icon: 'thermometer', description: '11 books', isOn: true, color: 'light' },
		{ id: '2', category: '국립국어원', icon: 'camera', description: '18 books', isOn: false, color: 'dark', deviceCount: 8 },
		{ id: '3', category: '세종학당', icon: 'shield', description: '9 books', isOn: false, color: 'dark' },
		{ id: '4', category: '서울대학교', icon: 'lightbulb', description: '15 books', isOn: false, color: 'dark', deviceCount: 3 },
	];

	const mockShortcuts = ['3주 완성', '새 연세한국어', '세종학당', 'New Korean'];

	const [devices, setDevices] = useState<Item[]>(mockItems);
  const [selectedShortcut, setSelectedShortcut] = useState<string>('My home');

  // 토글 액션 핸들러
  const handleToggle = useCallback((id: string, isOn: boolean) => {
    setDevices(prev => 
      prev.map(d => (d.id === id ? { ...d, isOn } : d))
    );
  }, []);

  return <div className="h-full flex flex-col p-[20px]">
		<div className="w-full text-[16px] font-bold">My Page</div>
    <div className="flex flex-1 justify-center items-center mt-[18px] border-1 border-[#efefef] rounded-[10px] p-[10px] text-[12px] text-[#ccc]">
      no data
    </div>
  </div>

  // return (
  //   <div className="min-h-screen bg-gray-50 p-6 sm:p-8 font-sans">
  //     <header className="flex justify-between items-center mb-6 text-gray-900">
  //       <button className="text-2xl">☰</button>
  //       <div className="flex space-x-4 items-center">
  //         <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
  //           <User />
  //         </div>
  //       </div>
  //     </header>

  //     <h1 className="text-[28px] font-bold mb-8 text-gray-900">My Page</h1>
      
  //     <section className="mb-8">
  //       <h2 className="text-[16px] font-semibold mb-4 text-gray-600">Shortcuts</h2>
  //       <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
  //         {mockShortcuts.map(shortcut => (
  //           <button
  //             key={shortcut}
  //             onClick={() => setSelectedShortcut(shortcut)}
  //             className={`
  //               px-4 py-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-colors
  //               ${selectedShortcut === shortcut 
  //                 ? 'bg-gray-900 text-white shadow-md' 
  //                 : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  //               }
  //             `}
  //           >
  //             {shortcut}
  //           </button>
  //         ))}
  //       </div>
  //     </section>

  //     <section>
  //       <div className="flex justify-between items-center mb-4">
  //         <h2 className="text-[16px] font-semibold text-gray-600">Learnings</h2>
  //         <button className="text-blue-600 font-medium text-sm">+ Add a new book</button>
  //       </div>

  //       <div className="grid grid-cols-2 gap-4">
  //         {devices.map(device => (
  //           <ItemCard 
  //             key={device.id} 
  //             device={device} 
  //             onToggle={handleToggle}
  //           />
  //         ))}
  //       </div>
  //     </section>
  //   </div>
  // );
}