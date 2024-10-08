"use client";

import { useState, useEffect, useRef } from "react";
import { ChatList } from "@/components/chat-list";
import { ChatScrollAnchor } from "@/components/chat-scroll-anchor";
import { UserMessage, BotMessage } from "@/components/llm-crypto/message";
import { Button } from "@/components/ui/button";
import { useEnterSubmit } from "@/lib/use-enter-submit";
import { useForm } from "@/lib/use-form";
import { useActions, useUIState } from "ai/rsc";
import { ArrowDownIcon, PlusIcon } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { io } from "socket.io-client";
import type { AI } from "./actions";

export default function Home() {
  const [messages, setMessages] = useUIState<typeof AI>();
  const { sendMessage } = useActions<typeof AI>();
  const { formRef, onKeyDown } = useEnterSubmit();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<{ message: string }>();
  const [socket, setSocket] = useState<any>(null);

  // Establish WebSocket connection on mount
  useEffect(() => {
    const socketInstance = io("https://api.ai12z.net", {
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

    socketInstance.on("connect", () => {
      console.log("Connected to AI12Z WebSocket server:", socketInstance.id);
    });

    socketInstance.on("response", (data: any) => {
      console.log("Received response from server:", data);
      // Add the response to the chat
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          role: "assistant",
          display: <BotMessage>Book stock: {data.stock}</BotMessage>,
        },
      ]);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    setSocket(socketInstance);

    // Cleanup when component unmounts
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const submitHandler = async (data: { message: string }) => {
    const value = data.message.trim();
    formRef.current?.reset();
    if (!value) return;

    // Add user message to UI
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        role: "user",
        display: <UserMessage>{value}</UserMessage>,
      },
    ]);

    // Submit the message to the server (server-side logic handled here)
    try {
      const responseMessage: any = await sendMessage(value);
      setMessages((currentMessages) => [...currentMessages, responseMessage]);

      if (value.startsWith("/book") && socket) {
        const isbn = value.split(" ")[1];
        // Emit event to request book stock from WebSocket
        socket.emit("get_book_stock", { isbn });
      }
    } catch (error) {
      console.error(error);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now(),
          role: "assistant",
          display: (
            <BotMessage>
              Error sending message, please try again later.
            </BotMessage>
          ),
        },
      ]);
    }
  };

  return (
    <main>
      <div className="pb-[200px] pt-4 md:pt-10">
        <ChatList messages={messages} />
        <ChatScrollAnchor trackVisibility={true} />
      </div>
      <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80">
        <div className="mx-auto sm:max-w-2xl sm:px-4">
          <div className="px-4 flex justify-center flex-col py-2 space-y-4 border-t shadow-lg bg-background sm:rounded-t-xl sm:border md:py-4 bg-white">
            <form ref={formRef} onSubmit={form.handleSubmit(submitHandler)}>
              <div className="relative flex flex-col w-full overflow-hidden max-h-60 grow bg-background sm:rounded-md sm:border">
                <TextareaAutosize
                  tabIndex={0}
                  onKeyDown={onKeyDown}
                  placeholder="Send a message (e.g., /book ISBN)"
                  className="min-h-[60px] w-full resize-none bg-transparent pl-4 pr-16 py-[1.3rem] focus-within:outline-none sm:text-sm"
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  rows={1}
                  {...form.register("message")}
                />
                <div className="absolute right-0 top-4 sm:right-4">
                  <Button
                    type="submit"
                    size="icon"
                    disabled={form.watch("message") === ""}
                  >
                    <ArrowDownIcon className="w-5 h-5" />
                    <span className="sr-only">Send message</span>
                  </Button>
                </div>
              </div>
            </form>
            <Button
              variant="outline"
              size="lg"
              className="p-4 mt-4 rounded-full bg-background"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Chat</span>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
