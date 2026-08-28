export interface ServerResponse<T> {
	result: boolean;
	code: number;
	message: string | null;
	data: T | null;
}

export interface LoginToken {
	token: string;
	user: {
		id: number;
		email: string;
		name: string;
		role: string;
		schoolCode: string | null;
		schoolName: string | null;
	};
}

export interface AdminUser {
	id: number;
	email: string;
	name: string;
	role: string;
	school_code: string | null;
	is_approved: boolean;
	is_active: boolean;
	created_at: string;
}

export interface School {
	id: number;
	school_code: string;
	school_name: string;
	class_levels: string | null;
	created_at: string;
	updated_at: string;
}

export interface ClassLevel {
	id: number;
	school_id: number;
	label: string;
	created_at: string;
	updated_at: string;
}

export interface Student {
	id: number;
	email: string;
	name: string;
	phone: string | null;
	student_number: string | null;
	class_level: string | null;
	instructor: string | null;
	school_code: string | null;
	is_active: boolean;
	created_at: string;
	/**
	 * 학교 이용 권한이 만료된 시각. NULL 이면 살아 있다.
	 *
	 * **`is_active` 와 다른 것이다.** 그 칸을 내리면 로그인 자체가 막혀서
	 * 「학기가 끝났습니다」라고 설명할 기회가 없다(`ko_user.access_ended_at` 주석).
	 */
	access_ended_at: string | null;

	/*
	 * 활동 합계와 진도. 서버가 목록에 붙여 준다(`student_business.getStudentList`).
	 *
	 * **위의 snake_case 와 섞여 있다** — 위는 `ko_user` 칼럼을 그대로 낸 것이고
	 * 아래는 서버가 계산해 얹은 값이다. 이름을 맞추려면 응답 전체를 손으로 다시
	 * 짜야 하는데, 그러면 칼럼이 늘 때마다 두 곳을 고쳐야 한다.
	 */
	/** **응답까지 한 날**의 수. 활동 화면을 열어만 본 날은 세지 않는다 */
	activeDays: number;
	/** 총 학습 시간(초). 열어 두고 들은 시간도 포함이라 activeDays 와 기준이 다르다 */
	studySeconds: number;
	modulesDone: number;
	/** 마지막으로 **응답한** 날 (YYYY-MM-DD) */
	lastActiveDate: string | null;
	completedActivities: number;
	/** 가장 **최근에 끝낸** 과. 번호가 가장 큰 과가 아니다 */
	lastBook: number | null;
	lastChapter: number | null;
}

export interface Instructor {
	id: number;
	email: string;
	name: string;
}

export interface BatchResult {
	created: Student[];
	errors: { row: number; email?: string; error: string }[];
}
