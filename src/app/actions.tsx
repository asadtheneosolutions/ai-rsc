"use server"; // Ensure this code runs on the client side

import { BotMessage } from "@/components/llm-crypto/message";
import { Loader2 } from "lucide-react";
import { openai } from "@ai-sdk/openai";
import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import type { CoreMessage, ToolInvocation } from "ai";
import type { ReactNode } from "react";
import { z } from "zod";
import Ai12zChatbot from "@/components/Ai12zChatbot"; // Import your component

const content = `\
You are connected to ai12z via WebSockets. You can help users by fetching data from ai12z.

Messages inside [] mean that it's a UI element or a user event.

If the user wants data from ai12z, call \`get_ai12z_data\`.

If the user asks for anything outside this set, it is an impossible task, and you should respond that you are a demo and cannot do that.
`;

export async function sendMessage(message: string): Promise<{
  id: number;
  role: "user" | "assistant";
  display: ReactNode;
}> {
  const history = getMutableAIState<typeof AI>();

  history.update([
    ...history.get(),
    {
      role: "user",
      content: message,
    },
  ]);

  const reply = await streamUI({
    model: openai("gpt-4o-2024-05-13"),
    messages: [
      {
        role: "system",
        content,
        toolInvocations: [],
      },
      ...history.get(),
    ] as CoreMessage[],
    initial: (
      <BotMessage className="items-center flex shrink-0 select-none justify-center">
        <Loader2 className="h-5 w-5 animate-spin stroke-zinc-900" />
      </BotMessage>
    ),
    text: ({ content, done }) => {
      if (done)
        history.done([...history.get(), { role: "assistant", content }]);

      return <BotMessage>{content}</BotMessage>;
    },
    tools: {
      get_ai12z_data: {
        description: "Get data from ai12z service via WebSockets.",
        parameters: z.object({}), // No parameters needed
        generate: function* () {
          // Return the client-side component
          return <Ai12zChatbot />;
        },
      },
    },
    temperature: 0,
  });

  return {
    id: Date.now(),
    role: "assistant" as const,
    display: reply.value,
  };
}

// Define the AI state and UI state types
export type AIState = Array<{
  id?: number;
  name?: "get_ai12z_data";
  role: "user" | "assistant" | "system";
  content: string;
}>;

export type UIState = Array<{
  id: number;
  role: "user" | "assistant";
  display: ReactNode;
  toolInvocations?: ToolInvocation[];
}>;

export const AI = createAI({
  initialAIState: [] as AIState,
  initialUIState: [] as UIState,
  actions: {
    sendMessage,
  },
});
