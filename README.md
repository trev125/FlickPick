# FlickPick

A collaborative movie picker for Plex. Two people join a session, set their preferences (genres, ratings, runtime, decade), and FlickPick recommends a movie from your Plex library that matches both.

## Features

- **Session-based** - Create a room with a 6-character code, share it with someone
- **Preference filters**:
  - Genres (multi-select from your library)
  - IMDB rating (minimum)
  - Rotten Tomatoes score (minimum)
  - Runtime blocks (under 90min, 90-120min, 120-150min, 150min+)
  - Decades (1950s-2020s, multi-select)
  - Include/exclude watched movies
- **Smart matching** - Finds movies that satisfy both users' criteria
- **Reroll** - Don't like the pick? Get another from the matched list

## Prerequisites

1. **Plex Token** - Find yours at: https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/

2. **OMDB API Key** (free, for IMDB/RT ratings) - Get one at: http://www.omdbapi.com/apikey.aspx

## Setup

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
PLEX_URL=http://your-plex-server:32400
PLEX_TOKEN=your-plex-token
OMDB_API_KEY=your-omdb-api-key
PORT=3002
```

### Docker (Recommended)

```bash
docker-compose up -d --build
```

The app will be available at `http://localhost:2`

### Local Development

Requires Node.js 16+ and pnpm.

```bash
pnpm install
pnpm dev
```

- Server runs on `http://localhost:3002`
- Client runs on `http://localhost:5173` (proxies API to server)

### Build for Production

```bash
pnpm build
pnpm start
```

## Usage

1. Open FlickPick in your browser
2. Enter your name and click **Create New Session**
3. Share the 6-character code (or the full link) with your movie partner
4. Both users select their preferences and submit
5. FlickPick shows a movie that matches both preferences
6. Click **Pick Another** to reroll, or **New Session** to start over

## Tech Stack

- **Server**: Express, TypeScript
- **Client**: React, Vite, React Router
- **APIs**: Plex API, OMDB API

## Notes

- OMDB free tier allows 1,000 requests/day - ratings are cached to minimize API calls
- Sessions expire after 24 hours
- The app only reads from your Plex library, it doesn't modify anything

## License

MIT
