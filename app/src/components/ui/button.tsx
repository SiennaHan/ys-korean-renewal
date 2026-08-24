import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonStyles = cva(
	"inline-flex h-9 select-none items-center justify-center gap-2 rounded-md px-4 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4",
	{
		variants: {
			variant: {
				primary: "bg-[#037] text-white hover:bg-gray-300 active:bg-gray-500",
				secondary:
					"active:bg-gray:400 bg-gray-100 text-gray-900 hover:bg-gray-200",
				outline: "border border-gray-300 text-gray-900 hover:bg-gray-50",
				ghost: "text-gray-900 hover:bg-gray-100",
				destructive: "bg-red-600 text-white hover:bg-red-700",
				link: "h-auto p-0 text-blue-600 underline-offset-4 hover:underline",
				success: "bg-green-600 text-white hover:bg-green-700",
				warning: "bg-yellow-500 text-white hover:bg-yellow-600",
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
