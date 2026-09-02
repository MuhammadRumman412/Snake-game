# Deployment Guide: Samosa Snake

This guide will help you take your Snake Game from your local machine to the live web using **Vercel**.

## Option 1: The Quickest Way (Direct Upload)
Use this method if you don't want to use Git or GitHub.

1. **Prepare your files**:
   Make sure your `Project 1` folder contains:
   - `index.html`
   - `style.css`
   - `game.js`
   - `vercel.json`
   - `manifest.json`
   - `sw.js`
2. **Zip the folder**:
   Right-click the `Project 1` folder $\rightarrow$ "Compress to ZIP file".
3. **Upload to Vercel**:
   - Log in to [vercel.com](https://vercel.com).
   - Click **"Add New"** $\rightarrow$ **"Project"**.
   - Instead of importing from Git, look for the **"Upload"** or **"Drag and Drop"** area at the bottom of the page.
   - Drag your `.zip` file into the box.
4. **Deploy**:
   Vercel will automatically detect the settings. Click **"Deploy"**.
5. **Your Game is Live!** 🚀
   Vercel will provide you with a URL (e.g., `samosa-snake.vercel.app`).

---

## Option 2: The Professional Way (GitHub Connection)
Use this method if you want your site to update automatically whenever you change the code.

1. **Create a GitHub account**:
   Go to [github.com](https://github.com) and sign up.
2. **Create a Repository**:
   - Click the **"+"** icon in the top right $\rightarrow$ **"New repository"**.
   - Name it `samosa-snake`. Set it to **Public**.
   - Click **"Create repository"**.
3. **Upload Files**:
   - On the repository page, click the **"uploading an existing file"** link.
   - Drag all the files from your `Project 1` folder into the browser.
   - Click **"Commit changes"**.
4. **Connect to Vercel**:
   - Log in to [vercel.com](https://vercel.com).
   - Click **"Add New"** $\rightarrow$ **"Project"**.
   - Connect your GitHub account.
   - Find the `samosa-snake` repository and click **"Import"**.
5. **Deploy**:
   Click **"Deploy"**.

### Why Option 2 is better:
Whenever you edit a file on GitHub, Vercel will notice the change and automatically update your live website. No more zipping and uploading!

---

## Verification Checklist
Once live, check the following:
- [ ] The game loads and is playable.
- [ ] Samosas appear and score increases.
- [ ] Settings (Speed, Colors, Wall Wrap) work correctly.
- [ ] The site is responsive on mobile.
- [ ] (Mobile) You can "Add to Home Screen" (thanks to the PWA manifest).
