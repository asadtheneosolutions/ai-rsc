"use server";

import io from "socket.io-client";
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
import BookStockClient from "@/components/BookStockClient";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const binance = new MainClient({
  api_key: env.BINANCE_API_KEY,
  api_secret: env.BINANCE_API_SECRET,
});

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
      get_microsoft_stock: {
        description:
          "Get the current stock price of Microsoft. Use this to show the price to the user.",
        parameters: z.object({
          symbol: z
            .string()
            .default("MSFT")
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
      get_book_stock: {
        description:
          "Get the current stock of a specific book. Use this to show the availability of a book to the user.",
        parameters: z.object({
          isbn: z.string().describe("The ISBN of the book to query."),
        }),
        generate: async function* ({ isbn }: { isbn: string }) {
          let response = "";
          let errorOccurred = false;

          // IIFE for establishing the WebSocket connection
          await (async () => {
            const socket = io("https://api.ai12z.net", {
              transports: ["websocket"],
              query: {
                apiKey:
                  "b5e8ef9ef6d6cae0dba610aaf7fb64a8d0be0c9670a9d6b9997dfaceebac53b7",
                projectId: "66fcd5fde25ed55561c94997",
                organizationId: "65bbe9a448c7789bb0510d83",
              },
              extraHeaders: {
                Authorization: `Bearer 9d6edb24858b00e65b8c449ccb34cdaa15fba96f9e4268fec539b13e4c08173`,
              },
            });

            // Establish the WebSocket connection and handle events
            socket.on("connect", () => {
              console.log("Connected to AI12Z WebSocket server:", socket.id);

              // Emit the event to get the book stock
              socket.emit("get_book_stock", { isbn });
            });

            // Listen for the server's response
            socket.on("response", (data: any) => {
              console.log("Received response from server:", data);
              response = data.stock;
            });

            // Handle connection errors
            socket.on("connect_error", (error: any) => {
              console.error("Connection error:", error);
              errorOccurred = true;
            });

            // Disconnect the socket when done
            socket.on("disconnect", () => {
              console.log("Disconnected from AI12Z WebSocket server");
            });

            // Simulate delay for WebSocket processing
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Clean up WebSocket connection
            socket.disconnect();
          })();

          // Yield the result based on error state and WebSocket response
          if (errorOccurred) {
            yield <BotMessage>Error fetching book stock data</BotMessage>;
          } else if (response) {
            yield (
              <BotMessage>
                Current stock for ISBN {isbn}: {response}
              </BotMessage>
            );
          } else {
            yield (
              <BotMessage>No stock data available for ISBN {isbn}</BotMessage>
            );
          }
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
    | "get_microsoft_product_details"
    | "get_book_stock";
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
