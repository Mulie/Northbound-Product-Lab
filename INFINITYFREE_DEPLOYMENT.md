# 🚀 InfinityFree Deployment Guide

## ✅ What I've Created For You

I've converted your Node.js backend to **PHP + MySQL** so it works perfectly with InfinityFree hosting!

### 📁 New Files Created

```
api/
├── submit-application.php   ← Handles form submissions
├── get-submissions.php      ← Fetches all submissions for dashboard
└── config.php              ← Database configuration

setup-database.sql          ← MySQL database schema
```

---

## 🎯 Step-by-Step Deployment

### Step 1: Create InfinityFree Account

1. Go to https://infinityfree.com
2. Click "Sign Up"
3. Create free account
4. Verify your email

### Step 2: Create a Website

1. Log into InfinityFree Control Panel
2. Click "Create Account"
3. Choose subdomain: `your-site.infinityfreeapp.com`
   - Or use custom domain if you have one
4. Wait for account creation (~5 minutes)

### Step 3: Create MySQL Database

1. In Control Panel, go to **"MySQL Databases"**
2. Click **"Create Database"**
3. Enter database name: `productreview`
4. Click "Create Database"

**Write down these details:**
- MySQL Hostname: `sql123.infinityfree.com` (or similar)
- Database Name: `epiz_xxxxx_productreview`
- Username: `epiz_xxxxx`
- Password: (the one you set)

### Step 4: Set Up Database Schema

1. In Control Panel, click **"phpMyAdmin"**
2. Select your database from left sidebar
3. Click **"SQL"** tab at the top
4. Copy the contents of `setup-database.sql`
5. Paste into the SQL query box
6. Click **"Go"**

✅ You should see "Query OK" message!

### Step 5: Configure Database Connection

1. Open `api/config.php` on your computer
2. Update these lines with YOUR database details:

```php
define('DB_HOST', 'sql123.infinityfree.com');  // Your MySQL hostname
define('DB_USER', 'epiz_xxxxx');               // Your MySQL username
define('DB_PASS', 'your_password_here');       // Your MySQL password
define('DB_NAME', 'epiz_xxxxx_productreview'); // Your database name
```

**IMPORTANT:** Use the exact values from Step 3!

### Step 6: Upload Files to InfinityFree

#### Option A: Using File Manager (Easiest)

1. In Control Panel, click **"File Manager"**
2. Navigate to `htdocs` folder
3. Delete everything in `htdocs` (default files)
4. Upload these files/folders:
   - `Index.html`
   - `dashboard.html`
   - `api/` (entire folder)
   - `submissions/` (create empty folder)

**Folder structure on server should be:**
```
htdocs/
├── Index.html
├── dashboard.html
├── api/
│   ├── submit-application.php
│   ├── get-submissions.php
│   └── config.php
└── submissions/ (empty folder)
```

#### Option B: Using FTP (Advanced)

1. Get FTP details from Control Panel > "FTP Details"
2. Use FileZilla or any FTP client:
   - Host: `ftpupload.net`
   - Username: `epiz_xxxxx`
   - Password: (your FTP password)
   - Port: `21`
3. Connect and upload files to `htdocs` folder

### Step 7: Set Folder Permissions

1. In File Manager, right-click `submissions` folder
2. Click "Permissions" or "Change Permissions"
3. Set to **755** or **777**
4. Check "Apply to subdirectories"
5. Click "Change Permissions"

This allows PHP to create backup JSON files.

### Step 8: Test Your Website!

Visit your website:
```
https://your-site.infinityfreeapp.com/Index.html
```

**Test the form:**
1. Scroll to "Apply for Review"
2. Click "Start Application"
3. Fill out form
4. Click "Submit Application"
5. You should see success message!

**Check dashboard:**
```
https://your-site.infinityfreeapp.com/dashboard.html
```

You should see your test submission!

---

## ✅ Verification Checklist

- [ ] InfinityFree account created
- [ ] Website/subdomain created
- [ ] MySQL database created
- [ ] Database schema imported (ran setup-database.sql)
- [ ] config.php updated with correct database credentials
- [ ] All files uploaded to `htdocs` folder
- [ ] submissions folder has write permissions (755/777)
- [ ] Website loads at your InfinityFree URL
- [ ] Form submission works
- [ ] Dashboard shows submissions
- [ ] Data saved in MySQL database

---

## 🔧 How It Works Now

### Local Development (Node.js)
```
Form → http://localhost:3000/Index.html
  ↓
  Node.js Server (server.js)
  ↓
  JSON Files (submissions/)
```

### Production (InfinityFree - PHP)
```
Form → https://your-site.infinityfreeapp.com/Index.html
  ↓
  PHP Backend (api/submit-application.php)
  ↓
  MySQL Database + JSON Backup
```

**Both systems work!** You can:
- Develop locally with Node.js
- Deploy to InfinityFree with PHP/MySQL

---

## 📊 Where Is Data Saved?

### On InfinityFree:

1. **Primary Storage: MySQL Database**
   - Table: `submissions`
   - All 40+ fields stored
   - Fast queries
   - Easy to export

2. **Backup: JSON Files**
   - Folder: `htdocs/submissions/`
   - Same format as local development
   - Automatic backup on each submission

### Viewing Data:

**Dashboard:**
```
https://your-site.infinityfreeapp.com/dashboard.html
```

**phpMyAdmin:**
1. Control Panel > phpMyAdmin
2. Select your database
3. Browse `submissions` table

**Export Data:**
1. phpMyAdmin > Export
2. Choose CSV or SQL format
3. Download

---

## 🛠️ Troubleshooting

### Issue 1: "Database connection failed"

**Problem:** Can't connect to MySQL

**Solutions:**
1. Check `api/config.php` has correct credentials
2. Verify database exists in phpMyAdmin
3. Check MySQL hostname is correct
4. Wait 5 minutes (database might be provisioning)

### Issue 2: "Permission denied" when saving

**Problem:** Can't write to submissions folder

**Solution:**
1. File Manager > Right-click `submissions` folder
2. Permissions > Set to `777`
3. Try submitting again

### Issue 3: Form says "Server error: 404"

**Problem:** PHP file not found

**Solutions:**
1. Check files are in `htdocs` folder (not a subfolder!)
2. Verify `api/submit-application.php` exists
3. Check file names are exactly correct (case-sensitive!)

### Issue 4: "Error saving submission"

**Problem:** SQL error

**Solutions:**
1. Check database schema was imported correctly
2. phpMyAdmin > Check if `submissions` table exists
3. Check all required fields are present
4. Look at PHP error logs in Control Panel

### Issue 5: Dashboard shows "No submissions found"

**Problem:** Can't fetch from database

**Solutions:**
1. Check `api/get-submissions.php` exists
2. Verify database has data (check phpMyAdmin)
3. Check browser console for errors (F12)

---

## 🔒 Security Recommendations

### For Production:

1. **Protect config.php**

Create `.htaccess` in `api/` folder:
```apache
<Files "config.php">
    Order Allow,Deny
    Deny from all
</Files>
```

2. **Add Admin Authentication**

Protect `dashboard.html` with password:
```apache
# .htaccess in htdocs
<Files "dashboard.html">
    AuthType Basic
    AuthName "Admin Area"
    AuthUserFile /path/to/.htpasswd
    Require valid-user
</Files>
```

3. **Enable HTTPS**

InfinityFree provides free SSL:
1. Control Panel > SSL Certificates
2. Install Let's Encrypt SSL
3. Force HTTPS in .htaccess

4. **Backup Regularly**

- Export database weekly (phpMyAdmin > Export)
- Download submissions folder
- Keep backups secure

---

## 📝 Files to Upload vs. Keep Local

### ✅ Upload to InfinityFree:
- `Index.html`
- `dashboard.html`
- `api/` folder (all files)
- `submissions/` folder (empty)

### ❌ Keep Local Only:
- `server.js` (Node.js - not needed on InfinityFree)
- `package.json` (Node.js dependencies)
- `node_modules/` (Node.js dependencies)
- `*.md` files (documentation)
- `.claude/` folder

### 📋 Optional:
- `submissions/*.json` (local backups)

---

## 🎨 Custom Domain Setup (Optional)

If you have a custom domain (e.g., productreviewstudio.com):

1. **Point Domain to InfinityFree:**
   - In your domain registrar (Namecheap, GoDaddy, etc.)
   - Update nameservers to:
     - `ns1.byet.org`
     - `ns2.byet.org`

2. **Add Domain in InfinityFree:**
   - Control Panel > "Add Domain"
   - Enter your domain
   - Wait for DNS propagation (24-48 hours)

3. **Install SSL:**
   - Control Panel > SSL Certificates
   - Add SSL for custom domain

---

## 📊 Database Management

### View All Submissions:

**Method 1: Dashboard**
```
https://your-site.infinityfreeapp.com/dashboard.html
```

**Method 2: phpMyAdmin**
```sql
SELECT * FROM submissions ORDER BY submitted_at DESC;
```

### Export to CSV:

**Via phpMyAdmin:**
1. Select `submissions` table
2. Click "Export"
3. Format: CSV
4. Download

**Via Dashboard:**
- Coming soon (can be added if needed!)

### Search Submissions:

```sql
-- By email
SELECT * FROM submissions WHERE email LIKE '%@gmail.com%';

-- By company
SELECT * FROM submissions WHERE business_name LIKE '%Tech%';

-- Today's submissions
SELECT * FROM submissions WHERE DATE(submitted_at) = CURDATE();

-- This week
SELECT * FROM submissions WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);
```

---

## 🚀 Quick Deployment Checklist

```bash
# 1. Update config.php with your database details
# 2. Upload files to InfinityFree
# 3. Import setup-database.sql in phpMyAdmin
# 4. Set submissions/ folder to 777 permissions
# 5. Test form submission
# 6. Check dashboard
# 7. Verify data in phpMyAdmin
```

---

## 💡 Pro Tips

1. **Test Locally First**
   - Always test on localhost before uploading
   - Use Node.js version for development

2. **Keep Backups**
   - Export database weekly
   - Download submissions JSON files

3. **Monitor Storage**
   - InfinityFree has storage limits
   - Clean old submissions if needed

4. **Use Version Control**
   - Git for tracking changes
   - Don't commit config.php with credentials!

5. **Check Error Logs**
   - Control Panel > Error Logs
   - Find issues quickly

---

## 📞 Support

### InfinityFree Support:
- Forum: https://forum.infinityfree.com
- Knowledge Base: https://infinityfree.com/support

### Your Files:
- `api/submit-application.php` - Form submission handler
- `api/get-submissions.php` - Dashboard data provider
- `setup-database.sql` - Database schema

---

## ✅ Final Test

After deployment, test everything:

1. **Form Submission:**
   ```
   https://your-site.infinityfreeapp.com/Index.html
   ```
   - Fill form → Submit → See success message

2. **Dashboard:**
   ```
   https://your-site.infinityfreeapp.com/dashboard.html
   ```
   - See submission in list
   - Click "View" → See full details
   - Search works

3. **Database:**
   - phpMyAdmin → Check data in `submissions` table

If all 3 work: **🎉 Deployment successful!**

---

## 🎊 You're Live!

Your website is now hosted on InfinityFree with:
- ✅ PHP backend
- ✅ MySQL database
- ✅ Automatic JSON backups
- ✅ Admin dashboard
- ✅ Free hosting
- ✅ SSL certificate (if enabled)

**Your live URLs:**
```
Public Form:    https://your-site.infinityfreeapp.com/Index.html
Admin Dashboard: https://your-site.infinityfreeapp.com/dashboard.html
```

Share the public form URL with your clients! 🚀
