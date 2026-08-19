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
