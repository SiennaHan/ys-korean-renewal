/**
 * Phase 1 — 플레이어 공통 셸 i18n 리소스 (신규 UI 문자열)
 *
 * 적용 방법: 각 언어 파일(src/i18n/locales/{en,ko,ja,zh,vi}.ts)의 최상위에
 *            아래 `player` / `result` / `review` / `state` 키를 추가한다. 기존 키는 건드리지 않는다.
 *
 * v2 (2026-08-14) — S1~S3 확정으로 14키 추가 (총 44키)
 *   S1 재시도형: wellDone / tryAgain — 오답 시 정답을 공개하지 않으므로
 *               `player.answerIs`는 문항 화면이 아니라 결과 화면 해설에서만 쓴다
 *   S2 언어 규칙: playAudio / viewMission / eraseAll / undo / done / drawWithFinger
 *               — 화면에 하드코딩돼 있던 한국어·영어를 전부 UI 언어로 돌린다
 *               ※ 한/영 병기는 폐지됐다. 학습 대상(문항·선택지·지문)만 한국어 고정이고
 *                 나머지는 전부 UI 언어 한 줄이다. 활동 지시문도 여기 포함되며,
 *                 지시문 문자열은 이 파일이 아니라 콘텐츠의 instruction_* 컬럼에서 온다.
 *                 그 결과 Title 영역이 2줄(68px) → 1줄(48px)로 줄었다.
 *   S3 앱바 규칙: lessonTitle — 앱바는 `{급} {과}`만. 과 제목·학습 대상은 넣지 않는다
 *   그 외: showResult(마지막 문항 후 버튼) · result.wrongItem/explanation/showMore/hardItem
 *
 * 원칙 (G2 §9-b)
 *  1. 시스템 구조를 설명하지 않는다 — "큐/상태/세션" 같은 내부 용어 금지
 *  2. 문항마다 토스트를 띄우지 않는다 — 결과 화면에서 한 번만 집계해 말한다
 *  3. 숫자로 말한다 — "복습이 필요해요"(모호) 대신 "다시 풀 문제 3개"
 *  4. 기본 언어는 en. 한국어는 5개 중 하나일 뿐이다
 *
 * ⚠ 번역 초안 — 원어민 검수 필요 (특히 practice/review 뉘앙스)
 */

// ─────────────────────────────── en (기본)
export const player_en = {
  player: {
    exit: "Exit",
    skip: "Skip",
    next: "Next",
    progress: "{{current}} / {{total}}",
    correctCount: "Correct: {{count}}",
    answerIs: "The answer is {{answer}}",
    // 접근성 — 진행 표시 aria-label (G2 §8)
    a11ySegment: "Question {{index}}, {{state}}",
    a11yStateCorrect: "correct",
    a11yStateWrong: "incorrect",
    a11yStateUnanswered: "not answered",
    // S1~S3 확정 반영 (2026-08-14)
    lessonTitle: "Level {{level}} Lesson {{lesson}}",
    showResult: "See results",
    wellDone: "Nice!",
    tryAgain: "Try again",
    playAudio: "Listen",
    viewMission: "Missions",
    eraseAll: "Erase all",
    undo: "Undo",
    done: "Done",
    drawWithFinger: "Draw the character with your finger.",

    // 발음(STT)·자모 쓰기 화면 — v2 추가
    confirm: "Check",
    recordHint: "Tap to record",
    recordListening: "Listening…",
    recordRetry: "Record again",
    heard: "We heard",
    tipQuiet: "Find a quiet spot",
    tipLouder: "Try speaking louder",
    canSkipHint: "Having trouble? You can skip this one and come back later.",
  },
  result: {
    title: "Done!",
    accuracy: "{{correct}} of {{total}} correct",
    perfect: "All correct. Nice work!",
    toPractice: "{{count}} to practice again",
    practiceAgain: "Practice again",
    nextActivity: "Next activity",
    backToLessons: "Back to lessons",
    // 결과 화면 오답 목록
    wrongItem: "Incorrect {{index}}",
    explanation: "Explanation {{index}}",
    showMore: "Show more",
    hardItem: "Often missed",

    // 통계 카드 2개 — 주 진행률 / 부 정답률(없으면 "—")
    kAnswered: "Answered",
    kAccuracy: "Accuracy",
    allAnswered: "All {{total}} answered",
  },
  review: {
    homeCardTitle: "Practice again",
    homeCardBody: "{{count}} questions waiting",
    homeCardEmpty: "Nothing to practice right now",
    sessionTitle: "Practice again",
    sessionDone: "All caught up!",
  },
  // 화면 상태 (G2 §7)
  state: {
    loading: "Loading…",
    loadFailed: "Couldn't load this activity.",
    retry: "Try again",
    audioPreparing: "Audio is being prepared.",
    micDenied: "Microphone access is off. You can turn it on in your browser settings.",
    micDeniedSkip: "Skip this activity",
    recordAgain: "Please say that again.",
    exitConfirmChat: "Your conversation will start over. Leave anyway?",
  },
};

// ─────────────────────────────── ko
export const player_ko = {
  player: {
    exit: "나가기",
    skip: "건너뛰기",
    next: "다음",
    progress: "{{current}} / {{total}}",
    correctCount: "맞은 개수 {{count}}",
    answerIs: "정답은 {{answer}}예요",
    a11ySegment: "{{index}}번 문항, {{state}}",
    a11yStateCorrect: "정답",
    a11yStateWrong: "오답",
    a11yStateUnanswered: "안 푼 문항",
    // S1~S3 확정 반영 (2026-08-14)
    lessonTitle: "{{level}}급 {{lesson}}과",
    showResult: "결과 보기",
    wellDone: "아주 잘 했어요!",
    tryAgain: "다시 해보세요",
    playAudio: "발음 듣기",
    viewMission: "미션 보기",
    eraseAll: "전체 지우기",
    undo: "되돌리기",
    done: "완료",
    drawWithFinger: "손가락으로 따라 쓰세요.",

    // 발음(STT)·자모 쓰기 화면 — v2 추가
    confirm: "확인",
    recordHint: "눌러서 녹음",
    recordListening: "듣고 있어요…",
    recordRetry: "다시 녹음",
    heard: "이렇게 들렸어요",
    tipQuiet: "조용한 곳에서 말해 보세요",
    tipLouder: "조금 더 크게 말해 보세요",
    canSkipHint: "잘 안 되나요? 건너뛰고 나중에 다시 만날 수 있어요.",
  },
  result: {
    title: "다 했어요!",
    accuracy: "{{total}}개 중 {{correct}}개 맞았어요",
    perfect: "다 맞았어요. 잘했어요!",
    toPractice: "다시 풀 문제 {{count}}개",
    practiceAgain: "다시 풀기",
    nextActivity: "다음 활동",
    backToLessons: "과 목록으로",
    // 결과 화면 오답 목록
    wrongItem: "오답 {{index}}",
    explanation: "해설 {{index}}",
    showMore: "더보기",
    hardItem: "자주 틀려요",

    // 통계 카드 2개 — 주 진행률 / 부 정답률(없으면 "—")
    kAnswered: "푼 문항",
    kAccuracy: "정답률",
    allAnswered: "{{total}}개 다 풀었어요",
  },
  review: {
    homeCardTitle: "다시 풀기",
    homeCardBody: "{{count}}문제가 기다리고 있어요",
    homeCardEmpty: "지금은 다시 풀 문제가 없어요",
    sessionTitle: "다시 풀기",
    sessionDone: "다 풀었어요!",
  },
  state: {
    loading: "불러오는 중…",
    loadFailed: "활동을 불러오지 못했어요.",
    retry: "다시 시도",
    audioPreparing: "소리를 준비 중이에요.",
    micDenied: "마이크가 꺼져 있어요. 브라우저 설정에서 켤 수 있어요.",
    micDeniedSkip: "이 활동 건너뛰기",
    recordAgain: "다시 말해 주세요.",
    exitConfirmChat: "대화가 처음부터 시작돼요. 나갈까요?",
  },
};

// ─────────────────────────────── ja
export const player_ja = {
  player: {
    exit: "終了",
    skip: "スキップ",
    next: "次へ",
    progress: "{{current}} / {{total}}",
    correctCount: "正解 {{count}}",
    answerIs: "正解は {{answer}} です",
    a11ySegment: "{{index}}番の問題、{{state}}",
    a11yStateCorrect: "正解",
    a11yStateWrong: "不正解",
    a11yStateUnanswered: "未回答",
    // S1~S3 확정 반영 (2026-08-14)
    lessonTitle: "{{level}}級 {{lesson}}課",
    showResult: "結果を見る",
    wellDone: "よくできました！",
    tryAgain: "もう一度",
    playAudio: "発音を聞く",
    viewMission: "ミッション",
    eraseAll: "すべて消す",
    undo: "元に戻す",
    done: "完了",
    drawWithFinger: "指でなぞって書いてください。",

    // 발음(STT)·자모 쓰기 화면 — v2 추가
    confirm: "確認",
    recordHint: "タップして録音",
    recordListening: "聞いています…",
    recordRetry: "もう一度録音",
    heard: "こう聞こえました",
    tipQuiet: "静かな場所で話してみましょう",
    tipLouder: "もう少し大きく話してみましょう",
    canSkipHint: "うまくいきませんか？スキップして後でもう一度できます。",
  },
  result: {
    title: "終わりました！",
    accuracy: "{{total}}問中 {{correct}}問 正解",
    perfect: "全問正解です。よくできました！",
    toPractice: "もう一度 {{count}}問",
    practiceAgain: "もう一度",
    nextActivity: "次の活動",
    backToLessons: "課の一覧へ",
    // 결과 화면 오답 목록
    wrongItem: "不正解 {{index}}",
    explanation: "解説 {{index}}",
    showMore: "もっと見る",
    hardItem: "よく間違えます",

    // 통계 카드 2개 — 주 진행률 / 부 정답률(없으면 "—")
    kAnswered: "解いた問題",
    kAccuracy: "正答率",
    allAnswered: "{{total}}問すべて解きました",
  },
  review: {
    homeCardTitle: "もう一度",
    homeCardBody: "{{count}}問 残っています",
    homeCardEmpty: "今はもう一度解く問題がありません",
    sessionTitle: "もう一度",
    sessionDone: "全部終わりました！",
  },
  state: {
    loading: "読み込み中…",
    loadFailed: "活動を読み込めませんでした。",
    retry: "再試行",
    audioPreparing: "音声を準備しています。",
    micDenied: "マイクがオフになっています。ブラウザの設定でオンにできます。",
    micDeniedSkip: "この活動をスキップ",
    recordAgain: "もう一度話してください。",
    exitConfirmChat: "会話は最初から始まります。終了しますか？",
  },
};

// ─────────────────────────────── zh
export const player_zh = {
  player: {
    exit: "退出",
    skip: "跳过",
    next: "下一个",
    progress: "{{current}} / {{total}}",
    correctCount: "答对 {{count}}",
    answerIs: "正确答案是 {{answer}}",
    a11ySegment: "第{{index}}题，{{state}}",
    a11yStateCorrect: "答对",
    a11yStateWrong: "答错",
    a11yStateUnanswered: "未作答",
    // S1~S3 확정 반영 (2026-08-14)
    lessonTitle: "{{level}}级 第{{lesson}}课",
    showResult: "查看结果",
    wellDone: "很棒！",
    tryAgain: "再试一次",
    playAudio: "听发音",
    viewMission: "查看任务",
    eraseAll: "全部清除",
    undo: "撤销",
    done: "完成",
    drawWithFinger: "用手指跟着写。",

    // 발음(STT)·자모 쓰기 화면 — v2 추가
    confirm: "确认",
    recordHint: "点击录音",
    recordListening: "正在聆听…",
    recordRetry: "重新录音",
    heard: "听到的是",
    tipQuiet: "请在安静的地方说",
    tipLouder: "请说得再大声一点",
    canSkipHint: "写不好吗？可以跳过，稍后再练。",
  },
  result: {
    title: "完成了！",
    accuracy: "{{total}}题中答对{{correct}}题",
    perfect: "全部答对，做得好！",
    toPractice: "{{count}}题待练习",
    practiceAgain: "再练习",
    nextActivity: "下一个活动",
    backToLessons: "返回课程列表",
    // 결과 화면 오답 목록
    wrongItem: "错题 {{index}}",
    explanation: "解析 {{index}}",
    showMore: "展开更多",
    hardItem: "经常做错",

    // 통계 카드 2개 — 주 진행률 / 부 정답률(없으면 "—")
    kAnswered: "已完成",
    kAccuracy: "正确率",
    allAnswered: "{{total}}题全部完成",
  },
  review: {
    homeCardTitle: "再练习",
    homeCardBody: "还有{{count}}题",
    homeCardEmpty: "现在没有需要再练习的题",
    sessionTitle: "再练习",
    sessionDone: "全部完成！",
  },
  state: {
    loading: "加载中…",
    loadFailed: "无法加载该活动。",
    retry: "重试",
    audioPreparing: "正在准备语音。",
    micDenied: "麦克风未开启。可在浏览器设置中开启。",
    micDeniedSkip: "跳过此活动",
    recordAgain: "请再说一次。",
    exitConfirmChat: "对话将从头开始。要退出吗？",
  },
};

// ─────────────────────────────── vi
export const player_vi = {
  player: {
    exit: "Thoát",
    skip: "Bỏ qua",
    next: "Tiếp theo",
    progress: "{{current}} / {{total}}",
    correctCount: "Đúng: {{count}}",
    answerIs: "Đáp án là {{answer}}",
    a11ySegment: "Câu {{index}}, {{state}}",
    a11yStateCorrect: "đúng",
    a11yStateWrong: "sai",
    a11yStateUnanswered: "chưa trả lời",
    // S1~S3 확정 반영 (2026-08-14)
    lessonTitle: "Cấp {{level}} Bài {{lesson}}",
    showResult: "Xem kết quả",
    wellDone: "Rất tốt!",
    tryAgain: "Thử lại",
    playAudio: "Nghe phát âm",
    viewMission: "Xem nhiệm vụ",
    eraseAll: "Xóa tất cả",
    undo: "Hoàn tác",
    done: "Xong",
    drawWithFinger: "Dùng ngón tay viết theo.",

    // 발음(STT)·자모 쓰기 화면 — v2 추가
    confirm: "Kiểm tra",
    recordHint: "Nhấn để ghi âm",
    recordListening: "Đang nghe…",
    recordRetry: "Ghi âm lại",
    heard: "Chúng tôi nghe được",
    tipQuiet: "Hãy nói ở nơi yên tĩnh",
    tipLouder: "Hãy nói to hơn một chút",
    canSkipHint: "Chưa được? Bạn có thể bỏ qua và luyện lại sau.",
  },
  result: {
    title: "Hoàn thành!",
    accuracy: "Đúng {{correct}}/{{total}} câu",
    perfect: "Đúng hết. Làm tốt lắm!",
    toPractice: "{{count}} câu cần luyện lại",
    practiceAgain: "Luyện lại",
    nextActivity: "Hoạt động tiếp theo",
    backToLessons: "Về danh sách bài",
    // 결과 화면 오답 목록
    wrongItem: "Câu sai {{index}}",
    explanation: "Giải thích {{index}}",
    showMore: "Xem thêm",
    hardItem: "Hay sai",

    // 통계 카드 2개 — 주 진행률 / 부 정답률(없으면 "—")
    kAnswered: "Đã làm",
    kAccuracy: "Tỉ lệ đúng",
    allAnswered: "Đã làm cả {{total}} câu",
  },
  review: {
    homeCardTitle: "Luyện lại",
    homeCardBody: "Còn {{count}} câu",
    homeCardEmpty: "Hiện chưa có câu nào cần luyện lại",
    sessionTitle: "Luyện lại",
    sessionDone: "Đã hoàn thành tất cả!",
  },
  state: {
    loading: "Đang tải…",
    loadFailed: "Không tải được hoạt động này.",
    retry: "Thử lại",
    audioPreparing: "Đang chuẩn bị âm thanh.",
    micDenied: "Micro đang tắt. Bạn có thể bật trong cài đặt trình duyệt.",
    micDeniedSkip: "Bỏ qua hoạt động này",
    recordAgain: "Vui lòng nói lại.",
    exitConfirmChat: "Cuộc hội thoại sẽ bắt đầu lại từ đầu. Bạn muốn thoát?",
  },
};
