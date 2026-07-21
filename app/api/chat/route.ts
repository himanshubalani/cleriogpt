import { loadChatMessages, saveChatMessages } from "@/features/ai/actions/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { 
    convertToModelMessages, 
    createIdGenerator, 
    createUIMessageStreamResponse, 
    streamText, 
    toUIMessageStream, 
    type UIMessage,
    tool, 
    stepCountIs
} from "ai";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Create a new ratelimiter, that allows 20 requests per 5 minutes
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "5 m"),
  analytics: true,
});

export async function POST(req: Request) {
    await auth.protect();
    
    const { message, id }: { message: UIMessage, id: string } = await req.json();
    
    if (!message || !id) {
        return new Response("Missing message or conversation id", { status: 400 });
    }
    
    const user = await requireUser();

    const { success, limit, reset, remaining } = await ratelimit.limit(user.id);

    if (!success) {
        return new Response("You have reached your request limit. Please try again later.", {
            status: 429,
            headers: {
                "X-RateLimit-Limit": limit.toString(),
                "X-RateLimit-Remaining": remaining.toString(),
                "X-RateLimit-Reset": reset.toString(),
            },
        });
    }

    const lockKey = `generating:${user.id}`;
    const generationLock = await redis.set(lockKey, "1", { nx: true, ex: 60 });

    if (!generationLock) {
        return new Response("Please wait for the current response to finish.", {
            status: 429,
        });
    }

const releaseLock = async () => {
        try {
            await redis.del(lockKey);
        } catch (error) {
            console.error("Failed to release generation lock:", error);
        }
    };
    
    let conversation = await prisma.conversation.findFirst({
        where: { id, userId: user.id }
    });
    
    // --> Automatically create the conversation on-the-fly if it doesn't exist
    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                id,
                userId: user.id,
                title: "New Chat" // The title will be overwritten by saveChatMessages shortly
            }
        });
    }
    
    const previousMessages = await loadChatMessages(id);
    const alreadySaved = previousMessages.some((stored) => stored.id === message.id);
    const messages = alreadySaved ? previousMessages : [...previousMessages, message];
    
    if (!alreadySaved) {
        await saveChatMessages(id, [message]);
    }
    
    const maxOutputTokens = Number.parseInt(process.env.MAX_TOKENS ?? "", 10);

    try {
        const result = streamText({
            model: getChatModel(conversation.model),
            system: conversation.systemPrompt ?? `You are ClerioGPT, an advanced AI assistant. You MUST use the webSearch tool when asked about real-time information, news, weather, or facts you don't know. The name of the person you are talking to is  ${user.firstName} ${user.lastName}`,
            messages: await convertToModelMessages(messages),
            maxOutputTokens: Number.isFinite(maxOutputTokens)
            ? maxOutputTokens
            : 1024,
            stopWhen: stepCountIs(5),
            tools: {
                webSearch: tool({
                    description: "Search the web for up-to-date and factual information.",
                    inputSchema: z.object({
                        query: z.string().describe("The search query to execute."),
                    }),
                    execute: async ({ query }) => {
                        const apiKey = process.env.TAVILY_API_KEY;
                        if (!apiKey) return "Search API key is missing. Tell the user search is disabled.";
                        
                        const res = await fetch("https://api.tavily.com/search", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                api_key: apiKey,
                                query: query,
                                search_depth: "basic",
                                include_answer: false,
                                max_results: 3
                            })
                        });
                        
                        const data = await res.json();
                        return data.results.map((r: { title: string; url: string; content: string }) => ({
                            title: r.title,
                            url: r.url,
                            content: r.content
                        }));
                    }
                })
            }
        });
        
        return createUIMessageStreamResponse({
            stream: toUIMessageStream({
                stream: result.stream,
                originalMessages: messages,
                generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
                onEnd: async ({ messages: finalMessages }) => {
                    try {
                        // Because we save "parts" as JSON in chat-store.ts, 
                        // Prisma automatically persists the tool calls and results!
                        await saveChatMessages(id, finalMessages, { updateTitle: false });
                    } catch (error) {
                        console.error("Failed to save final messages:", error);
                    } finally {
                        await releaseLock();
                    }
                }
            })
        });
    } catch (error) {
        await releaseLock();
        throw error;
    }
}