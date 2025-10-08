# Content Manager Quick Start Guide

Welcome! This guide will help you edit and manage the Hotel Inventory documentation with zero technical setup required.

## 🎯 Your Mission

You'll be editing documentation files to keep them accurate, clear, and helpful for users.

**No coding required!** All editing is done in simple Markdown format (like writing in a text editor with formatting).

## 🚀 Quick Start (5 Minutes)

### Option 1: Edit on GitHub (Easiest - No Setup)

**Perfect if you want to start immediately without installing anything**

1. **Get Access**:
   - Wait for GitHub invitation email
   - Click "Accept invitation"
   - You now have access!

2. **Find a File to Edit**:
   - Go to the repository
   - Click the `docs/` folder
   - Navigate to any `.mdx` file (e.g., `introduction.mdx`)

3. **Edit the File**:
   - Click the **pencil icon** (✏️) in the top right
   - Make your changes using Markdown
   - Scroll to bottom

4. **Save Changes**:
   - Add a commit message (e.g., "Updated introduction text")
   - Click "Commit changes"
   - Done! Changes will go live after review

5. **Preview Your Changes**:
   - A preview URL will be automatically generated
   - Click the preview link to see your changes live
   - Share the preview link for feedback

### Option 2: Edit Locally with VSCode (Better for Frequent Edits)

**Perfect if you'll be editing frequently and want live preview**

1. **Install Tools** (one-time setup):
   - Download [Visual Studio Code](https://code.visualstudio.com/)
   - Download [Git](https://git-scm.com/)
   - Install [Node.js](https://nodejs.org/) (choose LTS version)

2. **Clone the Repository**:
   ```bash
   # Open Terminal (Mac) or Command Prompt (Windows)
   cd Documents
   git clone https://github.com/your-username/hotel-inventory.git
   cd hotel-inventory/docs
   ```

3. **Install Mintlify**:
   ```bash
   npm install -g mintlify
   ```

4. **Start Preview Server**:
   ```bash
   mintlify dev
   ```

5. **Open Browser**:
   - Go to http://localhost:3000
   - You'll see a live preview of the docs
   - **Any change you make will update instantly!**

6. **Edit Files**:
   - Open VSCode
   - File → Open Folder → Select `docs/` folder
   - Edit any `.mdx` file
   - Save (Cmd+S or Ctrl+S)
   - See changes instantly in browser

7. **Submit Changes**:
   ```bash
   git add .
   git commit -m "Updated feature documentation"
   git push
   ```

## 📝 Markdown Basics

MDX is just Markdown with superpowers. Here's everything you need:

### Text Formatting

```markdown
# Large Heading (Page Title)
## Medium Heading (Section)
### Small Heading (Subsection)

**Bold text** - for emphasis
*Italic text* - for subtle emphasis
`Code text` - for technical terms

Regular paragraph text. Just write normally!

- Bullet point 1
- Bullet point 2
- Bullet point 3

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3
```

### Links

```markdown
[Link text here](https://example.com)

Internal link to another doc page:
[See Installation Guide](/installation)
```

### Images

```markdown
![Alt text for image](/images/screenshot.png)

# Or with caption:
<img src="/images/demo.png" alt="Demo screenshot" />
```

### Code Blocks

````markdown
```javascript
const example = "code block";
console.log(example);
```

```typescript
// TypeScript example
interface Hotel {
  name: string;
  rooms: number;
}
```
````

### Special Callout Boxes

```mdx
<Note>
  This is an informational note box - use for helpful tips
</Note>

<Warning>
  This is a warning box - use for important cautions
</Warning>

<Tip>
  This is a tip box - use for pro tips
</Tip>
```

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

## 📂 File Structure

Here's where everything lives:

```
docs/
├── introduction.mdx              # Landing page (start here!)
├── quickstart.mdx                # Quick start guide
├── installation.mdx              # Installation instructions
│
├── features/                     # Feature documentation
│   ├── hotel-management.mdx      # Hotel management features
│   ├── front-desk.mdx           # Front desk features
│   ├── finance.mdx              # Finance module
│   ├── reservations.mdx         # Reservation system
│   └── channel-manager.mdx      # Channel manager integration
│
├── integrations/                 # Integration guides
│   ├── croatian-fiscalization.mdx
│   ├── channel-manager-setup.mdx
│   └── supabase-setup.mdx
│
├── technical/                    # Technical documentation
│   ├── architecture.mdx
│   ├── database-schema.mdx
│   ├── backend-api.mdx
│   ├── edge-functions.mdx
│   └── api-reference.mdx
│
└── development/                  # Developer guides
    ├── setup.mdx
    ├── contributing.mdx
    └── testing.mdx
```

**Pro Tip**: Start by editing `introduction.mdx` - it's the most visible page!

## 🎨 Adding a New Page

1. **Create the file**:
   ```bash
   # In the docs/ directory
   touch features/new-feature.mdx
   ```

2. **Add frontmatter** (metadata at top of file):
   ```mdx
   ---
   title: "New Feature Name"
   description: "Brief description of this feature"
   ---

   # New Feature Name

   Your content here...
   ```

3. **Update navigation** (`mint.json`):
   ```json
   {
     "group": "Core Features",
     "pages": [
       "features/hotel-management",
       "features/front-desk",
       "features/new-feature"  // Add your new page here
     ]
   }
   ```

4. **Preview and test**:
   - Check http://localhost:3000
   - Verify new page appears in navigation
   - Check all links work

## ✅ Content Checklist

Before submitting changes:

- [ ] **Spelling**: Run spell-check
- [ ] **Links**: All links work (internal and external)
- [ ] **Images**: All images load correctly
- [ ] **Formatting**: Headings are properly nested (H1 → H2 → H3)
- [ ] **Code**: Code blocks have language specified
- [ ] **Preview**: Checked in local preview (http://localhost:3000)
- [ ] **Navigation**: New pages added to mint.json
- [ ] **Consistency**: Matches tone/style of existing docs

## 🔄 Workflow Best Practices

### For Small Changes (Typos, Updates)

**Use GitHub web editor**:
1. Find file on GitHub
2. Click pencil icon
3. Make change
4. Commit directly to main branch
5. Changes go live after automatic build

### For Larger Changes (New Pages, Major Edits)

**Use Pull Request workflow**:
1. Create a new branch
2. Make your changes
3. Submit pull request
4. Get review from team
5. Merge when approved

### Collaboration Tips

1. **Communicate**: Leave clear commit messages
   - ✅ "Updated channel manager setup instructions"
   - ❌ "Changes"

2. **Preview First**: Always check preview URL before merging

3. **Ask Questions**: Not sure about something? Ask the dev team!

4. **Follow Style**: Match the tone and format of existing docs

## 🆘 Common Issues & Solutions

### Issue: "Can't find the file to edit"

**Solution**:
- Files end in `.mdx` not `.md`
- Check you're in the `docs/` directory
- Use GitHub's search feature

### Issue: "Preview not updating"

**Solution**:
```bash
# Stop the preview server (Ctrl+C)
# Restart it
mintlify dev
```

### Issue: "Build error after my changes"

**Solution**:
- Check for unclosed brackets or quotes
- Verify code block formatting (need 3 backticks)
- Check MDX syntax in callout boxes

### Issue: "Image not showing"

**Solution**:
- Ensure image is in `docs/` directory
- Use absolute path: `/images/screenshot.png`
- Check file extension matches (case-sensitive!)

### Issue: "Navigation not showing my new page"

**Solution**:
- Add page to `mint.json` navigation array
- Restart preview server
- Check file path is correct

## 📞 Getting Help

**Quick Questions**:
- Slack channel: #documentation
- Email: dev-team@company.com

**Documentation Resources**:
- [Markdown Guide](https://www.markdownguide.org/)
- [Mintlify Docs](https://mintlify.com/docs)
- [MDX Documentation](https://mdxjs.com/)

**Technical Issues**:
- Contact development team
- Open GitHub issue
- Check build logs on Vercel/Netlify

## 🎓 Learning Path

**Week 1**:
- Edit existing pages (typos, updates)
- Get comfortable with GitHub web editor
- Review preview URLs

**Week 2**:
- Set up local environment
- Make larger content updates
- Practice pull request workflow

**Week 3**:
- Add new pages
- Organize navigation
- Update images and assets

**Month 2+**:
- Own entire documentation sections
- Review others' contributions
- Maintain documentation quality

## 🌟 Pro Tips

1. **Use Preview URLs**: Share with stakeholders before merging
2. **Keep Backups**: Git saves everything - you can always undo
3. **Test Links**: Click every link before submitting
4. **Mobile Check**: Preview on phone/tablet too
5. **Screenshots**: Update screenshots when UI changes
6. **Version Notes**: Add "Last updated" dates to major pages
7. **Search**: Keep documentation searchable with good keywords
8. **Consistency**: Use same terminology throughout docs

## ✨ You're Ready!

You now know everything needed to manage the documentation. Start small, preview often, and don't hesitate to ask questions!

**First Task**: Try editing `introduction.mdx` - fix a typo or improve a sentence. Use GitHub web editor, commit, and see your changes go live!

**Remember**:
- 🎯 Preview before publishing
- 💬 Clear commit messages
- 🔗 Test all links
- 📱 Check on different devices
- 🤝 Ask for help when needed

Welcome to the team! 🚀

---

**Questions?** Contact the development team or check our internal wiki for more resources.
