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
		<div ref={containerRef} className="language-select">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				onBlur={(e) => {
					if (!containerRef.current?.contains(e.relatedTarget)) {
						setIsOpen(false);
					}
				}}
				className="language-select-trigger"
			>
				<span className="language-select-flag">{currentLang.flag}</span>
				<span>{t(`language.${currentLang.code}`)}</span>
				<ChevronDown
					className={cn("language-select-chevron", isOpen && "is-open")}
				/>
			</button>

			{isOpen && (
				<div className="language-select-menu">
					{LANGUAGES.map((lang) => (
						<button
							key={lang.code}
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => handleSelect(lang.code)}
							className={cn(
								"language-select-option",
								i18n.language === lang.code && "is-active",
							)}
						>
							<span className="language-select-flag">{lang.flag}</span>
							<span>{t(`language.${lang.code}`)}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
