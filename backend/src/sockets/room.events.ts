import type { Server, Socket } from "socket.io";
import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import {
  roomExists,
  getRoomOwner,
  addChatMessage,
  getChatMessages,
  removeChatMessage,
  markChatMessageAnswered,
  incrementPollOption,
  getPollResults,
  createPoll,
  getPolls,
} from "../services/redisState.js";

export function registerRoomEvents(io: Server, socket: Socket, app: FastifyInstance) {
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

    const chat = await getChatMessages(code);
    const polls = await getPolls(code);
    socket.emit("room_state", { chat, polls });
  });

  socket.on("send_chat", async ({ roomId, content }: { roomId: string; content: string }) => {
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return socket.emit("error", { message: "Message cannot be empty" });
    }

    const message = {
      id: nanoid(),
      sessionId: socket.data.sessionId,
      content: content.trim(),
      isAnswered: false,
      timestamp: Date.now(),
    };

    await addChatMessage(roomId, message);
    io.to(roomId).emit("new_message", message);
  });

  socket.on("delete_chat", async ({ roomId, messageId }: { roomId: string; messageId: string }) => {
    const messages = await getChatMessages(roomId);
    const target = messages.find((m) => m.id === messageId);

    if (!target) {
      return socket.emit("error", { message: "Message not found" });
    }

    if (target.sessionId !== socket.data.sessionId) {
      return socket.emit("error", { message: "You can only delete your own messages" });
    }

    const removed = await removeChatMessage(roomId, messageId);
    if (removed) {
      io.to(roomId).emit("message_deleted", { messageId });
    }
  });

  socket.on("mark_answered", async ({ roomId, messageId }: { roomId: string; messageId: string }) => {
    const admin = socket.data.admin;
    if (!admin || !admin.admin_id) {
      return socket.emit("error", { message: "Admin access required" });
    }

    const owner = await getRoomOwner(roomId);
    if (!owner || owner !== admin.admin_id) {
      return socket.emit("error", { message: "You do not own this room" });
    }

    const marked = await markChatMessageAnswered(roomId, messageId);
    if (marked) {
      io.to(roomId).emit("message_answered", { messageId });
    } else {
      socket.emit("error", { message: "Message not found" });
    }
  });

  socket.on("create_poll", async ({ roomId, question, options }: { roomId: string; question: string; options: string[] }) => {
    if (!question || !options || options.length < 2) {
      return socket.emit("error", { message: "Poll requires a question and at least 2 options" });
    }

    const admin = socket.data.admin;
    if (!admin || !admin.admin_id) {
      return socket.emit("error", { message: "Admin access required" });
    }

    const owner = await getRoomOwner(roomId);
    if (!owner || owner !== admin.admin_id) {
      return socket.emit("error", { message: "You do not own this room" });
    }

    const poll = {
      id: nanoid(),
      question: question.trim(),
      options: options.map((o) => o.trim()).filter((o) => o.length > 0),
      totalVotes: 0,
    };

    await createPoll(roomId, poll);
    io.to(roomId).emit("poll_created", poll);
  });

  socket.on("submit_poll", async ({ roomId, questionId, optionId }: { roomId: string; questionId: string; optionId: string }) => {
    await incrementPollOption(roomId, questionId, optionId);
    const results = await getPollResults(roomId, questionId);
    io.to(roomId).emit("poll_update", { questionId, results });
  });
}
