# Documentation Deployment Guide

Complete guide for deploying Hotel Inventory documentation to production.

## 🎯 Quick Start

Your documentation is **already running** locally at http://localhost:3000

## 📦 Deployment Options Comparison

| Platform | Best For | Setup Time | Cost | Preview URLs |
|----------|----------|------------|------|--------------|
| **Vercel** | Sharing with content managers | 5 min | Free | ✅ Automatic |
| **Netlify** | Alternative hosting | 5 min | Free | ✅ Automatic |
| **Mintlify** | Premium features | 10 min | Paid | ✅ Premium |

## 🚀 Deploy to Vercel (Recommended)

### Why Vercel?
- ✅ **Instant preview URLs** for every commit (perfect for content manager collaboration)
- ✅ **Automatic deployments** from GitHub
- ✅ **Free SSL certificates**
- ✅ **Zero configuration** needed
- ✅ **Best for sharing** with non-technical team members

### Step-by-Step Deployment

#### Option A: GitHub Integration (Easiest - Recommended)

1. **Push your docs to GitHub** (if not already):
```bash
cd /Users/msokol/Dev/Repos/2-Personal/hotel-inventory
git add docs/
git commit -m "docs: add Mintlify documentation setup"
git push origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure:
     - **Framework Preset**: Other
     - **Root Directory**: `docs`
     - **Build Command**: `mintlify build`
     - **Output Directory**: `.mintlify`
   - Click "Deploy"

3. **Done!** Your docs will be live at: `https://hotel-inventory-docs.vercel.app`

#### Option B: Vercel CLI (Manual)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy from docs directory**:
```bash
cd docs
vercel
```

3. **Follow prompts**:
   - Setup and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No**
   - Project name: `hotel-inventory-docs`
   - Directory: `./` (you're already in docs/)
   - Build command: `mintlify build`
   - Output directory: `.mintlify`

4. **Deploy to production**:
```bash
vercel --prod
```

### Auto-Deploy on Git Push

Once connected via GitHub:
- Every push to `main` = production deployment
- Every PR = preview deployment with unique URL
- Perfect for content manager review workflow

## 🌐 Deploy to Netlify (Alternative)

### Step-by-Step

#### Option A: Drag & Drop (Simplest)

1. Build locally:
```bash
cd docs
mintlify build
```

2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the `.mintlify` folder to the page
4. Done! Docs deployed in seconds

#### Option B: GitHub Integration

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Import from Git"
3. Select your repository
4. Configure:
   - **Base directory**: `docs`
   - **Build command**: `npm install -g mintlify && mintlify build`
   - **Publish directory**: `docs/.mintlify`
5. Click "Deploy"

#### Option C: Netlify CLI

1. **Install CLI**:
```bash
npm install -g netlify-cli
```

2. **Initialize and deploy**:
```bash
cd docs
netlify init
netlify deploy --prod
```

## 💼 Content Manager Collaboration Setup

### Step 1: Deploy with Preview URLs

Choose **Vercel GitHub integration** for best experience:
- Automatic preview URLs for every change
- No manual deployment needed
- Content manager can see changes instantly

### Step 2: Grant Access

#### For GitHub-based collaboration:

1. **Invite content manager to GitHub repo**:
   - Go to repository settings
   - Navigate to "Collaborators"
   - Add content manager with "Write" access

2. **Set up preview workflow**:
   - Content manager edits files on GitHub web interface
   - Creates pull request
   - Preview URL automatically generated
   - Review changes at preview URL
   - Merge when approved

#### For CMS-based collaboration:

1. **Install Forestry.io** (recommended):
```bash
# Add Forestry configuration
mkdir -p docs/.forestry
```

2. **Connect Forestry to GitHub**:
   - Go to [forestry.io](https://forestry.io)
   - Import GitHub repository
   - Configure content models
   - Invite content manager

### Step 3: Share Access

Send content manager:
```
🎉 Documentation Site Setup Complete!

📖 Live Documentation: https://your-docs.vercel.app
🔗 GitHub Repository: https://github.com/your-username/hotel-inventory

For editing documentation:
1. Login to GitHub with your invited account
2. Navigate to docs/ folder
3. Click any .mdx file
4. Click pencil icon to edit
5. Preview changes at automatic preview URL
6. Submit pull request when ready

Questions? Check the README in docs/README.md
```

## 🔧 Custom Domain Setup

### Vercel

1. Go to Project Settings → Domains
2. Add your domain (e.g., `docs.yourdomain.com`)
3. Configure DNS:
```
Type: CNAME
Name: docs
Value: cname.vercel-dns.com
```
4. SSL automatically provisioned

### Netlify

1. Go to Domain Settings → Add custom domain
2. Configure DNS:
```
Type: CNAME
Name: docs
Value: your-site.netlify.app
```
3. Enable HTTPS

## 📊 Analytics Setup (Optional)

### Google Analytics

Add to `mint.json`:
```json
{
  "analytics": {
    "ga4": {
      "measurementId": "G-XXXXXXXXXX"
    }
  }
}
```

### Posthog

```json
{
  "analytics": {
    "posthog": {
      "apiKey": "your-api-key"
    }
  }
}
```

## 🐛 Troubleshooting

### Build fails on Vercel/Netlify

**Issue**: "mintlify: command not found"

**Solution**: Update build command:
```bash
npm install -g mintlify && mintlify build
```

### Preview not updating

**Issue**: Changes not reflected on deployed site

**Solution**:
1. Clear build cache on Vercel/Netlify
2. Trigger manual deployment
3. Check build logs for errors

### Images not loading

**Issue**: Images show as broken

**Solution**:
1. Ensure images are in `docs/` directory
2. Use absolute paths: `/images/logo.png`
3. Check file extensions (case-sensitive)

## 📝 Deployment Checklist

Before sharing with content manager:

- [ ] Documentation runs locally (`mintlify dev`)
- [ ] All pages load without errors
- [ ] Images and assets display correctly
- [ ] Navigation structure is correct
- [ ] Deployed to Vercel/Netlify successfully
- [ ] Custom domain configured (if needed)
- [ ] Preview URLs working
- [ ] Content manager has GitHub access
- [ ] README and guides shared with team
- [ ] Analytics configured (optional)

## 🚀 Next Steps

1. **Share with stakeholders**:
   - Send live URL to investors/partners
   - Share preview URLs for feedback

2. **Enable collaboration**:
   - Set up GitHub access for content team
   - Configure preview deployment workflow
   - Create content style guide

3. **Optimize**:
   - Add search functionality
   - Configure SEO settings
   - Set up custom domain

4. **Monitor**:
   - Check analytics
   - Review deployment logs
   - Update content regularly

## 📞 Support

**Deployment Issues:**
- Vercel: [vercel.com/support](https://vercel.com/support)
- Netlify: [netlify.com/support](https://netlify.com/support)
- Mintlify: [mintlify.com/docs](https://mintlify.com/docs)

**Content Collaboration:**
- See `docs/README.md` for content manager guide
- GitHub documentation for pull request workflow

---

**Ready to deploy?** Start with Vercel GitHub integration for the smoothest experience! 🚀
