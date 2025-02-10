const fs = require("fs");
const path = require("path");

// Function to recursively scan for .tsx files
function findTSXFiles(dir, files = []) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findTSXFiles(filePath, files);
    } else if (filePath.endsWith(".tsx")) {
      files.push(filePath);
    }
  });
  return files;
}

// Get all .tsx files
const tsxFiles = findTSXFiles(".");

tsxFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  if (!content.includes('import React from "react";')) {
    const updatedContent = `import React from "react";\n${content}`;
    fs.writeFileSync(file, updatedContent, "utf8");
    console.log(`✅ Fixed: ${file}`);
  }
});

console.log("🎯 All .tsx files are updated.");