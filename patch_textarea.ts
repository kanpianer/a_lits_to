import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `onChange={(e) => setEditText(e.target.value)}`;
const replacement = `onChange={(e) => {
                setEditText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}`;

content = content.replace(target, replacement);

fs.writeFileSync('src/App.tsx', content);
