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
- **Database**: SQLite (development) / PostgreSQL (production-ready via Prisma)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Initialize Prisma and create the database:

```bash
npx prisma migrate dev --name init
```

This will:

- Create the SQLite database file
- Run migrations to set up tables
- Generate Prisma Client

### 3. Seed Players

Populate the database with the 5 players:

```bash
npm run db:seed
```

This creates the fixed roster: Jakub, Joe, Jon, Matt, Charlie

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run db:seed` - Seed database with players

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

## Production Deployment

To use PostgreSQL instead of SQLite for production:

1. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Set `DATABASE_URL` environment variable to your PostgreSQL connection string

3. Run migrations:

```bash
npx prisma migrate deploy
```

4. Seed the database:

```bash
npm run db:seed
```

## Algorithm Details

### Base Schedule (15 matches)

For 5 players, there are:

- 5 choices for sit-out player
- For remaining 4 players, exactly 3 unique ways to split into two teams

Total: 5 × 3 = 15 unique match configurations

### Balance Verification

The schedule generator ensures:

- All 10 possible teammate pairs appear exactly 3 times in a 15-match season
- Each teammate pair faces each of their 3 possible opponent pairs exactly once

For longer seasons (30/45/60), the base schedule is repeated, maintaining proportional balance.

## License

MIT

## Contributing

This is a personal project for a specific league setup (5 players, fixed rules). Feel free to fork and adapt for your needs!
