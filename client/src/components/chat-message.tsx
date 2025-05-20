import { cn } from "@/lib/utils";
import { ChatEvent } from "@shared/schema";
import { format } from "date-fns";

interface ChatMessageProps {
  message: ChatEvent;
  isCurrentUser: boolean;
}

export default function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  const formattedTime = format(timestamp, "h:mm a");
  
  // System message (join/leave)
  if (message.type === "join" || message.type === "leave") {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-200 dark:bg-dark-400 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-md text-sm inline-block animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
          <span>
            User <span className="font-mono">{message.userId}</span>{" "}
            {message.type === "join" ? "joined" : "left"} the room
          </span>
        </div>
      </div>
    );
  }

  // Regular message
  return (
    <div 
      className={cn(
        "flex items-end gap-2",
        isCurrentUser ? "justify-end" : "",
        "animate-in fade-in-0 slide-in-from-bottom-5 duration-300"
      )}
    >
      <div 
        className={cn(
          "px-4 py-3 shadow-sm relative",
          isCurrentUser 
            ? "bg-primary-600 dark:bg-primary-700 text-white rounded-t-xl rounded-l-xl chat-bubble-right" 
            : "bg-white dark:bg-dark-400 rounded-t-xl rounded-r-xl chat-bubble-left"
        )}
      >
        <div 
          className={cn(
            "flex items-center gap-2 mb-1",
            isCurrentUser ? "justify-end" : ""
          )}
        >
          <span 
            className={cn(
              "text-xs font-mono", 
              isCurrentUser 
                ? "text-primary-200" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            {isCurrentUser ? `${message.userId} (You)` : message.userId}
          </span>
          <span 
            className={cn(
              "text-xs", 
              isCurrentUser 
                ? "text-primary-200" 
                : "text-gray-400 dark:text-gray-500"
            )}
          >
            {formattedTime}
          </span>
        </div>
        <p 
          className={cn(
            isCurrentUser 
              ? "text-white" 
              : "text-gray-800 dark:text-gray-100"
          )}
        >
          {message.message}
        </p>
      </div>
    </div>
  );
}
