const fs = require('fs');
let content = fs.readFileSync('src/pages/Qna/QnaPage.tsx', 'utf-8');

// Replace className={cn('a', 'b', ...)} with className="a b ..."
content = content.replace(/className=\{cn\(([^)]+)\)\}/g, (match, args) => {
  // Remove single quotes and newlines, then replace commas/spaces with a single space
  const cleanStr = args
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/\r?\n/g, '')
    .replace(/,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return `className="${cleanStr}"`;
});

// Remove unused import of cn
content = content.replace(/import { cn } from "\.\.\/\.\.\/lib\/utils";\r?\n/, '');

fs.writeFileSync('src/pages/Qna/QnaPage.tsx', content);
console.log('Done!');
