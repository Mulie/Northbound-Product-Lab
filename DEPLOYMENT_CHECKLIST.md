# 🚀 InfinityFree Deployment Checklist

## Quick Steps

### 1️⃣ Setup InfinityFree (5 minutes)
- [ ] Create account at infinityfree.com
- [ ] Create website/subdomain
- [ ] Create MySQL database
- [ ] Save database credentials

### 2️⃣ Configure Database (2 minutes)
- [ ] Open phpMyAdmin
- [ ] Run `setup-database.sql` in SQL tab
- [ ] Verify `submissions` table created

### 3️⃣ Update Config File (1 minute)
- [ ] Open `api/config.php`
- [ ] Update DB_HOST, DB_USER, DB_PASS, DB_NAME
- [ ] Save file

### 4️⃣ Upload Files (5 minutes)
- [ ] Upload `Index.html`
- [ ] Upload `dashboard.html`
- [ ] Upload `api/` folder (all 3 files)
- [ ] Upload `.htaccess`
- [ ] Create empty `submissions/` folder
- [ ] Set `submissions/` permissions to 777

### 5️⃣ Test Everything (2 minutes)
- [ ] Visit your site: `https://your-site.infinityfreeapp.com/Index.html`
- [ ] Submit test form
- [ ] Check dashboard: `https://your-site.infinityfreeapp.com/dashboard.html`
- [ ] Verify data in phpMyAdmin

---

## Files to Upload

### ✅ Required:
```
htdocs/
├── Index.html
├── dashboard.html
├── .htaccess
├── api/
│   ├── submit-application.php
│   ├── get-submissions.php
│   └── config.php
└── submissions/ (empty folder, chmod 777)
```

### ❌ Don't Upload:
- `server.js`
- `package.json`
- `node_modules/`
- `*.md` files
- `.claude/` folder

---

## Database Credentials Template

```php
// api/config.php

define('DB_HOST', 'sql123.infinityfree.com');  // From InfinityFree
define('DB_USER', 'epiz_xxxxx');               // From InfinityFree
define('DB_PASS', 'your_password');            // You set this
define('DB_NAME', 'epiz_xxxxx_productreview'); // From InfinityFree
```

**Get these from:** InfinityFree Control Panel > MySQL Databases

---

## Quick Test Commands

### Test Form:
1. Go to: `https://your-site.infinityfreeapp.com/Index.html`
2. Scroll to "Apply for Review"
3. Fill and submit
4. Should see: "Your information has been saved successfully!"

### Test Dashboard:
1. Go to: `https://your-site.infinityfreeapp.com/dashboard.html`
2. Should see submission count
3. Should see your test submission
4. Click "View" to see details

### Test Database:
1. Control Panel > phpMyAdmin
2. Select your database
3. Browse `submissions` table
4. Should see 1 row with your test data

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Database connection failed" | Check `config.php` credentials |
| "Permission denied" | Set `submissions/` to chmod 777 |
| "404 error" | Check files are in `htdocs` root |
| Dashboard shows 0 submissions | Check `get-submissions.php` uploaded |
| Form won't submit | Check `submit-application.php` exists |

---

## After Deployment

### Share with clients:
```
https://your-site.infinityfreeapp.com/Index.html
```

### Access dashboard (admin only):
```
https://your-site.infinityfreeapp.com/dashboard.html
```

**Tip:** Bookmark both URLs!

---

## Next Steps (Optional)

- [ ] Install SSL certificate (Control Panel > SSL)
- [ ] Add password protection to dashboard
- [ ] Set up custom domain
- [ ] Schedule database backups
- [ ] Monitor submission stats

---

## Support

**Guide:** See [INFINITYFREE_DEPLOYMENT.md](INFINITYFREE_DEPLOYMENT.md) for detailed instructions

**InfinityFree Forum:** https://forum.infinityfree.com

**Database Issues:** Check phpMyAdmin error logs

---

## ✅ Success Criteria

You're done when:
- ✅ Form submits successfully
- ✅ Success message appears
- ✅ Dashboard shows submission
- ✅ Data visible in phpMyAdmin
- ✅ JSON backup file created

**Time needed:** ~15 minutes total

**Difficulty:** Easy (follow checklist step-by-step)

🎉 **You're live!**
