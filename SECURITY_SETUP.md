# Security Setup Guide

This guide explains how to keep your API keys safe when pushing this project to GitHub.

## ✅ What's Already Protected

Your project is now configured to protect your API keys:

1. **`.gitignore` file created** - Prevents sensitive files from being committed
2. **Environment variables in use** - API keys are stored in `.env` files (not in code)
3. **Example files exist** - `.env.example` files show others what variables they need

## 🔐 Protected Files

The following files contain your API keys and will **NEVER** be pushed to GitHub:
- `backend/.env` - Contains all your API keys
- `frontend/.env.local` - Contains frontend configuration

## 📤 Safe to Commit

These files are safe to share publicly:
- `backend/.env.example` - Template without real keys
- `frontend/.env.local.example` - Template without real keys
- All your source code files
- Configuration files (package.json, tsconfig.json, etc.)

## 🚀 How to Push to GitHub Safely

Follow these steps in order:

### 1. Initialize Git (if not already done)
```bash
cd /Users/yuyan/AiCostumerCall
git init
```

### 2. Verify .gitignore is working
```bash
# This should NOT show .env or .env.local files
git status
```

### 3. Add all files
```bash
git add .
```

### 4. Double-check no sensitive files are staged
```bash
# Look through this list - make sure you don't see:
# - backend/.env
# - frontend/.env.local
# - Any files with API keys
git status
```

### 5. Make your first commit
```bash
git commit -m "Initial commit - AI Customer Call System"
```

### 6. Create a GitHub repository
- Go to https://github.com/new
- Create a new repository (public or private)
- **DO NOT** initialize it with README (we already have one)

### 7. Push to GitHub
```bash
# Replace YOUR_USERNAME and YOUR_REPO with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 🔍 Before Pushing - Verification Checklist

Run these commands to verify everything is safe:

```bash
# 1. Check what files will be committed
git status

# 2. If you see any .env files listed, STOP!
#    Make sure these are NOT listed:
#    - backend/.env
#    - frontend/.env.local

# 3. Check that .env files are ignored
git check-ignore backend/.env frontend/.env.local
# Should output:
# backend/.env
# frontend/.env.local

# 4. See what's actually staged
git diff --cached --name-only
```

## ⚠️ If You Accidentally Committed API Keys

If you already committed sensitive files, DON'T just delete them and commit again. The keys will still be in git history. Instead:

### Option 1: Fresh Start (Easiest)
```bash
# Remove git history
rm -rf .git

# Start over
git init
git add .
git commit -m "Initial commit"
```

### Option 2: Remove from History (Advanced)
```bash
# Remove sensitive file from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (dangerous - only do this before others clone!)
git push origin --force --all
```

**IMPORTANT:** After either option, rotate (change) ALL your API keys:
- Twilio: https://console.twilio.com
- OpenAI: https://platform.openai.com/api-keys
- Deepgram: https://console.deepgram.com
- ElevenLabs: https://elevenlabs.io

## 🎯 For Other Developers

When someone clones your repository, they should:

1. Copy the example files:
```bash
cd backend
cp .env.example .env

cd ../frontend
cp .env.local.example .env.local
```

2. Fill in their own API keys in:
   - `backend/.env`
   - `frontend/.env.local`

3. Never commit these files!

## 📚 Additional Security Tips

1. **Use environment-specific keys**: Different keys for development and production
2. **Rotate keys regularly**: Change your API keys periodically
3. **Use read-only keys when possible**: Some services offer limited-permission keys
4. **Monitor API usage**: Watch for unexpected usage that might indicate a leak
5. **Consider GitHub Secrets**: For CI/CD, use GitHub Actions secrets

## 🆘 If Keys Are Exposed

If you accidentally push API keys to GitHub:

1. **Immediately rotate all exposed keys**
2. **Remove from git history** (see above)
3. **Check API usage** for unauthorized access
4. **Consider making repo private** temporarily while cleaning up

## ✨ Best Practices

- ✅ Always use `.env` files for secrets
- ✅ Keep `.gitignore` up to date
- ✅ Provide `.env.example` files
- ✅ Document required environment variables
- ✅ Review `git status` before committing
- ❌ Never hardcode API keys in source files
- ❌ Never commit `.env` files
- ❌ Never share keys in issues, PRs, or discussions

---

**You're all set!** Your `.gitignore` is configured correctly. Just follow the steps above to push safely to GitHub.

