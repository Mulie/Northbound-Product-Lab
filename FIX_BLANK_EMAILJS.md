# Fix Blank EmailJS Data - Step by Step

## 🔍 What You're Seeing

Your email looks like this (with blank fields):

```
CONTACT INFORMATION:
Name:                    ← BLANK
Email:                   ← BLANK
Phone:                   ← BLANK

But some fields work:
Website: https://www.liyu.ca    ← WORKS!
Industry: e-commerce            ← WORKS!
Location: Toronto, Ontario      ← WORKS!
```

## 🎯 The Problem

EmailJS template variable names don't match what the form is sending.

## ✅ The Solution (5 Minutes)

### Step 1: Check What's Being Sent

1. Open your website: http://localhost:3000/Index.html
2. Press **F12** to open Developer Tools
3. Click **Console** tab
4. Fill out the form and click Submit
5. Look for these messages:

```
📋 RAW FORM DATA CAPTURED:
fullName: [Your Name]
email: [Your Email]
phone: [Your Phone]
businessName: [Company Name]
```

**If you see the data in console** → Problem is in EmailJS template ✅
**If data is blank in console** → Problem is in the form ❌

---

### Step 2: Update Your EmailJS Template

Go to: https://dashboard.emailjs.com/admin/templates/template_68krtxm

#### **Option A: Use the Plain Text Template** (Easiest)

Copy from: **[EMAILJS_TEMPLATE_EXACT.txt](EMAILJS_TEMPLATE_EXACT.txt)**

1. Open `EMAILJS_TEMPLATE_EXACT.txt`
2. Copy everything from "📋 NEW DESIGN" to the end
3. Paste into EmailJS template
4. Click **Save**

#### **Option B: Use the HTML Template** (Professional)

Copy from: **[EMAILJS_TEMPLATE_HTML.html](EMAILJS_TEMPLATE_HTML.html)**

1. Open `EMAILJS_TEMPLATE_HTML.html`
2. Copy **all the HTML code**
3. In EmailJS, switch to "HTML" mode (toggle in top right)
4. Paste the HTML
5. Click **Save**

---

### Step 3: Wait & Test

1. **Wait 2 minutes** for EmailJS to update
2. **Refresh your website**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. **Submit the form again**
4. **Check your email** - all fields should now be filled!

---

## 📋 Variable Names Reference

Make sure your EmailJS template uses these **EXACT** names:

| Form Field | EmailJS Variable | Example |
|------------|------------------|---------|
| Name | `{{fullName}}` | John Doe |
| Email | `{{email}}` | john@example.com |
| Phone | `{{phone}}` | +1-555-0100 |
| Company | `{{businessName}}` | Acme Corp |
| Job Title | `{{jobTitle}}` | CEO |
| Website | `{{website}}` | https://acme.com |
| Industry | `{{industry}}` | Technology |
| City | `{{city}}` | Toronto |
| Province | `{{province}}` | Ontario |

**See full list**: [EMAILJS_VARIABLES.txt](EMAILJS_VARIABLES.txt)

---

## 🐛 Still Not Working? Debug Steps

### Check 1: Console Output

1. Open browser, press F12
2. Go to Console tab
3. Submit form
4. Look for this output:

```javascript
📧 EMAIL DATA BEING SENT TO EMAILJS:
Name: John Doe              ← Should show data
Email: john@example.com     ← Should show data
Phone: +1-555-0100          ← Should show data
Business: Acme Corp         ← Should show data
```

**If data shows here but email is blank** → EmailJS template issue
**If data is blank here** → Form collection issue (see below)

---

### Check 2: Form Field Names

Open Index.html and search for these lines to verify field names:

```html
<input type="text" id="fullName" name="fullName" required>
<input type="email" id="email" name="email" required>
<input type="tel" id="phone" name="phone" required>
<input type="text" id="businessName" name="businessName" required>
```

The `name="fullName"` attribute must match the EmailJS variable `{{fullName}}`

---

### Check 3: EmailJS Configuration

In [Index.html:1220 and 1568](Index.html#L1220), verify:

```javascript
emailjs.init("nWOY9_EOwI2jZMsfn");  // Your public key

emailjs.send('service_r33cn9r',     // Your service ID
             'template_68krtxm',     // Your template ID
             emailData)
```

---

### Check 4: Clear Browser Cache

Sometimes old JavaScript is cached:

1. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or: Open Developer Tools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

---

## 🧪 Test with Sample Data

Instead of filling the form manually, use the test script:

```bash
node test-submission.js
```

This sends known data and you can verify:
1. Server receives it correctly
2. EmailJS gets the correct variables

---

## 📊 Verification Checklist

- [ ] Console shows "📋 RAW FORM DATA CAPTURED:" with values
- [ ] Console shows "📧 EMAIL DATA BEING SENT TO EMAILJS:" with values
- [ ] EmailJS template uses `{{fullName}}` not `{{name}}`
- [ ] EmailJS template uses `{{businessName}}` not `{{company}}`
- [ ] EmailJS template saved (check dashboard)
- [ ] Waited 2 minutes after saving template
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Tested form submission
- [ ] Checked email inbox (including spam)

---

## 🎓 Understanding the Flow

```
1. User fills form
   └─> Name: "John Doe"
       Email: "john@example.com"

2. JavaScript captures data
   └─> { fullName: "John Doe", email: "john@example.com" }

3. Data sent to EmailJS
   └─> emailjs.send(..., { fullName: "John Doe", email: "..." })

4. EmailJS template receives
   └─> {{fullName}}  ← Must match!
       {{email}}     ← Must match!

5. Email generated
   └─> Name: John Doe  ✅
       Email: john@example.com  ✅
```

**If any step breaks, data appears blank in email!**

---

## 💡 Quick Fixes

### Fix 1: Use the Simple Template

In EmailJS, just use:

```
{{message}}
```

This contains ALL data pre-formatted. You don't need individual variables.

### Fix 2: Add Fallback Values

In your EmailJS template:

```
Name: {{fullName}} {{#if fullName}}{{else}}Not provided{{/if}}
```

This shows "Not provided" if the field is blank.

### Fix 3: Test One Field at a Time

In EmailJS template, start simple:

```
Name: {{fullName}}
```

If this works, gradually add more fields to find which ones break.

---

## 📞 Need More Help?

1. Check [EMAILJS_SETUP.md](EMAILJS_SETUP.md) for detailed setup
2. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
3. Check browser console for errors
4. Check EmailJS dashboard for failed sends

---

## ✅ Expected Result

After fixing, your email should look like:

```
CONTACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: John Doe
Title: CEO
Email: john@example.com
Phone: +1-555-0100

COMPANY DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Name: Acme Corporation
Website: https://acme.com
Industry: Technology
Location: Toronto, Ontario
...
```

All fields filled with actual data! 🎉

---

**Last Updated**: After fixing form data collection and EmailJS variable mapping
