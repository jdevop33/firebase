const fs = require("fs");
const path = require("path");

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

const tsxFiles = findTSXFiles(".");

tsxFiles.forEach(file => {
  let content = fs.readFileSync(file, "utf8");

  // Remove duplicate `import React` lines
  content = content.replace(/^import React from "react";\n?/gm, "");

  // Remove `import * as React from "react";` if present
  content = content.replace(/^import \* as React from "react";\n?/gm, "");

  // Ensure `"use client";` is always at the top
  content = content.replace(/(["']use client["'];\n?)/g, "$1\n");

  fs.writeFileSync(file, content, "utf8");
  console.log(`✅ Cleaned: ${file}`);
});

console.log("🎯 All .tsx files are cleaned!");
