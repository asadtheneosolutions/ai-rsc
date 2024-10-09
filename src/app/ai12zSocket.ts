// ai12zSocket.ts

import { io } from "socket.io-client";
import { env } from "@/env.mjs"; // Adjust the path based on your project structure

export function fetchAi12zData(): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = io("https://api.ai12z.net", {
      auth: {
        token: env.BEARER_TOKEN,
      },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to ai12z socket server");

      // Replace with the correct event names and data structure
      socket.emit("requestData", {
        apiKey: env.API_KEY,
        projectId: env.PROJECT_ID,
        organizationId: env.ORG_ID,
      });
    });

    socket.on("dataResponse", (data: any) => {
      resolve(data);
      socket.disconnect();
    });

    socket.on("connect_error", (error: any) => {
      console.error("Connection Error:", error);
      reject(error);
    });

    socket.on("error", (error: any) => {
      console.error("Socket Error:", error);
      reject(error);
    });
  });
}
