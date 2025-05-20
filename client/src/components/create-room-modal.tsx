import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWebSocket } from "@/hooks/use-websocket";
import { useChat } from "@/hooks/use-chat";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { sendMessage } = useWebSocket();
  const { userId } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    sendMessage(JSON.stringify({
      type: "create_room",
      userId: userId,
      roomName: name.trim(),
      message: description.trim(),
    }));
    
    resetForm();
    onClose();
  };
  
  const resetForm = () => {
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Create New Room</DialogTitle>
          <DialogDescription>
            Create a new anonymous chat room. You'll get a unique code to share with others.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Room Name
            </Label>
            <Input
              id="room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              className="dark:bg-dark-400 dark:text-gray-200"
              required
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="room-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </Label>
              <span className="text-xs text-gray-500 dark:text-gray-400">Max 200 chars</span>
            </div>
            <Textarea
              id="room-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your room"
              className="dark:bg-dark-400 dark:text-gray-200 h-20"
              maxLength={200}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Create Room
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
