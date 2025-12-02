# Northbound Product Lab - Website Setup

This website includes a form submission system that saves application data both via email (EmailJS) and locally to the server.

## Features

- **Dual Submission**: Form data is saved both via EmailJS and to a local server
- **File Storage**: Each submission is saved as a JSON file with a timestamp
- **CSV Summary**: All submissions are logged in a CSV file for easy viewing
- **Persistent Data**: All submissions are stored in the `submissions/` folder

## Setup Instructions

### 1. Install Dependencies

First, make sure you have Node.js installed on your system. Then run:

```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Enable cross-origin requests
- `body-parser` - Parse JSON request bodies
- `nodemon` - Auto-restart server during development

### 2. Start the Server

**For development (auto-restart on changes):**
```bash
npm run dev
```

**For production:**
```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Access the Website

Open your browser and go to:
```
http://localhost:3000/Index.html
```

## How It Works

### Form Submission Flow

1. User fills out the "Apply for Review" form
2. On submit, the form data is:
   - **First**: Saved to the local server at `/api/submit-application`
   - **Then**: Sent via EmailJS to your configured email
3. Server creates two files:
   - Individual JSON file: `submissions/[timestamp]_[business-name].json`
   - CSV summary entry: `submissions/applications_summary.csv`

### Server Endpoints

- `GET /api/health` - Check if server is running
- `POST /api/submit-application` - Submit form data

### File Structure

```
Product Design Studio/
├── Index.html              # Main website file
├── server.js               # Node.js server
├── package.json            # Dependencies
├── README.md              # This file
└── submissions/           # Created automatically
    ├── applications_summary.csv
    └── [timestamp]_[business-name].json
```

## Viewing Submissions

### Individual Submissions
Each submission is saved as a JSON file in the `submissions/` folder with the format:
```
2025-01-15T10-30-45-123Z_acme_corporation.json
```

### Summary CSV
Open `submissions/applications_summary.csv` in Excel or Google Sheets to see a summary of all applications with:
- Timestamp
- Name
- Email
- Phone
- Business Name
- Industry
- Website
- Employee Count

## Troubleshooting

### Server won't start
- Make sure Node.js is installed: `node --version`
- Delete `node_modules/` and run `npm install` again

### Submissions not saving
- Check console for errors
- Verify the server is running on port 3000
- Check if `submissions/` folder was created

### EmailJS not working
- Verify EmailJS credentials in Index.html (lines 1220, 1456)
- Check browser console for errors
- Ensure internet connection is active

## Security Notes

⚠️ **Important**: This setup is for development/testing purposes. For production:
- Add authentication to protect the submissions folder
- Use environment variables for EmailJS credentials
- Add rate limiting to prevent spam
- Consider using a database instead of JSON files
- Add HTTPS/SSL certificate
- Validate and sanitize all input data

## Customization

### Change Port
Edit `server.js` line 6:
```javascript
const PORT = 3000; // Change to your preferred port
```

### Change Submissions Folder
Edit `server.js` line 15:
```javascript
const submissionsDir = path.join(__dirname, 'submissions'); // Change folder name
```

### Modify CSV Fields
Edit the CSV headers and row data in `server.js` lines 45-52 to include different fields.

## Support

For issues or questions, please check:
- Console logs in the browser (F12 → Console)
- Server terminal output
- `submissions/` folder permissions

---

**Version**: 1.0.0
**Last Updated**: January 2025
