const fs = require('fs');
const path = require('path');

// Define all directories to create
const directories = [
  'src',
  'src/controllers',
  'src/routes',
  'src/utils',
  'public',
  'data',
  'data/config'
];

// Define all files to create
const files = {
  'package.json': `{
  "name": "grocery-notification-system",
  "version": "1.0.0",
  "description": "Grocery chain inventory notification system",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "keywords": ["grocery", "notifications", "inventory"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "xlsx": "^0.18.5",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "body-parser": "^1.20.2"
  }
}`,

  '.env.example': `PORT=3000
NODE_ENV=development`,

  'src/server.js': `// This file will be generated in the next step`,

  'src/controllers/uploadController.js': `// This file will be generated in the next step`,

  'src/routes/api.js': `// This file will be generated in the next step`,

  'src/utils/excelParser.js': `// This file will be generated in the next step`,

  'src/utils/notificationEngine.js': `// This file will be generated in the next step`,

  'src/utils/configLoader.js': `// This file will be generated in the next step`,

  'public/index.html': `<!-- This file will be generated in the next step -->`,

  'public/style.css': `/* This file will be generated in the next step */`,

  'public/main.js': `// This file will be generated in the next step`,

  '.gitignore': `node_modules/
.env
*.log
.DS_Store`
};

// Create directories
console.log('Creating directories...');
directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${dir}`);
  } else {
    console.log(`✓ Already exists: ${dir}`);
  }
});

// Create files
console.log('\nCreating files...');
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Created: ${filePath}`);
  } else {
    console.log(`✓ Already exists: ${filePath}`);
  }
});

console.log('\n✅ Project structure created successfully!');
console.log('\nNext steps:');
console.log('1. Copy your files to data/ folder:');
console.log('   - Grocery_Chain_Daily_Sales.xlsx');
console.log('   - thresholds_config.json (into data/config/)');
console.log('\n2. Run: npm install');
console.log('\n3. Wait for more code files to be provided');
console.log('\nYour project is ready! 🚀');
