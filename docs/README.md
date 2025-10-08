# Hotel Inventory Management System - Documentation

This directory contains the complete documentation for the Hotel Inventory Management System, built with [Mintlify](https://mintlify.com).

## 📚 Documentation Overview

Comprehensive guides covering:
- **Getting Started**: Introduction, quickstart, and installation
- **Core Features**: Hotel management, front desk, finance, reservations, channel manager
- **Integration Guides**: Croatian fiscalization, channel manager setup, Supabase configuration
- **Technical Documentation**: Architecture, database schema, API reference, edge functions
- **Development**: Setup, contributing guidelines, testing

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- Mintlify CLI

### Quick Start

1. Install Mintlify CLI globally:
```bash
npm install -g mintlify
```

2. Navigate to docs directory:
```bash
cd docs
```

3. Start the development server:
```bash
mintlify dev
```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Preview URLs)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy from docs directory:
```bash
cd docs
vercel
```

3. Follow the prompts to deploy

**Advantages:**
- Instant preview URLs for every commit
- Automatic deployments on git push
- Free SSL certificates
- Great collaboration features
- Easy to share preview links with content managers

### Option 2: Netlify (Alternative)

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy from docs directory:
```bash
cd docs
netlify deploy
```

3. For production deployment:
```bash
netlify deploy --prod
```

**Advantages:**
- Simple drag-and-drop deployment
- Form handling and serverless functions
- Split testing capabilities

### Option 3: Mintlify Hosting (Premium)

Mintlify offers managed hosting with:
- Custom domain support
- Advanced analytics
- Team collaboration features
- Priority support

Visit [mintlify.com/hosting](https://mintlify.com/hosting) for details.

## 👥 Content Manager Collaboration

### For Non-Technical Content Managers

#### Method 1: GitHub Collaboration (Recommended)

1. **Grant Access**: Invite your content manager to the GitHub repository with write access
2. **GitHub Web Editor**: Content can be edited directly on GitHub.com:
   - Navigate to any `.mdx` file in the `docs/` directory
   - Click the pencil icon (✏️) to edit
   - Make changes using Markdown
   - Click "Commit changes" to save

3. **Preview Changes**:
   - Enable Vercel/Netlify integration with your GitHub repo
   - Every commit creates a preview URL automatically
   - Share preview URLs for review before merging

#### Method 2: Local Editing with VSCode

1. **Setup**:
   - Install [Visual Studio Code](https://code.visualstudio.com/)
   - Install Git
   - Clone the repository

2. **Editing Workflow**:
   ```bash
   cd docs
   mintlify dev  # Preview changes at localhost:3000
   ```

3. **Recommended VSCode Extensions**:
   - Markdown All in One
   - Mintlify Doc Writer
   - GitHub Pull Requests

#### Method 3: Content Management System Integration

For a more traditional CMS experience, consider:
- **Forestry.io**: Git-based CMS for Markdown
- **NetlifyCMS**: Open-source content management
- **TinaCMS**: Real-time editing experience

### Content Structure

All documentation files are in MDX format (Markdown with React components):

```
docs/
├── introduction.mdx          # Main landing page
├── quickstart.mdx            # Quick start guide
├── installation.mdx          # Installation instructions
├── features/                 # Feature documentation
│   ├── hotel-management.mdx
│   ├── front-desk.mdx
│   ├── finance.mdx
│   ├── reservations.mdx
│   └── channel-manager.mdx
├── integrations/             # Integration guides
├── technical/                # Technical docs
└── development/              # Dev guides
```

### MDX Syntax Quick Reference

```mdx
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`Inline code`

[Link text](https://example.com)

\`\`\`typescript
// Code block
const example = "code";
\`\`\`

<Note>
  This is a callout note
</Note>

<Warning>
  This is a warning callout
</Warning>
```

## 📝 Editing Guidelines

### For Content Managers

1. **Always work on a branch**: Never edit `main` directly
2. **Preview before publishing**: Use preview URLs to review changes
3. **Follow the style guide**: Match existing documentation tone
4. **Update navigation**: If adding new pages, update `mint.json`
5. **Check links**: Ensure all internal links work correctly

### Making Changes

1. Create a new branch:
```bash
git checkout -b docs/update-feature-name
```

2. Make your edits to `.mdx` files

3. Preview locally:
```bash
mintlify dev
```

4. Commit and push:
```bash
git add .
git commit -m "docs: update feature documentation"
git push origin docs/update-feature-name
```

5. Create a Pull Request on GitHub

## 🎨 Customization

Edit `mint.json` to customize:
- **Branding**: Logo, favicon, colors
- **Navigation**: Add/remove pages and sections
- **Integrations**: Analytics, search, feedback
- **Features**: Enable/disable components

## 📧 Support & Collaboration

**For Content Managers:**
- Documentation questions: See [Mintlify Docs](https://mintlify.com/docs)
- Technical support: Contact development team
- Content guidelines: See style guide in repository

**For Developers:**
- Mintlify CLI: `mintlify help`
- Build issues: Check build logs in deployment platform
- API reference: [Mintlify API Docs](https://mintlify.com/docs/api-reference)

## 🔗 Useful Links

- **Local Preview**: http://localhost:3000
- **Mintlify Documentation**: https://mintlify.com/docs
- **Markdown Guide**: https://www.markdownguide.org/
- **MDX Documentation**: https://mdxjs.com/

## 🚨 Troubleshooting

**Build fails with "Invalid mint.json":**
- Validate JSON syntax at jsonlint.com
- Ensure all required fields are present
- Check file paths for navigation pages

**Images not loading:**
- Place images in `docs/` directory or subdirectories
- Use relative paths: `/images/screenshot.png`
- Supported formats: PNG, JPG, SVG, GIF

**Preview not updating:**
- Clear browser cache
- Restart Mintlify dev server
- Check for syntax errors in MDX files

---

**Last Updated**: October 2025
**Version**: 1.0
**Maintainer**: Development Team
