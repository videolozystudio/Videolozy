# Film Editor Portfolio

A production-grade portfolio website for a professional film editor with dual-interface architecture:

- **Client Interface** — Public-facing portfolio with embedded video players and category filtering
- **Admin Interface** — Password-protected CMS dashboard for full CRUD project management

## Tech Stack

| Layer        | Technology               |
|--------------|--------------------------|
| SSG          | Eleventy v3 (Liquid)     |
| Database     | Supabase (PostgreSQL)    |
| Auth         | Supabase Auth            |
| Styling      | Tailwind CSS v3.3        |
| Hosting      | Vercel                   |
| Video        | YouTube / Vimeo (embeds) |
| Analytics    | PostHog                  |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/film-editor-portfolio.git
cd film-editor-portfolio
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable                   | Where to find it                                        |
|----------------------------|---------------------------------------------------------|
| `SUPABASE_URL`             | Supabase Dashboard → Project → Settings → API           |
| `SUPABASE_ANON_KEY`        | Supabase Dashboard → Project → Settings → API           |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase Dashboard → Project → Settings → API (secret!) |
| `POSTHOG_KEY`              | PostHog → Project Settings → Project API Key            |
| `SITE_URL`                 | Your deployed site URL                                  |
| `EDITOR_NAME`              | Your full name                                          |
| `EDITOR_TAGLINE`           | Your creative tagline                                   |
| `CONTACT_EMAIL`            | Your contact email                                      |

> ⚠️ **NEVER commit `.env` to version control.** The `.env.example` file is safe to commit.

### 3. Set Up Supabase Database

1. Go to your Supabase project → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and **Run** the migration
4. The migration creates all tables, indexes, RLS policies, and seed data

### 4. Create Admin User

1. In Supabase → **Authentication → Users** → **Invite user** (enter your admin email)
2. Accept the invitation email and set a password
3. In Supabase **SQL Editor**, run:

```sql
INSERT INTO public.admin_users (user_id, email)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-admin@email.com'),
  'your-admin@email.com'
);
```

### 5. Run Development Server

```bash
npm run dev
```

This runs Eleventy and Tailwind CSS in parallel with live reload.

- **Portfolio**: http://localhost:8080
- **Admin Panel**: http://localhost:8080/admin/login/

---

## Deployment (Vercel)

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B — Vercel Dashboard

1. Push your code to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Set **Root Directory** to `.` (the project root)
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `_site`
6. Add all environment variables from your `.env` file

---

## Project Structure

```
film-editor-portfolio/
├── .eleventy.js              # Eleventy config (filters, shortcodes, collections)
├── .env.example              # Environment variables template
├── tailwind.config.js        # Tailwind theme with neon red palette
├── vercel.json               # Vercel deploy config + CSP headers
├── package.json
│
├── api/                      # Vercel serverless functions (API routes)
│   ├── projects/
│   │   ├── index.js          # GET all / POST create
│   │   ├── [id].js           # GET / PUT / DELETE single project
│   │   └── [id]/views.js     # POST increment view count
│   └── admin/
│       └── dashboard.js      # GET aggregated admin stats
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full schema + RLS + seed data
│
└── src/
    ├── _data/
    │   └── site.js           # Global site metadata
    │
    ├── _includes/
    │   ├── layouts/
    │   │   ├── base.liquid   # HTML shell (SEO, fonts, PostHog)
    │   │   ├── client.liquid # Public layout (header + footer)
    │   │   └── admin.liquid  # Admin layout (sidebar + top bar)
    │   └── components/
    │       ├── header.liquid
    │       ├── footer.liquid
    │       ├── video-grid.liquid
    │       ├── video-card.liquid
    │       ├── video-player.liquid
    │       └── admin/
    │           ├── dashboard-stats.liquid
    │           ├── project-form.liquid
    │           └── project-list.liquid
    │
    ├── pages/
    │   ├── index.liquid             # Homepage
    │   ├── projects/[slug].liquid   # Dynamic project page
    │   └── admin/
    │       ├── login.liquid
    │       ├── index.liquid         # Dashboard
    │       ├── settings.liquid
    │       └── projects/
    │           ├── index.liquid     # Project list
    │           ├── new.liquid       # Create form
    │           └── [id].liquid      # Edit form
    │
    ├── assets/
    │   ├── css/styles.css    # Tailwind directives + custom styles
    │   └── js/
    │       ├── client.js     # Public portfolio JS
    │       └── admin.js      # Admin panel JS
    │
    └── utils/
        └── supabase.js       # Supabase client helpers
```

---

## Security Architecture

| Concern                | Implementation                                      |
|------------------------|-----------------------------------------------------|
| Auth                   | Supabase Auth (JWT) via `signInWithPassword`         |
| Row Level Security     | Enabled on all tables; public SELECT, admin writes  |
| Service Role Key       | Server-only (Vercel functions, never in frontend)   |
| Content Security Policy| `vercel.json` headers — blocks XSS                 |
| Rate Limiting          | In-memory per-IP (upgrade to Upstash Redis in prod) |
| Input Sanitization     | All API inputs stripped and validated               |
| CSRF                   | Handled by Supabase Auth cookies                    |
| View Count Spam        | Per-IP per-project 1-hour deduplication             |

---

## Admin Workflow

1. Navigate to `/admin/login/`
2. Sign in with your Supabase email/password
3. From the **Dashboard**, see total stats and recent projects
4. Go to **Projects → New Project** to add a video
5. Provide the video ID from YouTube or Vimeo (just the ID, not the full URL)
6. Toggle **Featured** to highlight it on the homepage
7. Use **Sort Order** (lower = first) to control display order
8. Edit or delete projects from the **Projects** list

---

## Customizing

### Change Colours
Edit `tailwind.config.js`:
```js
colors: {
  "neon-red": "#FF0040",   // ← Change this
  "void":     "#080808",   // ← Dark background
  // ...
}
```

### Change Site Name / Tagline
Edit `.env`:
```env
EDITOR_NAME=Your Name
EDITOR_TAGLINE=Your Creative Tagline
```

### Add a New Category
1. Add it to `src/_data/site.js` → `categories` array
2. Add it to `supabase/migrations/001_initial_schema.sql` → `CHECK` constraint on `category`
3. Migrate the constraint change in Supabase SQL Editor

---

## License

MIT — use freely for personal or commercial portfolios.
