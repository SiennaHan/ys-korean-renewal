import { LANGUAGE_STORAGE_KEY } from "@/i18n";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
	{ code: "en", flag: "🇺🇸" },
	{ code: "ko", flag: "🇰🇷" },
	{ code: "ja", flag: "🇯🇵" },
	{ code: "zh", flag: "🇨🇳" },
	{ code: "vi", flag: "🇻🇳" },
] as const;

export function LanguageSelector() {
	const { t, i18n } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const currentLang =
		LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

	const handleSelect = (code: string) => {
		i18n.changeLanguage(code);
		localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
		setIsOpen(false);
	};

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				onBlur={(e) => {
					if (!containerRef.current?.contains(e.relatedTarget)) {
						setIsOpen(false);
					}
				}}
				className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-gray-100"
			>
				<span className="text-base">{currentLang.flag}</span>
				<span className="font-medium">{t(`language.${currentLang.code}`)}</span>
				<ChevronDown
					className={cn(
						"h-4 w-4 text-gray-500 transition-transform",
						isOpen && "rotate-180",
					)}
				/>
			</button>

			{isOpen && (
				<div className="absolute right-0 z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
					{LANGUAGES.map((lang) => (
						<button
							key={lang.code}
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => handleSelect(lang.code)}
							className={cn(
								"flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50",
								i18n.language === lang.code &&
									"bg-blue-50 font-medium text-blue-600",
							)}
						>
							<span className="text-base">{lang.flag}</span>
							<span>{t(`language.${lang.code}`)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
