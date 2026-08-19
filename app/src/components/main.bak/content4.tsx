import { clips } from '@/shared/data/clip';
import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { Search } from 'lucide-react'; 
import {listReport, createReport} from '@/api/report';
import { getGuestId } from '@/api/api';

const CATEGORY = 'video';

interface ClipItem {
  index: number;
  youtube_id: string;
  link: string;
  title: string;
  script: string;
}

interface ResultItem {
	id: number;
	title: string;
	youtubeId: string;
	start: number;
	end: number;
	content: string;
	word: string;
}

const errorIds: string[] = []

const VideoListItem = (video: ResultItem) => {

	const tempTime = video.start - 2;
  const startTime = tempTime < 0 ? 0 : tempTime;
	const endTime = video.start == video.end ? video.start + 1 : video.end;
  const opts: YouTubeProps['opts'] = {
    width: '100%', 
    height: '200', 
    playerVars: { 
      start: startTime, 
      end: endTime, 
      autoplay: 0,
      playsinline: 1
    },
  };

	const playerRef = useRef<YouTubePlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
  };

  const onError = async (event: YouTubeEvent) => {
    const errorCode = event.data; 
    let errorMsg = '';
    switch (errorCode) {
      case 2:
        errorMsg = '잘못된 동영상 ID 형식입니다.';
        break;
      case 5:
        errorMsg = 'HTML5 플레이어 오류입니다.';
        break;
      case 100:
        errorMsg = '동영상을 찾을 수 없거나 비공개 설정되었습니다.';
        break;
      case 101:
      case 150:
        errorMsg = '동영상 소유자가 임베딩을 허용하지 않습니다.';
        break;
      default:
        errorMsg = '알 수 없는 재생 오류가 발생했습니다.';
    }

    if (errorCode) 
      await reportError(errorCode, errorMsg);

    console.error('YouTube 재생 오류:', errorCode);
  };

  const reportError = async (errorCode:string, errorMsg: string) => {
    if (errorIds.includes(video.youtubeId)) return;

    errorIds.push(video.youtubeId);
    const userId = getGuestId();

    const request = {
        category: CATEGORY,
        target_id : video.youtubeId,
        error_code: `${errorCode}`,
        error_msg: errorMsg,
        user_id: userId
      }
      await createReport(request)
  }

  const onPlayerStateChange = (event: any) => {
    // event.data 값: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 video cued
    if (event.data === 0) {
      const player = event.target;
      player.seekTo(video.start);
    }
  };

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting && playerRef.current) {
						playerRef.current.pauseVideo();
					}
				});
			},
			{
				threshold: 0.5, // 50% 이상 보일 때를 기준으로 함
				rootMargin: '0px' // 여백 없음
			}
		);

		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => {
			if (containerRef.current) {
				observer.unobserve(containerRef.current);
			}
		};
	}, []);

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
    <div ref={containerRef} className="p-[10px]">
      <YouTube videoId={video.youtubeId} opts={opts}
				onReady={onReady} onError={onError} onStateChange={onPlayerStateChange}
      />
      
      <div className="mt-[10px] text-[16px] text-[#777]">{highlightKeyword(video.content, video.word)}</div>
			<div className="text-[12px]">{video.title}</div>
    </div>
  );
};

// Tab4 컴포넌트 외부에 정의
const SearchInputWithIconTailwind = ({
  searchWord,
  onSearchChanged,
}: {
  searchWord: string;
  onSearchChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <input
        type="text"
        className="w-full bg-white border border-white rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        value={searchWord}
        onChange={onSearchChanged}
        placeholder="Type an expression to search…"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
    </div>
  );
};

export default function Content4() {
	const [searchWord, setSearchWord] = useState('');
	const [results, setResults] = useState<ResultItem[]>([]);
  const [filteredClips, setFilteredClips] = useState<ClipItem[]>([]);

	const onSearchChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
		const word = e.target.value;
		setSearchWord(word);
		searchScript(word);
	}

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
		console.log("word", word)
		if (!word) return;
    if (!word.trim() || word.length < 2) {
      setResults([]);
      return;
    }

    const searchResults: ResultItem[] = [];

    filteredClips.forEach(video => {
      const lines = video.script.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes(word)) {
          const isTimestamp = /^\d+:\d+$/.test(line.trim());
          
          if (!isTimestamp) {
            let startTime = '';
            let endTime = '';
            
            for (let j = i - 1; j >= 0; j--) {
              if (/^\d+:\d+$/.test(lines[j].trim())) {
                startTime = lines[j].trim();
                break;
              }
            }
            
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

  useEffect(() => {
    const fetch = async () => {
      const reportedList = await listReport(CATEGORY);
      if (reportedList.length > 0) {
        const reportedIds = reportedList.map(item=>item.target_id)
        const excludeReported = clips.filter(item=> !reportedIds.includes(item.youtube_id))
        setFilteredClips(excludeReported)
      } else {
        setFilteredClips(clips)
      }
    }

    fetch();
  }, [])

  return (
    <div className={`flex flex-col h-full w-full flex flex-col`}>
      <div className="h-[48px] flex px-[16px] items-center text-[20px] font-bold mt-[20px]">표현클립</div>
			<div className="w-full px-[16px]">
				<SearchInputWithIconTailwind searchWord={searchWord} onSearchChanged={onSearchChanged}/>
			</div>
			<div className="flex-1 overflow-y-auto scrollbar-hide">
				{results.length < 1 && (
					<div className="h-full flex flex-col justify-center items-center mt-[-30px]">
						<img src="/images/search_empty_img.svg" />
						<div className="text-center mt-[20px]">Search for the expression<br />you want to learn</div>
					</div>
				)}
				{results.slice(0,10).map((item, index) => {
					return <VideoListItem key={index} {...item} />
				})}
			</div>
    </div>
  );
};
