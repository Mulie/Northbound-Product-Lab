# Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Install Dependencies (One-time setup)
```bash
npm install
```

### Step 2: Start the Server
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════╗
║   Product Review Studio - Server Running       ║
╠════════════════════════════════════════════════╣
║   Server: http://localhost:3000                 ║
║   Submissions saved to: ./submissions/         ║
╚════════════════════════════════════════════════╝
```

### Step 3: Open Your Website
Open your browser and go to:
```
http://localhost:3000/Index.html
```

## Testing the Form

You can test the form by:
1. Scrolling to the "Apply for Review" section
2. Clicking "Start Application"
3. Filling out the form
4. Clicking "Submit Application"

Or run the automated test:
```bash
node test-submission.js
```

## Where to Find Submissions

All form submissions are saved in the `submissions/` folder:

### Individual JSON Files
```
submissions/2025-10-27T15-20-19-521Z_test_company_inc.json
```
Each submission is saved with:
- Timestamp in the filename
- Company name (sanitized)
- Complete form data in JSON format

### CSV Summary File
```
submissions/applications_summary.csv
```
Open this in Excel or Google Sheets to see a quick overview of all applications.

## What Happens When Someone Submits?

1. ✅ Data is saved to your local server (JSON + CSV)
2. 📧 Email is sent via EmailJS to your configured address
3. ✅ User sees success message
4. 🔄 Form resets and closes automatically

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

## For Development (Auto-restart)

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make code changes.

## Common Issues

### Port Already in Use
If you see "port 3000 already in use", either:
- Stop the other process using port 3000
- Change the port in `server.js` (line 6)

### Can't Access Website
Make sure:
- Server is running (you should see the banner in terminal)
- You're going to `http://localhost:3000/Index.html` (with the capital I)
- No firewall is blocking localhost

### Submissions Not Saving
- Check server logs in the terminal
- Verify `submissions/` folder exists and has write permissions
- Check browser console (F12) for errors

## Next Steps

- Configure your EmailJS credentials if needed
- Customize the CSV fields in `server.js`
- Add database integration for production
- Deploy to a hosting service

---

**Need Help?** Check the full README.md for detailed documentation.
