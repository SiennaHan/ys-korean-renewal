
import Dexie, { type EntityTable } from 'dexie';

const schemaName = 'KoreanStorage';

type UserFlashcardTable = {
  id: number;
  user_id: string;
  flashcard_id: number;
  type: string | undefined;
	status: 'new' | 'repeat' | 'complete';
	updated_at: Date;
};

type UserFlashcardWordTable = {
  id: number;
  user_id: string;
  book_id: number;
  flashcard_id: number;
  type: string | undefined;
  card_id: string;
	status: 'unknown' | '' | 'known';
	created_at: Date;
};

const db = new Dexie(schemaName) as Dexie & {
  user_flashcard: EntityTable<UserFlashcardTable, 'id'>;
  user_flashcard_word: EntityTable<UserFlashcardWordTable, 'id'>;
};

db.version(1).stores({
  user_flashcard: '++id, user_id, flashcard_id, type',
  user_flashcard_word: '++id, user_id, book_id, flashcard_id, type'
});

export { db };
export type { UserFlashcardTable, UserFlashcardWordTable };
