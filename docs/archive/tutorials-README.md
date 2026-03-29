# Video Tutorials - Setup Guide

This directory contains comprehensive video tutorial documentation for the Hotel Inventory Management System.

## 📁 Tutorial Structure

```
docs/tutorials/
├── video-demos.mdx              # Overview/index page
├── getting-started-videos.mdx   # Account, login, role selection
├── front-desk-videos.mdx        # Front desk operations
├── finance-videos.mdx           # Finance and fiscalization
├── channel-manager-videos.mdx   # OTA integration
├── advanced-videos.mdx          # Power user features
└── README.md                    # This file
```

## 🎥 Adding Your Videos

### Option 1: YouTube Videos

1. Upload your video to YouTube
2. Get the video ID from the URL:
   - URL: `https://youtube.com/watch?v=dQw4w9WgXcQ`
   - Video ID: `dQw4w9WgXcQ`
3. Replace `YOUR_VIDEO_ID` in the tutorial files:

```mdx
<iframe
  className="w-full aspect-video rounded-xl mb-6"
  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  title="Your Video Title"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
></iframe>
```

### Option 2: Self-Hosted Videos

1. Create a `/public/videos/` directory in your project root
2. Add your `.mp4` video files to this directory
3. Reference them in the tutorial files:

```mdx
<video
  controls
  className="w-full aspect-video rounded-xl mb-6"
  src="/videos/your-video-name.mp4"
>
  Your browser does not support the video tag.
</video>
```

## 📝 Tutorial Pages Overview

### 1. Getting Started Videos (`getting-started-videos.mdx`)
**Target Audience:** New users, all roles
**Total Duration:** ~20 minutes

Videos to create:
- [ ] Creating Your Account (~3 min)
- [ ] Logging In (~2 min)
- [ ] Choosing Your Role (~4 min)
- [ ] Dashboard Overview (~5 min)

### 2. Front Desk Videos (`front-desk-videos.mdx`)
**Target Audience:** Front desk staff, receptionists
**Total Duration:** ~1 hour 15 minutes

Videos to create:
- [ ] Hotel Timeline Overview (~5 min)
- [ ] Creating New Reservations (~7 min)
- [ ] Drag-to-Create Reservations (~4 min)
- [ ] Moving and Editing Reservations (~6 min)
- [ ] Guest Management (~5 min)
- [ ] Check-In Process (~6 min)
- [ ] Check-Out Process (~5 min)
- [ ] Room Status Management (~4 min)
- [ ] Handling Special Requests (~4 min)
- [ ] Cancellations and No-Shows (~5 min)
- [ ] Multi-Guest Reservations (~6 min)
- [ ] Search and Filters (~4 min)
- [ ] Keyboard Shortcuts for Front Desk (~5 min)

### 3. Finance Videos (`finance-videos.mdx`)
**Target Audience:** Finance staff, accountants
**Total Duration:** ~1 hour 30 minutes

Videos to create:
- [ ] Finance Module Overview (~5 min)
- [ ] Creating Invoices (~7 min)
- [ ] Croatian Fiscalization (~8 min) ⚠️ **IMPORTANT**
- [ ] Payment Processing (~6 min)
- [ ] Managing Outstanding Balances (~5 min)
- [ ] Corporate Billing (~7 min)
- [ ] Pricing and Discounts (~8 min)
- [ ] VAT and Tax Management (~6 min)
- [ ] Financial Reports (~7 min)
- [ ] Invoice Templates (~5 min)
- [ ] Email Delivery and Automation (~4 min)
- [ ] Refunds and Credits (~6 min)
- [ ] End-of-Day Closing (~5 min)
- [ ] Audit Trail and Compliance (~5 min)

### 4. Channel Manager Videos (`channel-manager-videos.mdx`)
**Target Audience:** Revenue managers, OTA coordinators
**Total Duration:** ~1 hour 45 minutes

Videos to create:
- [ ] Channel Manager Overview (~6 min)
- [ ] Initial Phobs Setup (~8 min)
- [ ] Room Mapping (~10 min)
- [ ] Rate Plans and Pricing (~9 min)
- [ ] Inventory and Availability Management (~7 min)
- [ ] Real-time Synchronization (~6 min)
- [ ] Managing OTA Bookings (~7 min)
- [ ] Commission Management (~6 min)
- [ ] Channel Performance Monitoring (~8 min)
- [ ] Modifications and Cancellations (~6 min)
- [ ] Multi-language Support (~5 min)
- [ ] Restrictions and Rules (~7 min)
- [ ] Error Handling and Troubleshooting (~8 min)

### 5. Advanced Videos (`advanced-videos.mdx`)
**Target Audience:** Power users, system administrators
**Total Duration:** ~2 hours

Videos to create:
- [ ] Keyboard Shortcuts Master Class (~10 min)
- [ ] Batch Operations (~9 min)
- [ ] Optimistic UI Updates (~6 min)
- [ ] Conflict Detection and Resolution (~8 min)
- [ ] Advanced Search and Filtering (~7 min)
- [ ] Timeline View Modes (~6 min)
- [ ] Data Export and Reporting (~7 min)
- [ ] Automation and Workflows (~9 min)
- [ ] Multi-Property Management (~8 min)
- [ ] Custom Dashboards (~7 min)
- [ ] Integration with External Tools (~10 min)
- [ ] Mobile App Usage (~8 min)
- [ ] Performance Optimization (~6 min)
- [ ] Security Best Practices (~9 min)

## 🎬 Video Production Tips

### Recording Setup
- **Screen Resolution:** 1920x1080 (Full HD)
- **Frame Rate:** 30fps minimum
- **Audio:** Clear voiceover with noise reduction
- **Cursor:** Use cursor highlighting for better visibility

### Content Guidelines
1. **Start with the end goal** - Show what viewers will accomplish
2. **Keep it focused** - One feature/task per video
3. **Use real data** - Demonstrate with realistic examples
4. **Add chapters** - YouTube chapter markers for easy navigation
5. **Include captions** - Accessibility for all users

### Recommended Tools
- **Screen Recording:** OBS Studio, Camtasia, ScreenFlow
- **Video Editing:** DaVinci Resolve, Adobe Premiere, Final Cut Pro
- **Audio:** Audacity for cleanup, Blue Yeti/Rode NT-USB for recording
- **Thumbnails:** Canva, Figma

## 📊 Video Checklist Template

For each video you create, ensure:
- [ ] Clear audio with no background noise
- [ ] Cursor actions are visible and deliberate
- [ ] Real-world example data (not Lorem Ipsum)
- [ ] Pacing allows viewers to follow along
- [ ] Intro states what will be covered
- [ ] Outro summarizes key points
- [ ] Video exported in 1080p
- [ ] Thumbnail created (1280x720px)
- [ ] Captions/subtitles added
- [ ] Chapter markers set (for YouTube)

## 🌍 Multi-Language Support

Consider creating versions in:
- 🇬🇧 English (primary)
- 🇭🇷 Croatian (fiscal compliance videos are critical)
- 🇩🇪 German (tourism markets)
- 🇮🇹 Italian (tourism markets)

## 📈 Analytics

Track video performance:
- View count
- Average watch time
- Drop-off points
- User feedback
- Common questions in comments

Use this data to improve future videos and identify areas needing more explanation.

## 🔄 Updating Videos

When features change:
1. Mark old video as "outdated" in description
2. Record new version
3. Update MDX file with new video ID
4. Archive old video (don't delete - preserve for version history)
5. Update changelog with video updates

## 📞 Support

For questions about video tutorial structure or Mintlify video embedding:
- Documentation: https://mintlify.com/docs
- Issues: Create an issue in the repo
- Email: tutorials@hotelinventory.com

---

**Last Updated:** January 2025
**Version:** 1.0
**Total Tutorial Videos Planned:** 65+
