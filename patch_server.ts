import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const updateItemTextCode = `
    socket.on("update_item_text", ({ listId, itemId, text }: { listId: string, itemId: string, text: string }) => {
      const list = taskLists.get(listId);
      if (list) {
        const item = list.items.find(i => i.id === itemId);
        if (item) {
          if (text.length > 200) text = text.substring(0, 200);
          item.text = text;
          socket.to(listId).emit("item_text_updated", { itemId, text });
        }
      }
    });
`;

content = content.replace(/socket\.on\("toggle_item",/, updateItemTextCode.trim() + '\n\n    socket.on("toggle_item",');

fs.writeFileSync('server.ts', content);
