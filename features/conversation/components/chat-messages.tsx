// features/conversation/components/chat-messages.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { type ChatStatus, type UIMessage } from "ai";
import { GitForkIcon, CopyIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { createBranch } from "@/features/conversation/actions/conversation-actions";
import { CopyMessageButton } from "@/components/ui/copy-message";


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
  conversationId: string;
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
      <MessageResponse>
      {message.parts
        .filter((p) => p.type === "text")
        // @ts-ignore
        .map((p) => p.text)
        .join("")}
        </MessageResponse>
        </MessageContent>
        
        <MessageActions 
        className={`opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 ${
          message.role === "user" ? "justify-end" : "justify-start"
          }`}
          >
          <CopyMessageButton
          text={message.parts
            .filter((p) => p.type === "text")
            // @ts-ignore
            .map((p) => p.text)
            .join("")}
            />
            
            
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
      