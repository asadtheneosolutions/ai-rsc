"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { BotCard, BotMessage } from "@/components/llm-crypto/message";
import { Loader2 } from "lucide-react";

export default function Ai12zChatbot() {
  const [ai12zData, setAi12zData] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Attempting to connect to ai12z socket server...");

    const socket = io("https://api.ai12z.net", {
      transports: ["websocket"],
      query: {
        apiKey: process.env.NEXT_PUBLIC_API_KEY,
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        organizationId: process.env.NEXT_PUBLIC_ORG_ID,
      },
    });

    socket.on("connect", () => {
      console.log("Connected to ai12z socket server");

      console.log("Emitting evaluate_query event...");
      socket.emit("evaluate_query", {
        apiKey: process.env.NEXT_PUBLIC_API_KEY,
        query: "Please provide the data.",
        event: "evaluate_query",
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        organizationId: process.env.NEXT_PUBLIC_ORG_ID,
      });
    });

    socket.on("response", (data) => {
      console.log("Received response from ai12z:", data);
      setIsTyping(true);
      setAi12zData((prev) => prev + data.data);
    });

    socket.on("endOfResponse", () => {
      console.log("Received end of response from ai12z");
      setIsTyping(false);
      socket.disconnect();
    });

    socket.on("connect_error", (error) => {
      console.error("Connection Error:", error);
      setError(`Connection Error: ${error.message || error}`);
    });

    socket.on("error", (error) => {
      console.error("Socket Error:", error);
      setError(`Socket Error: ${error.message || error}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (error) {
    return (
      <BotMessage>
        There was an error fetching data from ai12z: {error}
      </BotMessage>
    );
  }

  return (
    <BotCard>
      {ai12zData ? (
        <div>{ai12zData}</div>
      ) : (
        <div>
          <Loader2 className="h-5 w-5 animate-spin stroke-zinc-900" />
          <p>{isTyping ? "ai12z is typing..." : "Connecting to ai12z..."}</p>
        </div>
      )}
      {/* Additional content can go here */}
    </BotCard>
  );
}
