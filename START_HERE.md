# 🚀 START HERE - Quick Guide

## ⚠️ IMPORTANT: How to Open Your Website

### ❌ DO NOT Double-Click Index.html

If you double-click `Index.html`, you'll get a **405 error** and the form won't work.

### ✅ CORRECT Way to Open

You have **2 easy options**:

---

## Option 1: Use the Easy Starter Script (Recommended)

### On Mac/Linux:

Double-click `start-website.sh` or run in terminal:

```bash
cd "/Users/mulugetabisrat/Document/Product Design Studio"
./start-website.sh
```

This will:
1. ✅ Start the server
2. ✅ Automatically open your browser
3. ✅ Navigate to the correct URL

**That's it!** Your website will open automatically.

---

## Option 2: Manual Start

### Step 1: Start Server

Open Terminal and run:

```bash
cd "/Users/mulugetabisrat/Document/Product Design Studio"
npm start
```

### Step 2: Open Browser

**Type this URL** in your browser:

```
http://localhost:3000/Index.html
```

**DO NOT** open the file directly!

---

## 🔍 Check You're Using the Correct URL

Look at your browser's address bar:

**✅ CORRECT** (will work):
```
http://localhost:3000/Index.html
```

**❌ WRONG** (won't work):
```
file:///Users/mulugetabisrat/Document/Product%20Design%20Studio/Index.html
```

If you see `file:///`, you did it wrong! Use the correct URL above.

---

## 📁 Where Are Submissions Saved?

All form submissions are saved in:

```
submissions/
├── 2025-10-27T15-47-14-218Z_test_company_inc.json
├── applications_summary.csv
└── [more submissions...]
```

**View in Excel/Google Sheets:**
```bash
open submissions/applications_summary.csv
```

**View JSON files:**
```bash
cat submissions/*.json | python3 -m json.tool
```

---

## 🧪 Test the Form

1. **Make sure server is running** (see Option 1 or 2 above)
2. **Go to** http://localhost:3000/Index.html
3. **Click** "Start Application"
4. **Fill out** the form
5. **Click** "Submit Application"
6. **Success!** Data saved to `submissions/` folder

---

## ❓ Common Issues

### "Error 405"
- **Problem**: You opened `Index.html` directly
- **Solution**: Use `http://localhost:3000/Index.html` instead
- **Read**: [ERROR_405_FIX.md](ERROR_405_FIX.md)

### "Connection Refused"
- **Problem**: Server isn't running
- **Solution**: Run `npm start` in terminal

### "Cannot GET /"
- **Problem**: Wrong URL (missing `/Index.html`)
- **Solution**: Add `/Index.html` to the URL

### Form doesn't submit
- **Problem**: Server not running or wrong URL
- **Solution**: Check server is running, check URL in browser

---

## 📊 What Happens When Form is Submitted?

```
1. User fills form
   ↓
2. Clicks "Submit Application"
   ↓
3. Data sent to server (< 100ms)
   ↓
4. Server saves:
   • JSON file: submissions/[timestamp]_[company].json
   • CSV entry: submissions/applications_summary.csv
   ↓
5. Success message shown
   ↓
6. Form resets and closes
```

**Fast, simple, reliable!**

---

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** ← You are here
- **[README_SIMPLIFIED.md](README_SIMPLIFIED.md)** - Complete guide
- **[ERROR_405_FIX.md](ERROR_405_FIX.md)** - Fix 405 error
- **[EMAILJS_REMOVED.md](EMAILJS_REMOVED.md)** - What changed
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues

---

## 🎯 Quick Commands

### Start Website
```bash
cd "/Users/mulugetabisrat/Document/Product Design Studio"
npm start
# Then open: http://localhost:3000/Index.html
```

### Test Submission
```bash
node test-submission.js
```

### View Submissions
```bash
ls submissions/
cat submissions/applications_summary.csv
```

### Stop Server
Press `Ctrl + C` in the terminal

---

## ✅ Checklist

Before submitting a form:

- [ ] Server is running (`npm start`)
- [ ] Browser URL is `http://localhost:3000/Index.html`
- [ ] You see the website (not a file listing)
- [ ] "Apply for Review" section is visible

After submitting:

- [ ] Success message appears
- [ ] Form resets automatically
- [ ] New file in `submissions/` folder
- [ ] CSV updated with new entry

---

## 🎉 Summary

**The Golden Rule:**

Always access your website via:
```
http://localhost:3000/Index.html
```

**Never** double-click `Index.html`!

**Easy way:** Just run `./start-website.sh` and everything opens automatically! 🚀

---

**Questions?** See [README_SIMPLIFIED.md](README_SIMPLIFIED.md) for complete documentation.
