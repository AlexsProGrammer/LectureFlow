import type { Server, Socket } from "socket.io";
import { roomExists, incrementPollOption, getPollResults, addChatMessage } from "../services/redisState.js";

export function registerRoomEvents(io: Server, socket: Socket) {
  socket.on("join_room", async ({ code }: { code: string }) => {
    if (!code || typeof code !== "string") {
      return socket.emit("error", { message: "Invalid room code" });
    }

    const exists = await roomExists(code);
    if (!exists) {
      return socket.emit("error", { message: "Room not found or expired" });
    }

    socket.join(code);
    socket.emit("joined", { roomCode: code });
  });

  socket.on("submit_poll", async ({ roomId, questionId, optionId }: { roomId: string; questionId: string; optionId: string }) => {
    await incrementPollOption(roomId, questionId, optionId);
    const results = await getPollResults(roomId, questionId);
    io.to(roomId).emit("poll_update", { questionId, results });
  });

  socket.on("send_chat", async ({ roomId, message, sender }: { roomId: string; message: string; sender: string }) => {
    const chatMessage = { sender, message, timestamp: Date.now() };
    await addChatMessage(roomId, chatMessage);
    io.to(roomId).emit("new_message", chatMessage);
  });
}
