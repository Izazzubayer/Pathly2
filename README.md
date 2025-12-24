# Pathly

**AI Route-Aware Travel Planning Platform**

A calm, AI-powered travel planning platform that transforms **social inspiration and scattered notes** into **route-optimized, human-approved itineraries**, anchored around where users actually stay.

## Core Belief

People don't plan trips top-down. They collect inspiration first — messily — and organize later. This product respects that behavior.

## Product Principles

1. **Inspiration first** — Start where planning actually begins
2. **Hotel as anchor** — All routes reference where you stay
3. **AI suggests, humans decide** — Every extraction is editable/confirmable
4. **Paths > proximity** — Route-based suggestions, not radius-based
5. **Calm over completeness** — Low cognitive load, no dashboards
6. **Editability over magic** — Users control the final plan

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Zinc palette only)
- **Components:** shadcn/ui
- **UI Philosophy:** Neutral, spacious, typography-driven — *"Apple Notes meets Apple Maps"*

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Places API Key (for location autocomplete)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your Google Places API key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Google Places API Key (required for location autocomplete)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Hugging Face API Key (optional - for AI place extraction fallback)
# Get it from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=your_huggingface_api_key

# OpenAI API Key (optional - better AI extraction, recommended)
# Get it from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key
```

#### Google Places API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API**, **Directions API**, and **Geocoding API**
4. Create credentials (API Key)
5. **IMPORTANT - Secure your API key:**
   - Add **Website restrictions**: `localhost:3000/*` and your production domain
   - Add **API restrictions**: Only enable the APIs you need (Places, Directions, Geocoding)
   - This prevents unauthorized use even if the key is exposed
6. Add the API key to `.env.local` as `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

**Note:** The app will work without the API key, but location autocomplete suggestions won't appear.

**Security:** Never commit API keys to Git. Always use environment variables and restrict your keys in Google Cloud Console.

#### Hugging Face API Setup (Required for AI Extraction)

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in
3. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
4. Create a new token (read access is enough)
5. Add it to `.env.local` as `HUGGINGFACE_API_KEY`

**Note:** Without this, the app uses simple regex-based extraction (less accurate). The free tier is generous for development.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/              # Next.js App Router pages
│   ├── trips/       # Trip-related pages
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Home page
│   └── globals.css  # Global styles with Zinc theme
├── components/      # React components
│   └── ui/         # shadcn/ui components
├── lib/            # Utilities
├── types/          # TypeScript type definitions
└── public/         # Static assets
```

## Development Status

🚧 **In Development** — Core trip creation flow is being built.

### Completed
- ✅ Next.js project setup with TypeScript
- ✅ Tailwind CSS with Zinc color palette
- ✅ shadcn/ui component library
- ✅ Basic UI components (Button, Card, Input, Label, Textarea)
- ✅ Trip creation flow structure
- ✅ Type definitions

### In Progress
- 🔄 AI extraction pipeline
- 🔄 Place validation & geocoding
- 🔄 Route-aware planning
- 🔄 Map integration

## License

ISC

