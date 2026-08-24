export interface ChapterType {
	id: number;
	book_group_id: number;
	book_id: number;
	seq: number;
	title: string;
	eng: string;
	description: string;
	type: string;
	is_show_unit?: boolean;
}

export interface ModuleType {
	id: number;
	unit_id: number;
	code: string;
	title: string;
	eng: string;
	scene_type: string;
	content_img: string;
	is_disabled: boolean;
}

export interface ProblemType {
	id: string;
	module_code: string;
	scene_num: number;
	instructions: string;
	content: string;
	content_img: string;
	content_vid: string;
	content_sound: string;
	type: string;
	choice_1: string;
	answer_1: string;
	choice_2: string;
	answer_2: string;
	choice_3: string;
	answer_3: string;
	// choice_4: string;
	// answer_4: string;
}

export interface ChatType {
	id: string;
	module_code: string;
	title: string;
	title_eng: string;
	scenario: string;
	scenario_eng: string;
	prompt: string;
}
