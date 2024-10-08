"use server";

import { BotMessage } from "@/components/llm-crypto/message";
import type { ToolInvocation } from "ai";
import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import type { ReactNode } from "react";

const content = `\
You are a crypto bot and a stock bot. You can help users get the prices of cryptocurrencies, stocks, and books.

Messages inside [] means that it's a UI element or a user event. For example:
- "[Price of BTC = 69000]" means that the interface of the cryptocurrency price of BTC is shown to the user.

If the user wants the price of a stock, call \`get_microsoft_stock\` to show the price.
If the user wants book stock, call \`get_book_stock\` to show the book stock.
If the user wants product details, call \`get_microsoft_product_details\` to show the details.
If the user wants a cryptocurrency price, call \`get_crypto_price\`.
If the user wants the market cap or other stats of a cryptocurrency, call \`get_crypto_stats\`.

If the user asks for anything outside this set, it is an impossible task, and you should respond that you are a demo and cannot do that.
`;

// Main sendMessage function (no WebSocket connection here)
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

  let reply;

  // Handle user input
  if (message.startsWith("/book")) {
    const isbn = message.split(" ")[1];

    // Let the client-side WebSocket handle the actual book stock lookup
    reply = (
      <BotMessage>Requesting stock information for ISBN {isbn}...</BotMessage>
    );

    history.done([
      ...history.get(),
      {
        role: "assistant",
        name: "get_book_stock",
        content: `[Requesting stock for ${isbn}]`,
      },
    ]);
  } else {
    // If the request is not related to books, return an error
    reply = (
      <BotMessage>
        This bot can only handle book stock inquiries. Please use the /book
        command followed by an ISBN.
      </BotMessage>
    );
  }

  return {
    id: Date.now(),
    role: "assistant" as const,
    display: reply,
  };
}

// Define the AI state and UI state types
export type AIState = Array<{
  id?: number;
  name?: "get_book_stock";
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
