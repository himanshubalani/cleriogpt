// features/ai/actions/chat-store.ts
"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

function getMessageText(message: UIMessage) {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

function toUIMessageParts(parts: Prisma.JsonValue | null, content: string): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;
  if (Array.isArray(stored) && stored.length > 0) return stored;
  return [{ type: "text", text: content }];
}

export async function loadChatMessages(conversationId: string): Promise<UIMessage[]> {
  let currentId: string | null = conversationId;
  const lineage: { convId: string; upToMsgId: string | null }[] = [];

  

  // Trace back to the root of the conversation tree
  while (currentId) {
    const conv: {
      id: string;
      forkedFromId: string | null;
      forkedFromMessageId: string | null;
    } | null = await prisma.conversation.findUnique({
      where: { id: currentId },
      select: { id: true, forkedFromId: true, forkedFromMessageId: true }
    });
    if (!conv) break;
    lineage.unshift({ convId: conv.id, upToMsgId: conv.forkedFromMessageId });
    currentId = conv.forkedFromId;
  }

  const allMessages = [];

  // Reconstruct the history from root to current leaf
  for (const part of lineage) {
    if (part.upToMsgId) {
      const boundaryMsg = await prisma.message.findUnique({
        where: { id: part.upToMsgId },
        select: { createdAt: true }
      });
      if (boundaryMsg) {
        const msgs = await prisma.message.findMany({
          where: {
            conversationId: part.convId,
            createdAt: { lte: boundaryMsg.createdAt }
          },
          orderBy: { createdAt: "asc" }
        });
        allMessages.push(...msgs);
      }
    } else {
      const msgs = await prisma.message.findMany({
        where: { conversationId: part.convId },
        orderBy: { createdAt: "asc" }
      });
      allMessages.push(...msgs);
    }
  }

  // Deduplicate in case of exact timestamp boundary overlaps
  const uniqueMsgs = Array.from(new Map(allMessages.map(m => [m.id, m])).values());

  return uniqueMsgs.map((row) => ({
    id: row.id,
    role: row.role === "ASSISTANT" ? "assistant" : "user",
    parts: toUIMessageParts(row.parts, row.content),
  }));
}

export async function saveChatMessages(
  conversationId: string,
  messages: UIMessage[],
  options: { updateTitle?: boolean } = {}
) {
  const { updateTitle = true } = options;

  for (const message of messages) {
    if (message.role === "system") continue;

    // VERY IMPORTANT: Prevent modifying historical messages belonging to a parent branch
    const existing = await prisma.message.findUnique({
      where: { id: message.id },
      select: { conversationId: true }
    });

    if (existing && existing.conversationId !== conversationId) {
      continue; 
    }

    const content = getMessageText(message);
    const role = message.role === "assistant" ? "ASSISTANT" : "USER";

    await prisma.message.upsert({
      where: { id: message.id },
      create: {
        id: message.id,
        conversationId,
        role,
        status: "COMPLETE",
        content,
        parts: message.parts as Prisma.InputJsonValue,
      },
      update: {
        content,
        parts: message.parts as Prisma.InputJsonValue,
        status: "COMPLETE",
      },
    });
  }

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { title: true },
  });

  const firstUser = messages.find((message) => message.role === "user");
  const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      title: updateTitle && conversation.title === "New Chat" && firstUserText
          ? firstUserText.slice(0, 48)
          : conversation.title,
    },
  });
}