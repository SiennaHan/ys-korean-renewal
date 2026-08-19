import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import ja from "./locales/ja";
import ko from "./locales/ko";
import vi from "./locales/vi";
import zh from "./locales/zh";

const LANGUAGE_STORAGE_KEY = "speako-language";

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		ko: { translation: ko },
		ja: { translation: ja },
		zh: { translation: zh },
		vi: { translation: vi },
	},
	lng: savedLanguage,
	fallbackLng: "en",
	interpolation: {
		escapeValue: false,
	},
});

export { LANGUAGE_STORAGE_KEY };
export default i18n;
