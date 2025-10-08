#!/usr/bin/env node

/**
 * Generate a one-click Mermaid Live Editor URL from a mermaid diagram
 * Usage: node scripts/generate-mermaid-url.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Read the database schema file
const schemaPath = path.join(__dirname, '../docs/technical/database-schema.mdx');
const content = fs.readFileSync(schemaPath, 'utf8');

// Extract mermaid diagram
const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);
if (!mermaidMatch) {
  console.error('No mermaid diagram found in file');
  process.exit(1);
}

const mermaidCode = mermaidMatch[1];

// Create the JSON structure expected by Mermaid Live Editor
const payload = {
  code: mermaidCode,
  mermaid: {
    theme: 'default'
  },
  autoSync: true,
  updateDiagram: true,
  editorMode: 'code'
};

const jsonString = JSON.stringify(payload);

// Compress using pako (zlib deflate)
const compressed = zlib.deflateSync(Buffer.from(jsonString, 'utf8'));

// Base64 encode and make URL-safe
const base64 = compressed.toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

// Generate the URL
const url = `https://mermaid.live/edit#pako:${base64}`;

console.log('\n✅ Mermaid Live Editor URL generated:\n');
console.log(url);
console.log('\n📋 URL length:', url.length);
console.log('✨ Copy this URL to your documentation for one-click diagram viewing!\n');
