import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { flashcards } from '@/shared/data/flashcard';

export const Route = createFileRoute('/test/flashcard')({
  component: Flashcard,
})

interface FlashcardData {
  unit_id: number;
  module_id: number;
  module_code: string;
  id: string;
  word: string;
  meaning: string;
  image: string;
}

function Flashcard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownWords, setKnownWords] = useState<string[]>([]);
  const [unknownWords, setUnknownWords] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // NOTE: 스크래치/프로토타입 페이지. `flashcards`는 카드가 아닌 덱 목록 데이터라
  // FlashcardData 형태와 맞지 않음(placeholder). 실제 카드 데이터 연동 전까지 캐스팅 유지.
  const cardData = flashcards as unknown as FlashcardData[]

  const currentCard = cardData[currentIndex];
  const progress = ((currentIndex + 1) / cardData.length) * 100;

  const handleKnown = () => {
    setKnownWords([...knownWords, currentCard.id]);
    moveToNext();
  };

  const handleUnknown = () => {
    setUnknownWords([...unknownWords, currentCard.id]);
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < cardData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setKnownWords([]);
    setUnknownWords([]);
    setShowResult(false);
    setIsFlipped(false);
  };

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(currentCard.word);
    utterance.lang = 'ko-KR';
    speechSynthesis.speak(utterance);
  };

  if (showResult) {
    const percentage = Math.round((knownWords.length / cardData.length) * 100);
    
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <button onClick={handleRestart} className="text-gray-400 hover:text-gray-600">✕</button>
          <span className="text-gray-500 text-sm">4과 추가 단어</span>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">잘했어요! 거의 다 왔어요.</h2>
          <p className="text-gray-600 mb-2">아직 익히지 못한 단어들이 있어요.</p>
          <p className="text-gray-600">한번 더 복습해 볼까요?</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="#E5E7EB" strokeWidth="16" fill="none" />
              <circle cx="96" cy="96" r="88" stroke="#3B82F6" strokeWidth="16" fill="none" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`} strokeDashoffset={`${2 * Math.PI * 88 * (1 - percentage / 100)}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-blue-500">{percentage}%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="flex items-center gap-2 bg-blue-50 rounded-full px-4 py-2">
            <span className="text-sm text-gray-600">아는 단어</span>
            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">
              {knownWords.length}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <span className="text-sm text-gray-600">모르는 단어</span>
            <span className="bg-gray-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">
              {unknownWords.length}
            </span>
          </div>
        </div>

        <button onClick={handleRestart}
          className="w-full bg-blue-500 text-white py-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors">한 번 더 하기</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex justify-between items-center mb-1">
        <button className="text-gray-400 hover:text-gray-600">✕</button>
        <span className="text-gray-500 text-sm">4과 추가 단어</span>
      </div>

      <div 
        className="flex-1 relative mb-1 cursor-pointer p-5 h-[600px]"
        onClick={() => setIsFlipped(!isFlipped)} style={{ perspective: '1000px'}}
      >
        <div 
          className="relative w-full transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'}}>
          {/* 앞면 - 한글만 */}
          <div
            className="flex flex-col justify-between h-[500px] bg-white rounded-2xl border-2 border-gray-100 p-8"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden'}}>
            <button onClick={(e) => { e.stopPropagation(); playAudio(); }}
              className="mb-6 text-blue-500 hover:text-blue-600"><Volume2 size={24} /></button>

            <h1 className="text-5xl font-bold text-center mb-32">{currentCard.word}</h1>
            
            <p className="text-center text-gray-400 mt-6">{currentIndex + 1}/{cardData.length}</p>
          </div>

          {/* 뒷면 - 한글 + 영어 + 이미지 */}
          <div 
            className="flex flex-col justify-between h-[500px] absolute top-0 left-0 w-full bg-white rounded-2xl border-2 border-gray-100 p-8"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div>
              <button onClick={(e) => { e.stopPropagation(); playAudio(); }}
                className="mb-6 text-blue-500 hover:text-blue-600">
                <Volume2 size={24} />
              </button>
              <h1 className="text-5xl font-bold text-center mb-4">{currentCard.word}</h1>
              <p className="text-2xl text-center text-gray-700 mb-6">{currentCard.meaning}</p>
              {currentCard.image && (
                <div className="h-32 rounded-xl overflow-hidden">
                  <img src={currentCard.image} alt={currentCard.word} className="w-full h-full object-contain"/>
                </div>
              )}
            </div>

            <p className="text-center text-gray-400 mt-6">{currentIndex + 1}/{cardData.length}</p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 h-[80px] flex gap-10 justify-center items-center">
        <button className="w-[32px] h-[20px] rounded-full bg-[#ddd] flex items-center justify-center text-[12px] hover:bg-gray-200 transition-colors">{unknownWords.length}</button>
        <div className="flex gap-4">
          <button onClick={handleUnknown} className="w-14 h-14 rounded-full bg-gray-500 flex items-center justify-center text-white text-[30px] font-600 hover:bg-gray-400 transition-colors cursor-pointer">?</button>
          <button onClick={handleKnown} className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors cursor-pointer"><Check size={28} strokeWidth={3}/></button>
        </div>
        <button className="w-[32px] h-[20px] rounded-full bg-[#B9DAFF] flex items-center justify-center text-[12px] hover:bg-gray-200 transition-colors">{knownWords.length}</button>
      </div>
    </div>
  );
};
