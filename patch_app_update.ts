import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const updateFunction = `
  const handleUpdateTaskText = (itemId: string, newText: string) => {
    if (!list || !socket) return;
    
    setList({
      ...list,
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, text: newText } : i,
      ),
    });

    socket.emit("update_item_text", { listId, itemId, text: newText });
  };
`;

content = content.replace(/  const toggleExpand = \(itemId: string\) => \{/, updateFunction.trim() + '\n\n  const toggleExpand = (itemId: string) => {');

fs.writeFileSync('src/App.tsx', content);
