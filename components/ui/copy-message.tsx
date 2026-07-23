/** 
* Extracted Copy Button to manage its own loading and success state locally 
*/
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";

import {
	MessageAction,
} from "@/components/ai-elements/message";

type CopyMessageButtonProps = {
	text: string;
	tooltip?: string;
	successTooltip?: string;
};

export function CopyMessageButton({
	text,
	tooltip = "Copy message",
	successTooltip = "Copied!",
}: CopyMessageButtonProps) {
	const [status, setStatus] = useState<
	"idle" | "loading" | "success"
	>("idle");
	
	const [tooltipOpen, setTooltipOpen] = useState(false);
	
	useEffect(() => {
		if (status !== "success") return;
		
		const timeout = setTimeout(() => {
			setTooltipOpen(false);
			setStatus("idle");
		}, 2000);
		
		return () => clearTimeout(timeout);
	}, [status]);
	
	const handleCopy = async () => {
		if (status !== "idle") return;
		
		setStatus("loading");
		
		try {
			await navigator.clipboard.writeText(text);
			
			// Optional: briefly show the spinner before success.
			setTimeout(() => {
				setStatus("success");
				setTooltipOpen(true);
			}, 250);
		} catch {
			setStatus("idle");
			toast.error("Failed to copy to clipboard");
		}
	};
	
	return (
		<MessageAction
		tooltip={status === "success" ? successTooltip : tooltip}
		tooltipOpen={tooltipOpen}
		onTooltipOpenChange={setTooltipOpen}
		onClick={handleCopy}
		disabled={status === "loading"}
		>
		{status === "idle" && <CopyIcon className="size-4" />}
		{status === "loading" && (
			<Loader2Icon className="size-4 animate-spin text-muted-foreground" />
		)}
		{status === "success" && (
			<CheckIcon className="size-4 text-black" />
		)}
		</MessageAction>
	);
}
