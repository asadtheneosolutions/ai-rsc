"use server";

import { createAI } from "ai/rsc";
export type AIState = Array<[]>;
export type UIState = Array<[]>;
export const AI = createAI({
  initialAIState: [],
  initialUIState: [],
  actions: {
    hello: async (name: string) => {
      return `Hello, ${name}!`;
    },
  },
});
