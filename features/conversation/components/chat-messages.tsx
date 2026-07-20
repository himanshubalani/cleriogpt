"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ChatStatus, type UIMessage } from "ai";
import { GitForkIcon } from "lucide-react";
import { createBranch } from "@/features/conversation/actions/conversation-actions";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  conversationId: string; // Add this prop
};

export function ChatMessages({ messages, status, conversationId }: ChatMessagesProps) {
  const isWaiting = status === "submitted" && messages.at(-1)?.role === "user";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleBranch = (messageId: string) => {
    startTransition(async () => {
      try {
        const newId = await createBranch(conversationId, messageId);
        toast.success("Timeline branched successfully!");
        router.push(`/c/${newId}`);
      } catch (err) {
        toast.error(`Failed to create branch - ${err}`);
      }
    });
  };

  return (
    <Conversation>
      <ConversationContent className="py-6">
        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
               {/* Your existing tool / text rendering logic from Phase 1 goes here */}
               <MessageResponse>
  {message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")}
</MessageResponse>
            </MessageContent>
            
            <MessageActions 
              className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <MessageAction 
                 tooltip="Branch from this message" 
                 onClick={() => handleBranch(message.id)}
                 disabled={isPending}
              >
                <GitForkIcon className="size-4" />
              </MessageAction>
            </MessageActions>
          </Message>
        ))}

        {isWaiting && (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
    </Conversation>
  );
}