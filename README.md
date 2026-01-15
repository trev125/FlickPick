# FlickPick

A collaborative movie picker for Plex. One or two people join a session, set their preferences, vote Tinder-style on matched movies, and see which films everyone agrees on.

## Features

- **Session-based** - Create a room with a 6-character code, share it with someone (or play solo)
- **Admin protection** - Optional password to control who can create sessions
- **Preference filters**:
  - Moods (Feel Good, Edge of Seat, Mind-Bending, etc.)
  - Genres (multi-select from your library)
  - Era (year range with 5-year steps)
  - Runtime (15-minute intervals)
  - IMDB rating (minimum)
  - Include/exclude watched movies
- **Tinder-style voting** - Swipe right (yes) or left (no) on each movie
- **Smart matching** - Finds movies that satisfy both users' criteria
- **Rich movie info**:
  - IMDB, RT Critics, and RT Audience ratings with visual comparison bars
  - Director and cast with headshot images
  - Content rating (links to IMDB parental guide)
  - Expandable descriptions
- **Final results** - See which movies both people said yes to, plus collapsible sections showing who rejected what
- **Configurable movie count** - Choose 10-50 movies to vote on (default: 25)
- **Solo mode** - Use it by yourself to filter down your library
- **Customizable UI** - Dark/light mode, 15 accent colors

## How It Works

1. **Create Session** - Admin enters password, sets movie count, creates session
2. **Share Code** - Give the 6-character code to your movie partner
3. **Set Preferences** - Both users select their mood, genres, era, runtime, etc.
4. **Vote** - Swipe through movies Tinder-style (right = yes, left = no)
5. **Results** - See the movies you both said yes to!

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

# Optional: Require password to create new sessions
ADMIN_PASSWORD=your-secret-password
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

## Authentication

FlickPick uses a simple invite-code system:

- **Creating sessions** requires the admin password (if `ADMIN_PASSWORD` is set)
- **Joining sessions** only requires the 6-character session code
- Sessions automatically expire after 24 hours

This lets you expose FlickPick publicly while controlling who can create sessions. Just share session codes with friends when you want to pick a movie together.

If `ADMIN_PASSWORD` is not set, anyone can create sessions (useful for local/private use).

## Tech Stack

- **Server**: Express, TypeScript, Node.js 22
- **Client**: React, Vite, Tailwind CSS v4, shadcn/ui
- **APIs**: Plex API, OMDB API, TMDB API

## Data & Caching

- **Ratings cache** - OMDB/TMDB data is cached to `ratings-cache.json` to minimize API calls
- **Image proxy** - All images are proxied through the server so they work from external networks
- **Sessions** - Stored in memory, expire after 24 hours
- **Read-only** - FlickPick only reads from your Plex library, never modifies anything

## License

MIT
