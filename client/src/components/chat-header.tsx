import { Menu } from "lucide-react";
import { Room } from "@shared/schema";

interface ChatHeaderProps {
  room: Room;
  onToggleSidebar: () => void;
}

export default function ChatHeader({ room, onToggleSidebar }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-500">
      <div className="flex items-center">
        <button 
          className="md:hidden mr-4 text-gray-500 dark:text-gray-400"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{room.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {room.userCount || 0} online
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              Room Code: {room.code}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          className="p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-dark-400 rounded-full transition-colors" 
          title="Leave room"
          aria-label="Leave room"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-5 w-5"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
