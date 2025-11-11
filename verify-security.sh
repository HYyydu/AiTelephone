#!/bin/bash

# Security Verification Script
# Run this before pushing to GitHub

echo "🔍 Verifying security setup..."
echo ""

# Check if .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo "❌ ERROR: .gitignore file not found!"
    exit 1
fi
echo "✅ .gitignore file exists"

# Check if .gitignore contains .env
if grep -q "^.env$" .gitignore; then
    echo "✅ .gitignore properly excludes .env files"
else
    echo "❌ WARNING: .gitignore doesn't exclude .env files!"
fi

# Check if .env files exist
echo ""
echo "📁 Checking for .env files..."
if [ -f "backend/.env" ]; then
    echo "✅ Found backend/.env (should be ignored)"
else
    echo "⚠️  backend/.env not found"
fi

if [ -f "frontend/.env.local" ]; then
    echo "✅ Found frontend/.env.local (should be ignored)"
else
    echo "⚠️  frontend/.env.local not found"
fi

# Check if this is a git repo
echo ""
if [ -d ".git" ]; then
    echo "📦 Git repository detected"
    echo ""
    echo "🔍 Checking which files would be committed..."
    
    # Check if .env files are being tracked
    if git ls-files | grep -q "backend/.env"; then
        echo "❌ DANGER: backend/.env is tracked by git!"
        echo "   Run: git rm --cached backend/.env"
        exit 1
    else
        echo "✅ backend/.env is not tracked"
    fi
    
    if git ls-files | grep -q "frontend/.env.local"; then
        echo "❌ DANGER: frontend/.env.local is tracked by git!"
        echo "   Run: git rm --cached frontend/.env.local"
        exit 1
    else
        echo "✅ frontend/.env.local is not tracked"
    fi
    
    echo ""
    echo "📋 Files that will be committed:"
    git ls-files | grep -E "\.ts$|\.tsx$|\.json$|\.md$" | head -20
    echo "   ... (showing first 20 code files)"
    
else
    echo "ℹ️  Not a git repository yet"
    echo "   Run 'git init' to initialize"
fi

echo ""
echo "🎉 Security check complete!"
echo ""
echo "Next steps:"
echo "1. If not done: git init"
echo "2. Review files: git status"
echo "3. Add files: git add ."
echo "4. Commit: git commit -m 'Initial commit'"
echo "5. Create repo on GitHub"
echo "6. Push: git push -u origin main"

