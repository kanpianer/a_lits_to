import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";

interface TaskItem {
  id: string;
  text: string;
  checked: boolean;
  checkedColorIndex?: number;
}

interface ClientConnection {
  socketId: string;
  clientId?: string;
  colorIndex: number;
}

interface TaskList {
  id: string;
  title: string;
  items: TaskItem[];
  createdAt: number;
  connections: ClientConnection[];
  assignedColorIndices?: number[];
  clientColors?: Record<string, number>;
}

// In-memory store
const taskLists = new Map<string, TaskList>();
const socketToList = new Map<string, string>();

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function assignColorIndex(list: TaskList): number {
  if (!list.assignedColorIndices) {
    list.assignedColorIndices = [];
  }
  const activeIndices = new Set(list.connections.map(c => c.colorIndex));
  const historicallyAssigned = new Set(list.assignedColorIndices);
  
  let availableIndices = [];
  for (let i = 0; i < 15; i++) {
    if (!historicallyAssigned.has(i)) {
      availableIndices.push(i);
    }
  }

  if (availableIndices.length === 0) {
    for (let i = 0; i < 15; i++) {
      if (!activeIndices.has(i)) {
        availableIndices.push(i);
      }
    }
  }

  if (availableIndices.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableIndices.length);
    const assignedIndex = availableIndices[randomIndex];
    
    if (!list.assignedColorIndices.includes(assignedIndex)) {
      list.assignedColorIndices.push(assignedIndex);
    }
    
    return assignedIndex;
  }
  return 0;
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, list] of taskLists.entries()) {
    if (now - list.createdAt > FOURTEEN_DAYS_MS) {
      taskLists.delete(id);
    }
  }
}, 60 * 60 * 1000); // Check every hour

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    const handleJoinList = (listId: string, isCreate: boolean, clientId?: string) => {
      let list = taskLists.get(listId);
      if (!list) {
        if (isCreate) {
          list = {
            id: listId,
            title: "",
            items: [],
            createdAt: Date.now(),
            connections: []
          };
          taskLists.set(listId, list);
        } else {
          socket.emit("list_not_found");
          return;
        }
      }
      
      // Check limits
      if (list.connections.length >= 15 && !list.connections.find(c => c.socketId === socket.id)) {
        socket.emit("room_full");
        return;
      }

      // Add connection
      let colorIndex = 0;
      const existingConn = list.connections.find(c => c.socketId === socket.id);
      if (!existingConn) {
        if (!list.clientColors) {
          list.clientColors = {};
        }
        if (clientId && typeof list.clientColors[clientId] === "number") {
          colorIndex = list.clientColors[clientId];
        } else {
          colorIndex = assignColorIndex(list);
          if (clientId) {
            list.clientColors[clientId] = colorIndex;
          }
        }
        list.connections.push({ socketId: socket.id, clientId, colorIndex });
        socketToList.set(socket.id, listId);
      } else {
        colorIndex = existingConn.colorIndex;
      }

      socket.join(listId);
      socket.emit("sync_state", list);
      socket.emit("your_color_index", colorIndex);
    };

    socket.on("join_list", (data: string | { listId: string, clientId?: string }) => {
      if (typeof data === "string") {
        handleJoinList(data, false);
      } else {
        handleJoinList(data.listId, false, data.clientId);
      }
    });

    socket.on("create_list", (data: string | { listId: string, clientId?: string }) => {
      if (typeof data === "string") {
        handleJoinList(data, true);
      } else {
        handleJoinList(data.listId, true, data.clientId);
      }
    });

    socket.on("update_title", ({ listId, title }: { listId: string, title: string }) => {
      const list = taskLists.get(listId);
      if (list) {
        let currentLen = 0;
        let allowedVal = "";
        for (let i = 0; i < title.length; i++) {
          const charLen = title.charCodeAt(i) > 255 ? 2 : 1;
          if (currentLen + charLen > 18) break;
          currentLen += charLen;
          allowedVal += title[i];
        }
        list.title = allowedVal;
        socket.to(listId).emit("title_updated", allowedVal);
      }
    });

    socket.on("add_item", ({ listId, item }: { listId: string, item: TaskItem }) => {
      const list = taskLists.get(listId);
      if (list) {
        if (list.items.length >= 88) return;
        if (item.text.length > 200) item.text = item.text.substring(0, 200);
        
        // Ensure no duplicates
        if (!list.items.find(i => i.id === item.id)) {
          list.items.unshift(item);
          io.to(listId).emit("item_added", item);
        }
      }
    });

    socket.on("toggle_item", ({ listId, itemId, checked }: { listId: string, itemId: string, checked: boolean }) => {
      const list = taskLists.get(listId);
      if (list) {
        const item = list.items.find(i => i.id === itemId);
        if (item) {
          item.checked = checked;
          if (checked) {
             const conn = list.connections.find(c => c.socketId === socket.id);
             if (conn) {
                item.checkedColorIndex = conn.colorIndex;
             }
          } else {
             item.checkedColorIndex = undefined;
          }
          socket.to(listId).emit("item_toggled", { itemId, checked, checkedColorIndex: item.checkedColorIndex });
        }
      }
    });

    socket.on("reorder_items", ({ listId, items }: { listId: string, items: TaskItem[] }) => {
      const list = taskLists.get(listId);
      if (list) {
        list.items = items;
        socket.to(listId).emit("items_reordered", items);
      }
    });

    socket.on("delete_item", ({ listId, itemId }: { listId: string, itemId: string }) => {
      const list = taskLists.get(listId);
      if (list) {
        list.items = list.items.filter(i => i.id !== itemId);
        socket.to(listId).emit("item_deleted", itemId);
      }
    });

    socket.on("delete_list", ({ listId }: { listId: string }) => {
      taskLists.delete(listId);
      io.to(listId).emit("list_deleted");
    });

    socket.on("disconnect", () => {
      const listId = socketToList.get(socket.id);
      if (listId) {
        const list = taskLists.get(listId);
        if (list) {
          list.connections = list.connections.filter(c => c.socketId !== socket.id);
        }
        socketToList.delete(socket.id);
      }
    });
  });

  // API routes if needed...

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
