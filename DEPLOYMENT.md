# Vercel Deployment Guide

## Quick Setup Checklist

- [ ] Neon PostgreSQL database created
- [ ] GitHub repository pushed
- [ ] Environment variables configured in Vercel
- [ ] Database seeded with players
- [ ] Deployment successful

## Step-by-Step Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project in Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your `padel-league` repository
4. Click "Import"

### 3. Configure Environment Variables

In the Vercel project settings, add these environment variables:

**DATABASE_URL** (Pooled Connection - for runtime)
```
postgresql://neondb_owner:npg_pMa9wISi8vTH@ep-hidden-darkness-abq6jphg-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

**DIRECT_URL** (Direct Connection - for migrations)
```
postgresql://neondb_owner:npg_pMa9wISi8vTH@ep-hidden-darkness-abq6jphg.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

**Apply to all environments:**
- ✅ Production
- ✅ Preview
- ✅ Development

### 4. Deploy

Click "Deploy" - Vercel will:
1. Install dependencies
2. Generate Prisma Client
3. Run database migrations
4. Build the Next.js app
5. Deploy to production

### 5. Seed the Database

After successful deployment, you need to add the 5 players. You have two options:

**Option A: Using Prisma Studio (Recommended)**

1. Install Prisma CLI locally: `npm install -g prisma`
2. Run: `DATABASE_URL="your-production-pooled-url" npx prisma studio`
3. Manually add these 5 players:
   - Jakub
   - Joe
   - Jon
   - Matt
   - Charlie

**Option B: Using the seed script**

```bash
# Set the environment variable
export DATABASE_URL="postgresql://neondb_owner:npg_pMa9wISi8vTH@ep-hidden-darkness-abq6jphg-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"

# Run the seed
npm run db:seed
```

### 6. Verify Deployment

1. Visit your Vercel URL (e.g., `https://padel-league-abc123.vercel.app`)
2. You should see the dashboard with the 5 players
3. Try creating a season to verify everything works!

## Environment Variable Security

✅ **What's Protected:**
- `.env` file is in `.gitignore` and NOT committed to Git
- Connection strings are stored only in Vercel's secure environment variables
- Credentials are encrypted at rest in Vercel

⚠️ **Important Notes:**
- Never share your `.env` file
- Never commit credentials to Git
- Rotate passwords if accidentally exposed
- Use Vercel's environment variable encryption

## Continuous Deployment

Once set up, every push to `main` will automatically:
1. Trigger a new deployment
2. Run migrations if schema changed
3. Build and deploy the updated app

## Monitoring

**View Logs:**
- Go to your Vercel project dashboard
- Click "Deployments"
- Select a deployment
- View build logs and runtime logs

**Database Management:**
- Use Neon dashboard: https://console.neon.tech
- Monitor connections, query performance, and storage

## Rollback

If something goes wrong:
1. Go to Vercel dashboard
2. Click "Deployments"
3. Find a previous working deployment
4. Click "..." → "Promote to Production"

## Troubleshooting

### Build Fails

**Error: Cannot find module '@prisma/client'**
- Solution: Ensure `postinstall` script runs `prisma generate`

**Error: P1001 Can't reach database**
- Check environment variables are set correctly
- Verify Neon database is running
- Ensure connection string includes `?sslmode=require`

### Runtime Errors

**Error: PrismaClient is unable to run in Vercel Edge Functions**
- This app uses Node.js runtime (default), not Edge
- Verify in `vercel.json` or route configs

**Error: Too many database connections**
- Use the **pooled** connection string for `DATABASE_URL`
- Check you're not opening multiple Prisma clients

### Migration Issues

**Error: Migration failed to apply**
- Ensure `DIRECT_URL` is set (not pooled)
- Check migration files are committed to Git
- Verify database permissions

## Custom Domain (Optional)

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. SSL certificate is automatically provisioned

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs
