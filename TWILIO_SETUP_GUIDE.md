# 📞 Complete Twilio Setup Guide

This guide will walk you through getting your Twilio credentials step-by-step.

## What You Need to Get

From the README.md (lines 65-67), you need these three values:

```env
TWILIO_ACCOUNT_SID=your_account_sid      # ← We'll get this
TWILIO_AUTH_TOKEN=your_auth_token        # ← We'll get this
TWILIO_PHONE_NUMBER=+1234567890          # ← We'll get this
```

---

## Step 1: Create a Twilio Account (Free!)

### 1.1 Sign Up

1. Go to: **https://www.twilio.com/try-twilio**
2. Click the **"Sign up"** or **"Try Twilio Free"** button
3. Fill out the form:
   - First Name
   - Last Name
   - Email address
   - Password (make it strong!)
4. Click **"Start your free trial"**

### 1.2 Verify Your Email

1. Check your email inbox
2. Look for email from Twilio
3. Click the verification link
4. This confirms your email address

### 1.3 Verify Your Phone Number

1. Twilio will ask for your phone number
2. Enter your personal phone number (with country code)
   - Example: `+1-555-123-4567` for US
3. Choose verification method:
   - **SMS** (text message) - Recommended
   - **Voice call**
4. Enter the verification code you receive
5. Click **"Submit"**

### 1.4 Answer Questions

Twilio will ask a few questions:

1. **"Which Twilio product are you here to use?"**
   - Select: **"Voice"** or **"Programmable Voice"**
2. **"What do you plan to build?"**
   - You can select: **"Alerts & Notifications"** or **"Other"**
3. **"How do you want to build with Twilio?"**
   - Select: **"With code"**
4. **"What's your preferred language?"**
   - Select: **"Node.js"** or **"JavaScript"**

Click **"Get Started"**

---

## Step 2: Get Your Account SID and Auth Token

### 2.1 Navigate to Console Dashboard

After signing up, you should see the **Twilio Console Dashboard**.

If you don't see it:

1. Go to: **https://console.twilio.com/**
2. Log in with your credentials

### 2.2 Find Your Credentials

On the dashboard, you'll see a section called **"Account Info"** or **"Project Info"**:

```
┌─────────────────────────────────────────┐
│  Account Info                           │
├─────────────────────────────────────────┤
│  ACCOUNT SID                            │
│  AC1234567890abcdef...  [Show] [Copy]  │
│                                         │
│  AUTH TOKEN                             │
│  ••••••••••••••••••••  [Show] [Copy]   │
└─────────────────────────────────────────┘
```

### 2.3 Copy Account SID

1. Look for **"ACCOUNT SID"**
2. It starts with `AC` followed by 32 characters
3. Click the **"Copy"** button (📋)
4. **Save it somewhere safe!**
   - Example format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 hex characters)

### 2.4 Copy Auth Token

1. Click **"Show"** next to AUTH TOKEN
2. The token will be revealed (32 characters)
3. Click the **"Copy"** button (📋)
4. **Save it somewhere safe!**
   - Example format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 hex characters)

⚠️ **Important:** Keep your Auth Token secret! It's like a password.

---

## Step 3: Get a Phone Number

### 3.1 Navigate to Phone Numbers

1. On the left sidebar, find **"Phone Numbers"**
2. Click **"Manage"** → **"Buy a number"**

OR use this direct link:

- **https://console.twilio.com/us1/develop/phone-numbers/manage/search**

### 3.2 Search for a Number

You'll see a search interface:

1. **Country:** Select your country (e.g., United States)
2. **Capabilities:** Make sure these are checked:
   - ✅ **Voice** (REQUIRED for calls)
   - ✅ **SMS** (Optional, but useful)
3. **Number Type:**
   - **Local** (cheaper, good for testing)
   - **Toll-free** (more professional, costs more)

Click **"Search"**

### 3.3 Choose a Number

1. You'll see a list of available phone numbers
2. Each shows:
   - The phone number (e.g., +1 415 123 4567)
   - Monthly cost (usually $1-2/month for local numbers)
   - Capabilities (Voice, SMS, MMS)
3. Click **"Buy"** next to the number you like

### 3.4 Confirm Purchase

1. A popup will ask you to confirm
2. Click **"Buy [phone number]"**
3. Success! You now have a phone number

### 3.5 Copy Your Phone Number

1. After purchase, you'll see your new number
2. It looks like: `+14151234567`
3. Copy this number in **E.164 format** (with + and country code)
   - Example: `+14151234567` (no spaces, dashes, or parentheses)
4. **Save it!**

---

## Step 4: Add Credits (Important!)

### 4.1 Check Your Trial Balance

1. Look at the top right of the Twilio Console
2. You'll see: **"Trial Balance: $15.00"** or similar
3. This is your free credit for testing!

### 4.2 Understanding Trial Limitations

**With a trial account:**

- ✅ You CAN call verified numbers (numbers you verified during signup)
- ❌ You CANNOT call random numbers
- ✅ Perfect for testing!

**To call ANY number:**

1. You need to **upgrade to a paid account**
2. Click **"Upgrade"** in the top right
3. Add a credit card
4. Add $20+ to your account (recommended for testing)

### 4.3 Upgrade Your Account (Optional but Recommended)

1. Click **"Upgrade"** in the top navigation
2. Fill in billing information:
   - Credit card details
   - Billing address
3. Add initial credit ($20 is good for ~100 calls)
4. Confirm upgrade

---

## Step 5: Configure Your .env File

### 5.1 Open Your Backend .env File

```bash
cd /Users/yuyan/AiCostumerCall/backend
nano .env
```

Or open it in your code editor.

### 5.2 Add Your Credentials

Replace the placeholder values with your actual credentials:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here_32_characters
TWILIO_PHONE_NUMBER=+1234567890

# Make sure to use:
# - The full Account SID (starts with AC)
# - The full Auth Token (32 characters)
# - Phone number in E.164 format (+14151234567)
```

### 5.3 Save the File

- Press `Ctrl+O` then `Enter` (in nano)
- Or just save in your editor

---

## Step 6: Verify Everything Works

### 6.1 Test Your Credentials

Create a simple test file to verify:

```bash
cd /Users/yuyan/AiCostumerCall/backend
node -e "
const twilio = require('twilio');
const client = twilio('YOUR_ACCOUNT_SID', 'YOUR_AUTH_TOKEN');
console.log('✅ Twilio credentials are valid!');
"
```

### 6.2 Check Your Phone Number Status

1. Go to: **https://console.twilio.com/us1/develop/phone-numbers/manage/active**
2. You should see your purchased number
3. Status should be **"Active"**

---

## Step 7: Important Settings for This Project

### 7.1 Enable Voice Webhooks (Critical!)

1. Go to **Phone Numbers → Manage → Active numbers**
2. Click on your phone number
3. Scroll down to **"Voice Configuration"**
4. Under **"A CALL COMES IN"**:
   - Leave it blank for now (we'll configure this later)
   - OR set it to: `http://localhost:3001/api/webhooks/twilio/voice`
5. Under **"CALL STATUS CHANGES"**:
   - Leave it blank for now
6. Click **"Save"**

**Note:** For local testing, you'll need ngrok (covered in SETUP_GUIDE.md)

---

## 📋 Quick Reference - What You Should Have Now

After completing all steps, you should have:

✅ **Account SID:** `AC...` (32 characters)
✅ **Auth Token:** `...` (32 characters)  
✅ **Phone Number:** `+1...` (E.164 format)
✅ **Trial Credit:** $15 or more
✅ **.env file:** Updated with all credentials

---

## 💰 Pricing Overview

### Free Trial

- **$15 free credit** (enough for ~75-150 calls)
- Can only call verified numbers
- Perfect for testing

### Paid Account Costs

- **Phone number:** ~$1-2/month
- **Outbound call:** ~$0.013/minute in US
- **Recording:** ~$0.0025/minute
- **Example:** 5-minute call ≈ $0.08

### For This Project

- **Per call cost:** ~$0.10-0.15 (Twilio portion)
- **100 calls:** ~$10-15
- **1000 calls:** ~$100-150

---

## 🔧 Troubleshooting

### "Invalid credentials" error

- ✅ Double-check Account SID starts with `AC`
- ✅ Make sure Auth Token is exactly 32 characters
- ✅ No extra spaces in .env file
- ✅ Restart your backend after updating .env

### "Phone number not found" error

- ✅ Use E.164 format: `+14151234567`
- ✅ No spaces, dashes, or parentheses
- ✅ Include the country code (+1 for US)
- ✅ Verify the number exists in your Twilio account

### "Cannot call this number" error

- ⚠️ On trial account, you can only call verified numbers
- 💳 Upgrade to paid account to call any number
- ✅ Or verify the destination number in Twilio Console

### "Insufficient balance" error

- 💰 Add more credit to your account
- 💳 Go to Billing → Add Credit

---

## 🎯 Next Steps

Now that you have your Twilio credentials:

1. ✅ Your .env file is configured
2. ✅ Start your backend: `npm run dev`
3. ✅ Start your frontend: `npm run dev`
4. ✅ Test with your own phone number first!

See the main SETUP_GUIDE.md for complete instructions on running the application.

---

## 📚 Additional Resources

- **Twilio Console:** https://console.twilio.com/
- **Twilio Docs:** https://www.twilio.com/docs
- **Voice API Reference:** https://www.twilio.com/docs/voice/api
- **Pricing:** https://www.twilio.com/voice/pricing
- **Support:** https://support.twilio.com/

---

## ❓ Common Questions

**Q: How long does the trial last?**
A: Trial credit doesn't expire, but you're limited to verified numbers.

**Q: Do I need to upgrade immediately?**
A: No! Test with your own verified number first. Upgrade when ready to call customers.

**Q: Can I use Twilio for free forever?**
A: No, but the trial credit ($15) is enough for significant testing.

**Q: What happens if I run out of credit?**
A: Calls will fail. Add more credit in the Billing section.

**Q: Can I get multiple phone numbers?**
A: Yes! You can buy as many as you need. Each costs ~$1-2/month.

**Q: Is my Auth Token secure?**
A: Keep it secret! Never commit it to git. Use .env files (which are gitignored).

---

**🎉 Congratulations! You now have everything you need to make AI-powered phone calls!**
