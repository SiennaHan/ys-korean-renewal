import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonStyles = cva(
	"inline-flex h-9 select-none items-center justify-center gap-2 rounded-[12px] px-4 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 disabled:pointer-events-none [&>svg]:size-4",
	{
		variants: {
			variant: {
				primary:
					"bg-fill-primary text-text-inverse hover:bg-fill-primary-hover active:bg-fill-primary-pressed disabled:bg-background-disable disabled:text-text-disable",
				secondary:
					"bg-background-base text-text-strong hover:bg-background-sunken active:bg-line-normal disabled:text-text-disable",
				outline:
					"border border-line-normal bg-background-surface text-text-strong hover:bg-background-base disabled:text-text-disable",
				ghost:
					"text-text-strong hover:bg-background-base disabled:text-text-disable",
				destructive:
					"bg-fill-wrong text-text-inverse hover:brightness-95 disabled:bg-background-disable disabled:text-text-disable",
				link: "h-auto p-0 text-text-primary underline-offset-4 hover:underline",
				success:
					"bg-fill-correct text-text-inverse hover:brightness-95 disabled:bg-background-disable disabled:text-text-disable",
				warning:
					"bg-fill-caution text-text-inverse hover:brightness-95 disabled:bg-background-disable disabled:text-text-disable",
			},
			size: {
				sm: "h-8 px-3 text-sm",
				md: "h-9 px-4 text-sm",
				lg: "h-11 px-6 text-base",
				icon: "h-9 w-9 p-0",
			},
			full: {
				true: "w-full",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonStyles>;

export function Button({
	className,
	variant,
	size,
	full,
	...props
}: ButtonProps) {
	return (
		<button
			type={props.type ?? "button"}
			className={cn(buttonStyles({ variant, size, full }), className)}
			{...props}
		/>
	);
}
