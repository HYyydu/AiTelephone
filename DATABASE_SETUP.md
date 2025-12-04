# 🗄️ Database Setup Guide

## ✅ What We Just Installed

- ✅ **Drizzle ORM** - Type-safe database queries
- ✅ **PostgreSQL client** - Database connection
- ✅ **Drizzle Kit** - Migration tools

## 📋 Next Steps

### Step 1: Get Your Database (Choose One)

#### Option A: Supabase (Recommended - 5 minutes) ⭐

1. **Sign up:** https://supabase.com
2. **Create project:**
   - Name: `ai-customer-call`
   - Choose a password (save it!)
   - Select region closest to you
3. **Get connection string:**
   - Go to Project Settings → Database
   - Copy the **"Connection pooling"** string (starts with `postgresql://postgres.`)
   - It looks like:
     ```
     postgresql://postgres.[xxx]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
     ```

#### Option B: Local PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb ai_customer_call_dev

# Your connection string will be:
# postgresql://localhost/ai_customer_call_dev
```

---

### Step 2: Add Database URL to .env

Open `backend/.env` and add:

```env
# Add this line
DATABASE_URL=your_connection_string_here
```

Replace `your_connection_string_here` with your actual connection string from Step 1.

**Example `.env` file:**

```env
# Existing vars
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-xxxxx
DEEPGRAM_API_KEY=xxxxx
PORT=3001

# NEW - Add this
DATABASE_URL=postgresql://postgres.[xxx]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

---

### Step 3: Push Schema to Database

This creates all the tables in your database:

```bash
cd /Users/yuyan/AiCostumerCall/backend

# Push schema to database (creates tables)
npm run db:push
```

You should see:

```
✅ Tables created successfully!
```

---

### Step 4: Verify Setup (Optional)

Open Drizzle Studio to see your database:

```bash
npm run db:studio
```

This opens a web interface at `http://localhost:4983` where you can:

- See all your tables
- Browse data
- Run queries

---

## 📊 Database Tables Created

Your database now has these tables:

1. **users** - User accounts
2. **organizations** - Companies/teams
3. **calls** - Call records (your existing data)
4. **transcripts** - Call transcripts
5. **api_keys** - API keys for organizations
6. **call_analytics** - Call metrics (future)

---

## 🔧 Useful Commands

```bash
# Push schema changes to database
npm run db:push

# Generate migration files
npm run db:generate

# Open database viewer
npm run db:studio

# Run development server
npm run dev
```

---

## 🎯 What's Next?

Once your database is set up:

1. ✅ Update your `store.ts` to use real database instead of memory
2. ✅ Add user authentication (NextAuth)
3. ✅ Build better dashboard with real data

---

## 🐛 Troubleshooting

### Error: "Can't connect to database"

- Check your `DATABASE_URL` in `.env`
- Make sure your database is running
- For Supabase: Check your password is correct

### Error: "relation does not exist"

- Run `npm run db:push` to create tables

### Error: "permission denied"

- Check your database credentials
- For Supabase: Make sure you're using the "Connection pooling" URL

---

## 📚 Resources

- **Drizzle Docs:** https://orm.drizzle.team/docs/overview
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Tutorial:** https://www.postgresql.org/docs/

---

**Ready? Follow the 4 steps above to set up your database!** 🚀

Once done, you'll have persistent storage for all your calls and transcripts!
