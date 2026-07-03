import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /handleToggleTask=\{handleToggleTask\}/g,
  'handleToggleTask={handleToggleTask}\n                  handleUpdateTaskText={handleUpdateTaskText}'
);

fs.writeFileSync('src/App.tsx', content);
