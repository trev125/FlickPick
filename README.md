# FlickPick

A collaborative movie picker for Plex. Two people join a session, set their preferences, and FlickPick recommends a movie from your Plex library that satisfies both.

## Features

- **Session-based** - Create a room with a 6-character code, share it with someone
- **Preference filters**:
  - Moods (Feel Good, Edge of Seat, Mind-Bending, etc.)
  - Genres (multi-select from your library)
  - Era (year range with 5-year steps)
  - Runtime (15-minute intervals)
  - IMDB rating (minimum)
  - Include/exclude watched movies
- **Smart matching** - Finds movies that satisfy both users' criteria
- **Rich movie info**:
  - IMDB, RT Critics, and RT Audience ratings with visual comparison bars
  - Director and cast with headshot images
  - Content rating (links to IMDB parental guide)
  - "Why This Movie?" breakdown showing matched criteria
- **Reroll** - Don't like the pick? Cycle through all matches
- **Customizable UI** - Dark/light mode, 15 accent colors

## Screenshots

![FlickPick Demo](https://via.placeholder.com/800x400?text=FlickPick+Screenshot)

## Prerequisites

1. **Plex Server** with movie libraries

2. **Plex Token** - Get yours at: https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/

3. **OMDB API Key** (free, 1000 req/day) - Get one at: http://www.omdbapi.com/apikey.aspx

4. **TMDB API Key** (free, for actor headshots) - Get one at: https://www.themoviedb.org/settings/api

## Setup

### Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PLEX_URL=http://your-plex-server:32400
PLEX_TOKEN=your-plex-token
OMDB_API_KEY=your-omdb-api-key
TMDB_API_KEY=your-tmdb-api-key
PORT=3002
```

### Docker (Recommended)

```bash
docker-compose up -d --build
```

The app will be available at `http://localhost:3002`

### Local Development

Requires Node.js 22+ and pnpm.

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
2. Enter your name and click **Start New Session**
3. Share the 6-character code (or the full link) with your movie partner
4. Both users select their preferences and submit
5. FlickPick shows a movie that matches both preferences
6. Click **Different Pick** to see more options, or **New Session** to start over

## Tech Stack

- **Server**: Express, TypeScript, Node.js 22
- **Client**: React, Vite, Tailwind CSS v4, shadcn/ui
- **APIs**: Plex API, OMDB API, TMDB API

## Data & Caching

- **Ratings cache** - OMDB/TMDB data is cached to `ratings-cache.json` to minimize API calls
- **Sessions** - Stored in memory, expire after 24 hours
- **Read-only** - FlickPick only reads from your Plex library, never modifies anything

## License

MIT
