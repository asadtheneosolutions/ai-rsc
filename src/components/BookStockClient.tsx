"use client"; // This ensures the component is client-side

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Stats } from "@/components/llm-crypto/stats"; // Import your components
import { BotCard } from "@/components/llm-crypto/message"; // Import your components

type BookStockProps = {
  isbn: string;
};

const BookStockClient = ({ isbn }: BookStockProps) => {
  const socketRef = useRef<any>(null); // WebSocket reference
  const [accumulatedResponse, setAccumulatedResponse] = useState<string>(""); // For storing responses
  const [isTyping, setIsTyping] = useState<boolean>(false); // Typing state

  // Automatically connect to WebSocket when the component loads
  useEffect(() => {
    const apiKey =
      "b5e8ef9ef6d6cae0dba610aaf7fb64a8d0be0c9670a9d6b9997dfaceebac53b7";
    const projectId = "66fcd5fde25ed55561c94997";
    const organizationId = "65bbe9a448c7789bb0510d83";
    const bearerToken =
      "9d6edb24858b00e65b8c449ccb34cdaa15fba96f9e4268fec539b13e4c08173";

    // Initialize WebSocket connection
    socketRef.current = io("https://api.ai12z.net", {
      transports: ["websocket"],
      query: {
        apiKey,
        projectId: projectId.toString(),
        organizationId,
      },
      extraHeaders: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    // Log when connected
    socketRef.current.on("connect", () => {
      console.log(
        "Connected to AI12Z WebSocket server:",
        socketRef.current?.id
      );
      // Emit request to get book stock data
      socketRef.current.emit("get_book_stock", { isbn });
    });

    // Handle the WebSocket response
    socketRef.current.on("response", (data: any) => {
      setIsTyping(false);
      setAccumulatedResponse((prev) => prev + data.data);
    });

    // Handle connection errors
    socketRef.current.on("connect_error", (error: any) => {
      console.error("Connection error:", error);
    });

    // Log disconnect
    socketRef.current.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    // Clean up the WebSocket connection on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log("Disconnected from AI12Z WebSocket server");
      }
    };
  }, [isbn]); // Re-run the effect if the isbn changes

  return (
    <BotCard>
      <Stats
        name={`Book Stock (ISBN: ${isbn})`}
        description={accumulatedResponse ? accumulatedResponse : "Loading..."}
      />
    </BotCard>
  );
};

export default BookStockClient;
