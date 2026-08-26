const fs = require('fs');
const files = [
  'frontend/src/app/custom-plan/page.tsx',
  'frontend/src/lib/placeholder-data.ts',
  'frontend/src/components/home/HowItWorks.tsx'
];
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/"standard"/g, '"essential"');
    content = content.replace(/"premium"/g, '"signature"');
    content = content.replace(/"luxe"/g, '"grand"');
    
    // Also replace title case
    content = content.replace(/Standard/g, 'Essential');
    content = content.replace(/Premium/g, 'Signature');
    content = content.replace(/Luxe/g, 'Grand');
    
    content = content.replace(/STANDARD/g, 'ESSENTIAL');
    content = content.replace(/PREMIUM/g, 'SIGNATURE');
    content = content.replace(/LUXE/g, 'GRAND');
    fs.writeFileSync(file, content, 'utf-8');
  }
}
