"use server";

import { BotCard, BotMessage } from "@/components/llm-crypto/message";
import { Price } from "@/components/llm-crypto/price";
import { PriceSkeleton } from "@/components/llm-crypto/price-skeleton";
import { Stats } from "@/components/llm-crypto/stats";
import { StatsSkeleton } from "@/components/llm-crypto/stats-skeleton";
import { env } from "@/env.mjs";
import { openai } from "@ai-sdk/openai";
import type { CoreMessage, ToolInvocation } from "ai";
import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import { MainClient } from "binance";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const binance = new MainClient({
  api_key: env.BINANCE_API_KEY,
  api_secret: env.BINANCE_API_SECRET,
});

const content = `\
You are a crypto bot and a stock bot. You can help users get the prices of cryptocurrencies and stocks.

Messages inside [] means that it's a UI element or a user event. For example:
- "[Price of BTC = 69000]" means that the interface of the cryptocurrency price of BTC is shown to the user.

If the user wants the price of a stock, call \`get_microsoft_stock\` to show the price.
If the user wants product details, call \`get_microsoft_product_details\` to show the details.
If the user wants a cryptocurrency price, call \`get_crypto_price\`.
If the user wants the market cap or other stats of a cryptocurrency, call \`get_crypto_stats\`.

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
      get_crypto_price: {
        description:
          "Get the current price of a given cryptocurrency. Use this to show the price to the user.",
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              "The name or symbol of the cryptocurrency. e.g. BTC/ETH/SOL."
            ),
        }),
        generate: async function* ({ symbol }: { symbol: string }) {
          yield (
            <BotCard>
              <PriceSkeleton />
            </BotCard>
          );

          const stats = await binance.get24hrChangeStatististics({
            symbol: `${symbol}USDT`,
          });
          const price = Number(stats.lastPrice);
          const delta = Number(stats.priceChange);

          await sleep(1000);

          history.done([
            ...history.get(),
            {
              role: "assistant",
              name: "get_crypto_price",
              content: `[Price of ${symbol} = ${price}]`,
            },
          ]);

          return (
            <BotCard>
              <Price name={symbol} price={price} delta={delta} />
            </BotCard>
          );
        },
      },
      get_crypto_stats: {
        description:
          "Get the current stats of a given cryptocurrency. Use this to show the stats to the user.",
        parameters: z.object({
          slug: z
            .string()
            .describe(
              "The full name of the cryptocurrency in lowercase. e.g. bitcoin/ethereum/solana."
            ),
        }),
        generate: async function* ({ slug }: { slug: string }) {
          yield (
            <BotCard>
              <StatsSkeleton />
            </BotCard>
          );

          const url = new URL(
            "https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail"
          );
          url.searchParams.append("slug", slug);
          url.searchParams.append("limit", "1");
          url.searchParams.append("sortBy", "market_cap");

          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CMC_PRO_API_KEY": env.CMC_API_KEY,
            },
          });

          if (!response.ok) {
            return <BotMessage>Crypto not found!</BotMessage>;
          }

          const res = await response.json();
          const data = res.data.statistics;

          await sleep(1000);

          history.done([
            ...history.get(),
            {
              role: "assistant",
              name: "get_crypto_stats",
              content: `[Stats of ${slug}]`,
            },
          ]);

          return (
            <BotCard>
              <Stats {...data} />
            </BotCard>
          );
        },
      },
      get_microsoft_stock: {
        description:
          "Get the current stock price of Microsoft. Use this to show the price to the user.",
        parameters: z.object({
          symbol: z
            .string()
            .default("MSFT") // Default to Microsoft stock symbol
            .describe("The stock symbol for Microsoft, e.g., MSFT."),
        }),
        generate: async function* ({ symbol }: { symbol: string }) {
          yield (
            <BotCard>
              <PriceSkeleton />
            </BotCard>
          );

          const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${env.AV_API_KEY}`;

          try {
            const response = await fetch(url);

            if (!response.ok) {
              return <BotMessage>Stock data not found!</BotMessage>;
            }

            const data = await response.json();

            // Check if the response contains time series data
            if (!data["Time Series (5min)"]) {
              return (
                <BotMessage>No stock data available for ${symbol}.</BotMessage>
              );
            }

            const timeSeries = data["Time Series (5min)"];
            const latestTime = Object.keys(timeSeries)[0];
            const latestPrice = timeSeries[latestTime]["4. close"];

            history.done([
              ...history.get(),
              {
                role: "assistant",
                name: "get_microsoft_stock",
                content: `[Price of ${symbol} = ${latestPrice}]`,
              },
            ]);

            return (
              <BotCard>
                <Price name={symbol} price={latestPrice} delta={0} />
              </BotCard>
            );
          } catch (error) {
            console.error("Error fetching stock data:", error);
            return (
              <BotMessage>
                There was an error fetching the stock data.
              </BotMessage>
            );
          }
        },
      },
      get_microsoft_product_details: {
        description:
          "Get the details of a specific Microsoft product. Use this to show the product details to the user.",
        parameters: z.object({
          product: z.string().describe("The name of the Microsoft product."),
        }),
        generate: async function* ({ product }: { product: string }) {
          yield (
            <BotCard>
              <StatsSkeleton />
            </BotCard>
          );

          // Mock data for product details (replace with actual API call)
          const productDetails = {
            name: product,
            description: `The latest product from Microsoft - ${product}.`,
            price: "$499",
            releaseDate: "2024-01-01",
            features: ["Feature 1", "Feature 2", "Feature 3"],
          };

          await sleep(1000);

          history.done([
            ...history.get(),
            {
              role: "assistant",
              name: "get_microsoft_product_details",
              content: `[Details of ${product}]`,
            },
          ]);

          return (
            <BotCard>
              <Stats
                rank={0}
                totalSupply={0}
                volume={0}
                volumeChangePercentage24h={0}
                marketCap={0}
                dominance={0}
                {...productDetails}
              />
            </BotCard>
          );
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
  name?:
    | "get_crypto_price"
    | "get_crypto_stats"
    | "get_microsoft_stock"
    | "get_microsoft_product_details";
  role: "user" | "assistant" | "system";
  content: string;
}>;

export type UIState = Array<{
  id: number;
  role: "user" | "assistant";
  display: ReactNode;
  toolInvocations?: ToolInvocation[];
}>;

// Create the AI provider with the initial states and allowed actions
export const AI = createAI({
  initialAIState: [] as AIState,
  initialUIState: [] as UIState,
  actions: {
    sendMessage,
  },
});
