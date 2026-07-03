import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const socketListener = `
    newSocket.on("item_text_updated", ({ itemId, text }: { itemId: string, text: string }) => {
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, text } : i,
          ),
        };
      });
    });
`;

content = content.replace(/newSocket\.on\("item_deleted",/, socketListener.trim() + '\n\n    newSocket.on("item_deleted",');

fs.writeFileSync('src/App.tsx', content);
