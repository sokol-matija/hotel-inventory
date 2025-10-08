# Documentation Quick Reference Card

## 🚀 Essential Commands

```bash
# Start local preview
cd docs && mintlify dev

# Deploy to Vercel
cd docs && vercel --prod

# Deploy to Netlify
cd docs && netlify deploy --prod

# Install all CLIs
npm run install-cli
```

## 📁 File Locations

- **Config**: `docs/mint.json`
- **Content**: `docs/**/*.mdx`
- **Images**: `docs/` (use absolute paths `/image.png`)
- **Logo**: `docs/logo.png`
- **Favicon**: `docs/favicon.ico`

## 🔗 Important URLs

- **Local Preview**: http://localhost:3000
- **Mintlify Docs**: https://mintlify.com/docs
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com

## ✏️ Quick Edits

**Edit on GitHub**:
1. Navigate to file
2. Click pencil icon (✏️)
3. Make changes
4. Commit

**Edit Locally**:
1. `mintlify dev`
2. Edit .mdx files
3. Save (changes appear instantly)
4. `git add . && git commit -m "message" && git push`

## 📝 Common MDX Syntax

```mdx
# Heading
## Subheading

**Bold** *Italic* `Code`

[Link](url)

<Note>Info box</Note>
<Warning>Warning box</Warning>

\`\`\`typescript
code block
\`\`\`
```

## 🐛 Troubleshooting

**Build fails**: Check `mint.json` syntax
**Preview not updating**: Restart `mintlify dev`
**Images broken**: Use absolute paths `/image.png`
**Page not in nav**: Add to `mint.json`

## 👥 Content Manager Access

1. Invite to GitHub repo (write access)
2. Share `CONTENT_MANAGER_GUIDE.md`
3. Set up preview deployments
4. Provide preview URL for reviews

## 📊 Deployment Status

Check build status:
- **Vercel**: https://vercel.com/dashboard
- **Netlify**: https://app.netlify.com

## 🎯 Next Steps

1. ✅ Docs running locally
2. ⏳ Deploy to Vercel/Netlify
3. ⏳ Set up custom domain (optional)
4. ⏳ Invite content manager
5. ⏳ Configure analytics (optional)

---

**Need Help?** See `DEPLOYMENT_GUIDE.md` or `CONTENT_MANAGER_GUIDE.md`
