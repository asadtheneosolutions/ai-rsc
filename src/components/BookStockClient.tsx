"use client"; // This makes the component client-side

import { useEffect, useState } from "react";
import io from "socket.io-client";
import { BotMessage } from "@/components/llm-crypto/message"; // Assuming BotMessage is a reusable component

type BookStockClientProps = {
  isbn: string;
};

export default function BookStockClient({ isbn }: BookStockClientProps) {
  const [stockData, setStockData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Attempting to connect to WebSocket server...");

    const socket = io("wss://api.ai12z.net", {
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

    socket.on("connect", () => {
      console.log("Connected to AI12Z WebSocket server:", socket.id);

      // Emit the event to get the book stock
      socket.emit("get_book_stock", { isbn });
    });

    socket.on("response", (data: any) => {
      console.log("Received response from server:", data);
      setStockData(data.stock); // Set stock data in state
    });

    socket.on("connect_error", (error: any) => {
      console.error("Connection error:", error);
      setError("Error fetching book stock data");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from AI12Z WebSocket server");
    });

    // Cleanup socket connection on component unmount
    return () => {
      console.log("Cleaning up WebSocket connection...");
      socket.disconnect();
    };
  }, [isbn]);

  if (error) {
    return <BotMessage>{error}</BotMessage>;
  }

  if (!stockData) {
    return <BotMessage>Fetching book stock for ISBN: {isbn}...</BotMessage>;
  }

  return (
    <BotMessage>
      Current stock for ISBN {isbn}: {stockData}
    </BotMessage>
  );
}
