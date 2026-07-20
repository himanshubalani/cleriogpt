"use client";
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react"
import React, { useMemo } from 'react'
import Link from 'next/link';
import { useConversations } from '../hooks/use-conversation';
import { queryKeys } from '../utils/query-keys';
import { toast } from 'sonner';
import { ChatEmpty } from './chat-empty';
import { ChatMessages } from './chat-messages';
import { ChatComposer } from './chat-composer';
import { GitForkIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type ConversationViewProps = {
    conversationId: string;
    initialMessages: UIMessage[];
};

export const ConversationView = ({ conversationId, initialMessages }: ConversationViewProps) => {

    const queryClient = useQueryClient();
    const { data: conversations } = useConversations();

    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
            body: { id, message: messages.at(-1) }
        })
    }), []);

    const { messages, sendMessage, status } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport,
        onFinish: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
        },
        onError: (error) => toast.error(error.message),
    });

    const currentConv = conversations?.find((item) => item.id === conversationId);
    const title = currentConv?.title ?? "Chat";
    
    // Find all branches sharing the same root!
    const rootId = currentConv?.rootId || currentConv?.id;
    const relatedBranches = conversations?.filter(c => (c.rootId || c.id) === rootId) || [];

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mx-1 h-4" />
                <h1 className="truncate text-sm font-medium">{title}</h1>
                
                {/* Branch Switcher Dropdown */}
                {relatedBranches.length > 1 && (
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="outline" size="sm" className="ml-auto flex items-center gap-2 h-8">
                         <GitForkIcon className="size-3" />
                         Branches ({relatedBranches.length})
                         <ChevronDownIcon className="size-3" />
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-56">
                       {relatedBranches.map(branch => (
                         <DropdownMenuItem key={branch.id} asChild>
                           <Link href={`/c/${branch.id}`} className="flex items-center justify-between w-full">
                             <span className="truncate">{branch.title}</span>
                             {branch.id === conversationId && <CheckIcon className="size-4 ml-2" />}
                           </Link>
                         </DropdownMenuItem>
                       ))}
                     </DropdownMenuContent>
                   </DropdownMenu>
                )}
            </header>

            {messages.length === 0 ? (
                <ChatEmpty />
            ) : (
                <ChatMessages messages={messages} status={status} conversationId={conversationId} />
            )}

            <ChatComposer
                onSend={(text) => { void sendMessage({ text }); }}
                isSending={status !== "ready"}
                autoFocus
            />
        </div>
    )
}