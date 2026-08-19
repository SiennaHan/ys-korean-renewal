import { create } from "zustand";

// --- Tab Navigation ---

interface TabState {
	tabIndex: number;
	setTabIndex: (index: number) => void;
}

export const useTabStore = create<TabState>()((set) => ({
	tabIndex: 0,
	setTabIndex: (index) => set({ tabIndex: index }),
}));

// --- Tab 2 Scene ---

export type Tab2SceneType = "main" | "jamo" | "missionchat" | "flashcard";

interface Tab2SceneState {
	scene: Tab2SceneType;
	setScene: (scene: Tab2SceneType) => void;
}

export const useTab2SceneStore = create<Tab2SceneState>()((set) => ({
	scene: "main",
	setScene: (scene) => set({ scene }),
}));

// --- Book Selection ---

interface BookIdState {
	bookId: number;
	setBookId: (id: number) => void;
}

export const useSelectedBookIdStore = create<BookIdState>()((set) => ({
	bookId: 1,
	setBookId: (bookId) => set({ bookId }),
}));

// --- Card Type ---

type CardType = "wm" | "mw";

interface CardTypeState {
	cardType: CardType;
	setCardType: (cardType: CardType) => void;
}

export const useSelectedCardTypeStore = create<CardTypeState>()((set) => ({
	cardType: "wm",
	setCardType: (cardType) => set({ cardType }),
}));

// --- Flashcard ---

export const useFlashcardBookIdStore = create<BookIdState>()((set) => ({
	bookId: 0,
	setBookId: (bookId) => set({ bookId }),
}));

// --- Mission Chat ---

export const useMissionChatBookIdStore = create<BookIdState>()((set) => ({
	bookId: 0,
	setBookId: (bookId) => set({ bookId }),
}));

// --- Dialog Gender ---

type Gender = "male" | "female";

interface DialogGenderState {
	gender: Gender;
	setGender: (gender: Gender) => void;
}

export const useDialogGenderStore = create<DialogGenderState>()((set) => ({
	gender: "female",
	setGender: (gender) => set({ gender }),
}));

// --- Textbook Selection ---

type TextbookBookTabId = number | "jamo";

interface TextbookSelectionState {
	bookTab: TextbookBookTabId;
	chapterId: number | null;
	setBookTab: (id: TextbookBookTabId) => void;
	setChapterId: (id: number | null) => void;
}

export const useTextbookSelectionStore = create<TextbookSelectionState>()(
	(set) => ({
		bookTab: 1,
		chapterId: null,
		setBookTab: (bookTab) => set({ bookTab, chapterId: null }),
		setChapterId: (chapterId) => set({ chapterId }),
	}),
);

// --- Jamo ---

export const useJamoBookIdStore = create<BookIdState>()((set) => ({
	bookId: 0,
	setBookId: (bookId) => set({ bookId }),
}));

interface JamoChapterIdState {
	chapterId: number;
	setChapterId: (id: number) => void;
}

export const useJamoChapterIdStore = create<JamoChapterIdState>()((set) => ({
	chapterId: 0,
	setChapterId: (chapterId) => set({ chapterId }),
}));
