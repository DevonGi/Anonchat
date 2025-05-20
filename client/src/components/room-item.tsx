import { cn } from "@/lib/utils";
import { Room } from "@shared/schema";

interface RoomItemProps {
  room: Room;
  isSelected: boolean;
  onClick: () => void;
}

export default function RoomItem({ room, isSelected, onClick }: RoomItemProps) {
  return (
    <div 
      className={cn(
        "bg-gray-100 dark:bg-dark-400 rounded-md p-3 mb-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors group",
        isSelected && "border-2 border-primary-500"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800 dark:text-gray-100">{room.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {room.userCount || 0} online
            </span>
          </div>
        </div>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-200 dark:bg-dark-500 rounded group-hover:bg-gray-300 dark:group-hover:bg-dark-400 transition-colors">
          {room.code}
        </span>
      </div>
    </div>
  );
}
