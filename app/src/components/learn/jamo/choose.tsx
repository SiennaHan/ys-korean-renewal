/**
 * 자모 — 듣고 맞는 것 고르기
 *
 * 구 경로 /book/chapter/unit/listen/$code 에서 옮겨 왔다.
 * 그쪽은 리다이렉트만 남는다.
 *
 * 2026-08-24: 라우트에서 컴포넌트로 옮겼다. 자모는 /learn/jamo 한 라우트가
 * sub 로 갈라 이 컴포넌트들을 부른다 — URL 에서 콘텐츠 ID 를 걷어냈다.
 * moduleCode 는 주소 (과·묶음·활동) 에서 풀어 받는다 — shared/data/jamo.ts
 */
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	AudioRow,
	Choice,
	ChoiceList,
	Dock,
	FeedbackMessage,
	PrimaryButton,
	ProblemCard,
} from "@/components/main/activity";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { SpeakerIcon } from "@/assets/icons";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { ProblemHeader } from "@/components/problem/scene/header";
import { ModuleTitle } from "@/components/problem/scene/title";
import { env } from "@/config/env";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { problems } from "@/shared/data/problem";
import { units } from "@/shared/data/unit";
import type { ModuleType, ProblemType } from "@/types/book.types";
import clsx from "clsx";
import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const baseButton =
	"w-full max-w-[500px] h-[56px] bg-[#4396F4] text-white rounded-[10px] flex items-center justify-center cursor-pointer \
										hover:bg-[#4396F4dd] active:bg-[#4396F4cc] \
										disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-[#bbb] disabled:hover:bg-[#bbb]";
const baseCardButton =
	"h-[96px] rounded-[12px] bg-[#F9FAFC] text-[24px] text-[#24425F] font-bold flex items-center justify-center cursor-pointer \
												hover:bg-gray-100 active:bg-gray-200 disabled:text-[#bbb] disabled:shadow-none disabled:opacity-70 \
												disabled:border-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:hover:bg-gray-100";
const selectedCardButton = "!bg-[#359AFF] !text-white";

export default function JamoChoose({ moduleCode }: { moduleCode: string }) {
	const code = moduleCode;
	const router = useRouter();
	const { t } = useTranslation();

	const sound = useSoundEffects();

	const module: ModuleType | undefined = modules.find(
		(item) => item.code === code,
	);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);
	const problemList = problems.filter(
		(item) => item.module_code === code && item.scene_num === 1,
	);

	const [problemIndex, setProblemIndex] = useState(0);
	const [problem, setProblem] = useState<ProblemType | undefined>(undefined);
	const [word, setWord] = useState<string | undefined>(undefined);

	const [wordList, setWordList] = useState<string[]>([]);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState<undefined | string>(undefined);

	const [isLastPage, setIsLastPage] = useState(false);

	const [incorrectSlots, setIncorrectSlots] = useState<boolean[]>([
		false,
		false,
		false,
		false,
	]);
	const [isDisabled, setIsDisabled] = useState(true);
	const [isExit, setIsExit] = useState(false);

	const exit = () => {
		router.history.back();
	};

	const next = () => {
		// 맞았습니다 출력 후 1초 딜레이 후

		setIsDisabled(true);

		setTimeout(() => {
			if (problemIndex < problemList.length - 1) {
				setProblemIndex(problemIndex + 1);
			} else {
				setIsExit(true);
			}
		}, 1000);
	};

	const setIncorrect = (picked: string) => {
		const wordIndex = wordList?.indexOf(picked) ?? -1;

		setIncorrectSlots((prevSlots) => {
			const newSlots = [...prevSlots];
			newSlots[wordIndex] = true;
			return newSlots;
		});
		setIsDisabled(true);
		setWord(undefined);
	};

	const init = () => {
		setWord(undefined);
		setIncorrectSlots([false, false, false, false]);
	};

	/*
	 * 고르면 바로 채점한다. 예전에는 고른 뒤 "정답 확인"을 한 번 더 눌러야 했는데,
	 * 목업과 다른 활동 전부가 한 번 누르면 결과가 나오는 방식이라 여기도 맞췄다.
	 */
	const selectWord = (picked: string) => {
		sound.playClick();
		setWord(picked);
		if (picked === problem?.answer_1) {
			sound.playCorrect();
			next();
		} else {
			sound.playIncorrect();
			setIncorrect(picked);
		}
	};

	const play = () => {
		if (audioRef.current) {
			audioRef.current.play().catch((error) => {
				console.error("Audio playback failed:", error);
			});
		}
	};

	/*
	 * 문항이 바뀔 때만 도는 효과다(소리도 여기서 한 번 자동 재생한다).
	 * 빠졌다는 셋 다 넣으면 안 된다:
	 * - init 은 컴포넌트 안에서 매 렌더 새로 만들어지는 함수이고, 이 효과는 몸통에서
	 *   setState 를 부른다 — 넣으면 매 렌더마다 다시 돌아 무한 렌더가 되고
	 *   자동 재생도 매 렌더마다 다시 걸린다
	 * - problemList 는 모듈 상수 problems 를 걸러 만든 목록이라 code 가 그대로면
	 *   내용도 그대로다. 방아쇠는 problemIndex 하나가 맞다
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 위 주석 — 문항 전환 1회 + 자동 재생, init 은 매 렌더 새 함수
	useEffect(() => {
		init();
		const _problem = problemList[problemIndex];
		setProblem(_problem);
		if (_problem) {
			const _wordList = _problem.choice_1.split(",").map((item) => item.trim());
			setWordList(_wordList);
			const _audioSrc = `${env.RES_URL_ROOT}/${_problem.content_sound}`;
			setAudioSrc(_audioSrc);

			setTimeout(() => {
				audioRef.current?.play();
			}, 1000);
		}
		setWord(undefined);
		if (problemIndex === problemList.length - 1) setIsLastPage(true);
	}, [problemIndex]);

	// 묶음 이름만 — unit.title 은 "모음 1:ㅏ,ㅓ,ㅗ" 처럼 음절이 붙어 있다
	const groupName = (unit?.title ?? "").split(":")[0].trim();
	const lesson = [
		t("catalog.chapterSeq", { seq: chapter?.seq ?? 1 }),
		groupName,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={exit} />
			<ActivityProgress
				current={problemIndex}
				total={problemList.length}
				onJump={setProblemIndex}
			/>

			<ActivityBody
				feedback={
					incorrectSlots.some(Boolean) ? <FeedbackMessage kind="wrong" /> : null
				}
			>
				<ProblemCard instruction={t("activity.instrJamoListen")}>
					<AudioRow
						label={t("player.playAudio")}
						sub={t("activity.audioSub")}
						onPlay={play}
					/>
				</ProblemCard>

				<ChoiceList variant="jamo">
					{wordList.map((item, idx) => (
						<Choice
							key={item}
							index={idx}
							// 맞을 때까지 다시 고르는 화면이라 틀린 것이 여럿 남는다
							state={incorrectSlots[idx] ? "wrong" : ""}
							onClick={() => selectWord(item)}
						>
							{item}
						</Choice>
					))}
				</ChoiceList>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={isExit ? t("player.showResult") : t("player.next")}
						on={isExit}
						action="next"
						onClick={exit}
					/>
				</Dock>
			</ActivityFooter>

			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio className="hidden" src={audioSrc} ref={audioRef} />
		</ActivityFrame>
	);
}
