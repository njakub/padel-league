# 🎾 Padel League Tracker

A web application for tracking padel doubles league matches with perfectly balanced schedules and comprehensive statistics.

## Features

- **Perfectly Balanced Schedules**: Automated generation of fair schedules ensuring every player pair teams up equally and faces all opponent pairs equally
- **Flexible Season Lengths**: Support for 15, 30, 45, or 60 match seasons
- **Detailed Scoring System**: First-to-4-games format with points calculation (games won + win bonus)
- **Live Standings**: Real-time player rankings with wins, losses, games, and total points
- **League Tally**: Aggregate statistics across all completed seasons
- **Match Management**: Easy result entry, editing, and validation

## Scoring Rules

- Matches are **first to 4 games**
- Valid final scores: 4-0, 4-1, 4-2, 4-3
- **Points per player per match:**
  - 1 point per game their team won
  - PLUS 1 bonus point if their team won the match

**Examples:**

- 4-0: Winners get 5 points each (4 + 1 bonus), losers get 0
- 4-2: Winners get 5 points each (4 + 1 bonus), losers get 2
- 4-3: Winners get 5 points each (4 + 1 bonus), losers get 3

## Schedule Balance

The system generates **perfectly balanced schedules** where:

1. **Teammate pairing balance**: Every unordered pair of players appears as teammates the same number of times
2. **Opponent balance per teammate pair**: When a teammate pair plays, they face each of their possible opponent pairs equally

This ensures complete fairness over the course of a season.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL database (or other PostgreSQL provider)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Neon PostgreSQL connection strings:

```env
# Pooled connection (for Vercel/serverless)
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require"

# Direct connection (for migrations)
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/DATABASE?sslmode=require"
```

**Security Note**: Never commit the `.env` file to version control! It's already in `.gitignore`.

### 3. Set Up Database

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
```

This will:

- Connect to your Neon PostgreSQL database
- Create all necessary tables
- Generate Prisma Client

### 4. Seed Players

Populate the database with the 5 players:

```bash
npm run db:seed
```

This creates the fixed roster: Jakub, Joe, Jon, Matt, Charlie

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (includes Prisma generation and migrations)
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run db:seed` - Seed database with players
- `npm run db:migrate` - Run Prisma migrations in development
- `npm run db:push` - Push schema changes without migrations
- `npm run db:studio` - Open Prisma Studio to view/edit data

## Project Structure

```
padel-league/
├── app/                          # Next.js App Router pages
│   ├── actions.ts                # Server actions for mutations
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Dashboard (home page)
│   ├── globals.css               # Global styles
│   └── season/
│       └── [id]/
│           └── page.tsx          # Season detail page
├── components/                   # React components
│   ├── CreateSeasonButton.tsx   # Season creation modal
│   ├── MatchResultForm.tsx      # Match result entry/edit
│   └── CompleteSeasonButton.tsx # Season completion
├── lib/                          # Core business logic
│   ├── prisma.ts                 # Prisma client singleton
│   ├── schedule-generator.ts    # Schedule generation algorithm
│   ├── schedule-generator.test.ts
│   ├── scoring.ts                # Points calculation
│   └── scoring.test.ts
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                   # Seed script
└── README.md
```

## Usage Guide

### Creating a Season

1. Click **"Create New Season"** button on the dashboard
2. Optionally enter a season name (auto-generates if left empty)
3. Select season length: 15, 30, 45, or 60 matches
4. Click **"Create Season"** - schedule is automatically generated

**Note**: Only one active season is allowed at a time.

### Recording Match Results

1. Navigate to the active season detail page
2. Find the match you want to record
3. Click **"Enter Result"**
4. Enter games won by each team (must be valid: one team has 4, other has 0-3)
5. Click **"Save Result"**

### Editing Results

1. On the season detail page, find a completed match
2. Click **"Edit Result"**
3. Update the score or click **"Delete"** to remove the result
4. Click **"Save Result"**

### Completing a Season

1. Ensure all matches have results recorded
2. On the season detail page, click **"Mark as Completed"**
3. The season moves to archived status and contributes to the overall league tally

### Viewing League Statistics

The dashboard shows:

- **Active Season**: Current standings and progress
- **Overall League Tally**: Aggregated stats from all completed seasons
- **Archived Seasons**: List of past seasons with links to details

## Testing

The project includes comprehensive tests for core logic:

### Run All Tests

```bash
npm test
```

### Test Coverage

- **Schedule Generation**: Validates balance constraints for all season lengths
- **Scoring Calculations**: Verifies points calculation for all score scenarios
- **Standings**: Tests aggregation of match results into player statistics

### Run Tests with UI

```bash
npm run test:ui
```

## Database Schema

### Player

- `id`: Auto-increment primary key
- `name`: Unique player name

### Season

- `id`: Auto-increment primary key
- `name`: Season name
- `status`: ACTIVE or COMPLETED
- `totalMatches`: 15, 30, 45, or 60
- `createdAt`: Timestamp

### Match

- `id`: Auto-increment primary key
- `seasonId`: Foreign key to Season
- `matchNumber`: Sequential number (1 to totalMatches)
- `sitOutPlayerId`: Player sitting out
- `teamAPlayer1Id`, `teamAPlayer2Id`: Team A players
- `teamBPlayer1Id`, `teamBPlayer2Id`: Team B players
- `teamAGames`, `teamBGames`: Score (nullable until played)
- `winnerTeam`: "A" or "B" (nullable until played)
- `playedAt`: Timestamp (nullable until played)

## Production Deployment (Vercel)

### Prerequisites

1. **Neon PostgreSQL Database** - Sign up at [neon.tech](https://neon.tech)
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **GitHub Repository** - Push your code to GitHub

### Deployment Steps

#### 1. Prepare Your Database

Get your Neon connection strings from the Neon dashboard:

- **Pooled connection** (with `-pooler` in the hostname) - use for `DATABASE_URL`
- **Direct connection** (without `-pooler`) - use for `DIRECT_URL`

Both should include `?sslmode=require` at the end.

#### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure environment variables:
   - `DATABASE_URL`: Your Neon pooled connection string
   - `DIRECT_URL`: Your Neon direct connection string
4. Click **Deploy**

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables
vercel env add DATABASE_URL
vercel env add DIRECT_URL

# Deploy to production
vercel --prod
```

#### 3. Seed Your Production Database

After deployment, run the seed command:

```bash
vercel env pull .env.production.local
DATABASE_URL="your-production-url" npm run db:seed
```

Or use Prisma Studio to manually add the 5 players.

### Environment Variables for Vercel

Set these in your Vercel project settings:

| Variable       | Value                                       | Environment                      |
| -------------- | ------------------------------------------- | -------------------------------- |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST-pooler...` | Production, Preview, Development |
| `DIRECT_URL`   | `postgresql://USER:PASSWORD@HOST...`        | Production, Preview, Development |

**Important**:

- Use the **pooled connection** (`-pooler` hostname) for `DATABASE_URL` - this is optimized for serverless
- Use the **direct connection** for `DIRECT_URL` - this is used for migrations during build
- Both URLs should end with `?sslmode=require`

### Build Configuration

The `build` script in `package.json` automatically handles:

1. `prisma generate` - Generate Prisma Client
2. `prisma migrate deploy` - Apply migrations to production
3. `next build` - Build Next.js application

No additional configuration needed!

### Post-Deployment

1. Visit your Vercel URL
2. Create your first season
3. Start tracking matches!

### Troubleshooting

**Build fails with "Cannot find module '@prisma/client'"**

- Ensure `postinstall` script includes `prisma generate`

**Database connection errors**

- Verify environment variables are set correctly in Vercel
- Check that your Neon database allows connections from Vercel IPs (it should by default)
- Ensure connection strings include `?sslmode=require`

**Migration errors**

- Use `DIRECT_URL` for migrations, not the pooled connection
- Ensure `DIRECT_URL` is set in Vercel environment variables

## Algorithm Details

### Sunday League — Base Schedule (15 matches)

For 5 players, there are:

- 5 choices for sit-out player
- For remaining 4 players, exactly 3 unique ways to split into two teams

Total: 5 × 3 = 15 unique match configurations

#### Balance Verification

The schedule generator ensures:

- All 10 possible teammate pairs appear exactly 3 times in a 15-match season
- Each teammate pair faces each of their 3 possible opponent pairs exactly once

For longer seasons (30/45/60), the base schedule is repeated, maintaining proportional balance.

---

### Wednesday League — Base Schedule (14 matches)

Uses Berger's round-robin 1-factorization of K₈:

- Fix player 8 as an anchor; rotate the remaining 7 players across 7 rounds
- Each round = 2 simultaneous matches on 2 courts — **no one sits out**

Total: 7 rounds × 2 matches = 14 unique match configurations

#### Balance Verification

Properties of the 14-match base schedule:

- All **28** possible teammate pairs (C(8,2)) appear **exactly once**
- All **14** possible pair-vs-pair matchups appear **exactly once**
- Every player plays **exactly 7 matches** (one per round)

For longer seasons (28/42), the base schedule is repeated, maintaining proportional balance.

#### Player Pool

Each Wednesday season can use any 8 players selected from the pool. The default pool is:
Jakub, Joe, Matt, Charlie, Jon, Izra, Dan, Caleb — with the option to add new players at season creation time.

## License

MIT

## Contributing

This is a personal project for a specific league setup (5 players, fixed rules). Feel free to fork and adapt for your needs!
