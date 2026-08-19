import { clips } from '@/shared/data/clip';
import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { Search } from 'lucide-react'; 

export const Route = createFileRoute('/test/videos')({
  component: VideoList,
})

interface ResultItem {
	id: number;
	title: string;
	youtubeId: string;
	start: number;
	end: number;
	content: string;
	word: string;
}

const VideoListItem = (video: ResultItem) => {

	const startTime = video.start;
	const endTime = video.start == video.end ? video.start + 1 : video.end;

  const opts: YouTubeProps['opts'] = {
    width: '100%', 
    height: '200', 
    playerVars: { start: startTime, end: endTime, autoplay: 0 },
  };

	const playerRef = useRef(null);

  const onReady = (event: any) => {
    playerRef.current = event.target;
  };

  const onPlayerStateChange = (event: any) => {
    // event.data 값: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 video cued
    if (event.data === 0) {
      const player = event.target;
      player.seekTo(video.start);
			player.pauseVideo();
    }
  };

	const highlightKeyword = (text: string, keyword: string) => {
		if (!keyword || !text) {
			return [text];
		}

		const regex = new RegExp(`(${keyword})`, 'gi');
		const parts = text.split(regex);

		const result = parts.map((part, index) => {
			if (part.toLowerCase() === keyword.toLowerCase()) {
				return <span key={index} className="font-extrabold text-[#000]">{part}</span>;
			}
			
			return part;
		});
		return <div>{result}</div>
	};

  return (
    <div className="mb-[20px] p-[10px] border-1 border-[#ccc] rounded-[8px]">
      {/* <p className="text-[12px] text-[#555] mb-[5px]">
        재생 구간: **{video.start}초** ~ **{video.end}초**
      </p> */}
      
      <YouTube 
        videoId={video.youtubeId} 
        opts={opts}
				onReady={onReady} 
        onStateChange={onPlayerStateChange}
      />
      
      <div className="mt-[10px] text-[16px] text-[#777]">{highlightKeyword(video.content, video.word)}</div>
			{/* <div className="text-[12px]">{video.title}</div> */}
    </div>
  );
};

function VideoList() {
	const [results, setResults] = useState<ResultItem[]>([]);

  const timeStringToSeconds = (time: string) => {
		if (typeof time !== 'string') return 0;

		const s = time.trim();
		if (s.length === 0) return 0;

		const parts = s.split(':').map(p => p.trim());

		if (parts.some(p => p === '')) return 0;

		const reversed = parts.slice().reverse();
		let seconds = 0;
		for (let i = 0; i < reversed.length; i++) {
			const part = reversed[i];
			if (!/^\d+(\.\d+)?$/.test(part)) return 0;

			const value = Number(part);
			if (!isFinite(value) || value < 0) return 0;

			if (i === 0) seconds += value; 
			else if (i === 1) seconds += value * 60;
			else if (i === 2) seconds += value * 3600;
			else return 0;
		}
		return seconds;
	}

	const searchScript = (word: string) => {
		if (!word) return;
    if (!word.trim() || word.length < 2) {
      setResults([]);
      return;
    }

    const searchResults: ResultItem[] = [];

    clips.forEach(video => {
      const lines = video.script.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 현재 줄에 검색어가 포함되어 있는지 확인
        if (line.includes(word)) {
          // 타임스탬프 형식인지 확인 (숫자:숫자 형태)
          const isTimestamp = /^\d+:\d+$/.test(line.trim());
          
          if (!isTimestamp) {
            // 이전 줄(시작 타임스탬프)과 다음 줄(종료 타임스탬프) 찾기
            let startTime = '';
            let endTime = '';
            
            // 이전 줄에서 타임스탬프 찾기
            for (let j = i - 1; j >= 0; j--) {
              if (/^\d+:\d+$/.test(lines[j].trim())) {
                startTime = lines[j].trim();
                break;
              }
            }
            
            // 다음 줄에서 타임스탬프 찾기
            for (let j = i + 1; j < lines.length; j++) {
              if (/^\d+:\d+$/.test(lines[j].trim())) {
                endTime = lines[j].trim();
                break;
              }
            }
            
            if (startTime && endTime) {
              searchResults.push({
								id: video.index,
								title: video.title,
                youtubeId: video.youtube_id,
                start: timeStringToSeconds(startTime),
                end: timeStringToSeconds(endTime),
                content: line.trim(),
								word: word
              });
            }
          }
        }
      }
    });

		//우선순위 정렬
		const resultsWithPriority = searchResults.sort((a, b) => {
			const word = a.word;

			const aContent = a.content;
			const bContent = b.content;

			// 우선순위 점수 계산 함수
			const getPriority = (text: string) => {
				const lower = text.toLowerCase();
				const target = word.toLowerCase();

				// 1) 시작 부분 일치
				if (lower.startsWith(target)) return 1;

				// 2) 완전 동일 단어 (띄어쓰기 기준)
				const words = lower.split(/\s+/);
				if (words.includes(target)) return 2;

				// 3) 부분 포함
				if (lower.includes(target)) return 3;

				return 999;
			};

			const pA = getPriority(aContent);
			const pB = getPriority(bContent);

			if (pA !== pB) return pA - pB;

			return aContent.length - bContent.length;
		});

		setResults(resultsWithPriority);
  };

  return (
    <div 
			className={`h-full flex flex-col max-w-[600px]`}>
			<div className="sticky top-0 p-[10px] bg-white border-b-1 border-[#efefef]">
				<input
					type="text"
					onChange={(e) => searchScript(e.target.value)}
					placeholder="Type an expression to search…"
					className="w-full px-2 py-1 border border-gray-300 rounded-[5px] focus focus:outline-none focus:ring-1 focus:ring-[#4396F4]"
				/>
			</div>
			<div className="flex-1 p-[10px]">
				{results.length < 1 && (
					<div className="h-full flex flex-col justify-center items-center mt-[-30px]">
						<Search size="120px" color="#ddd"/>
						<div className="text-center mt-[20px]">
							Search for the expression<br />you want to learn
						</div>
					</div>
				)}
				{results.slice(0,10).map(item => {
					return <VideoListItem key={item.id} {...item} />
				})}
			</div>
    </div>
  );
};
