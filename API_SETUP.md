# API Setup Guide for Pathly

This document lists all the APIs and services you need to connect for Pathly to work fully.

## Required APIs

### 1. Google Places API (REQUIRED)
**What it does:**
- Location autocomplete for destination and hotel
- Place validation and geocoding
- Route calculations (Directions API) ⚠️ **REQUIRES SEPARATE ENABLEMENT**

**Where to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing one
3. Enable these APIs:
   - **Places API** (for autocomplete and place search)
   - **Directions API** ⚠️ **REQUIRED FOR ROUTES** - Enable at: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com
   - **Geocoding API** (for converting addresses to coordinates) - Enable at: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
4. Create an API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the key

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_api_key_here
```

**Pricing:**
- $200/month free credit (covers ~70,000+ requests)
- Places Autocomplete: $2.83 per 1,000 requests
- Directions API: $5.00 per 1,000 requests
- Geocoding: $5.00 per 1,000 requests

**Links:**
- [Google Cloud Console](https://console.cloud.google.com/)
- [Places API Docs](https://developers.google.com/maps/documentation/places/web-service)
- [Directions API Docs](https://developers.google.com/maps/documentation/directions)

---

## Optional APIs

### 2. Hugging Face API (REQUIRED - for AI extraction)
**What it does:**
- Extracts place names from inspiration text/URLs/files
- Uses Named Entity Recognition (NER) to find locations
- Classifies places (food, attraction, etc.)
- Processes uploaded files (PDF, DOC, images with OCR)

**Where to get it:**
1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in (free)
3. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
4. Click "New token"
5. Name it (e.g., "Pathly") and select "Read" access
6. Copy the token

**Add to `.env.local`:**
```bash
HUGGINGFACE_API_KEY=your_token_here
```

**Pricing:**
- **FREE** for most use cases
- Free tier: 1000 requests/day (more than enough for development)
- Paid plans available for higher usage

**Models Used:**
- `dslim/bert-base-NER` - Named Entity Recognition
- `facebook/bart-large-mnli` - Zero-shot classification

**Note:** Without this, the app uses simple regex-based extraction (less accurate but free)

**Links:**
- [OpenAI Platform](https://platform.openai.com/)
- [OpenAI Pricing](https://openai.com/api/pricing/)

---

## Future APIs (Not Yet Implemented)

### 3. Instagram Basic Display API (Future)
**What it would do:**
- Extract place names from Instagram reel/post URLs
- Get metadata from Instagram posts

**Where to get it:**
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- Requires Facebook Developer account
- Requires app review for production

### 4. YouTube Data API (Future)
**What it would do:**
- Extract place names from YouTube video descriptions/titles
- Get video metadata

**Where to get it:**
- [YouTube Data API](https://developers.google.com/youtube/v3)
- Free quota: 10,000 units/day
- Part of Google Cloud Console

---

## Current Status

✅ **Implemented:**
- Google Places API (autocomplete, validation, geocoding)
- Google Directions API (route calculations)
- OpenAI API (AI extraction with fallback)

⏳ **Not Yet Implemented:**
- Instagram API integration
- YouTube API integration
- Map visualization (Mapbox/Google Maps)

---

## Environment Variables Summary

Create a `.env.local` file with:

```bash
# Required
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_api_key
HUGGINGFACE_API_KEY=your_huggingface_token
```

---

## Testing Without APIs

The app will work with limited functionality:
- ✅ **Without Google Places API:** No autocomplete, but manual input works
- ✅ **Without Hugging Face API:** Uses regex-based extraction (less accurate)
- ❌ **Without Google Directions API:** Route calculations won't work

---

## Cost Estimates (Monthly)

For a small app (100 trips/month, ~10 places per trip):

- **Google Places API:** ~$5-10/month (well within free tier)
- **Hugging Face API:** **FREE** (1000 requests/day free tier)
- **Total:** ~$5-10/month (or free if within Google's $200 credit)

---

## Security Notes

1. **Never commit API keys to git** - `.env.local` is in `.gitignore`
2. **Restrict API keys in production:**
   - Set domain restrictions for Google API
   - Set usage quotas
   - Monitor usage in Google Cloud Console
3. **For production:** Use environment variables in your hosting platform (Vercel, etc.)

---

## Setting Up Billing Alerts ⚠️

To avoid unexpected charges, set up billing alerts. Here's how:

### Step 1: Access Budgets & Alerts

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project
3. Open the **hamburger menu** (☰) in the top left
4. Navigate to **Billing** → **Budgets & alerts**
   - Direct link: https://console.cloud.google.com/billing/budgets
   - (If you don't see this option, you may need to set up billing first)

### Step 2: Create a Budget

1. Click **"CREATE BUDGET"** button
2. **Budget name:** Enter something like "Pathly API Usage"
3. **Budget scope:**
   - Select "Specified projects"
   - Choose your project
4. **Budget amount:**
   - **Recommended:** Set to `$50` or `$100` (well above expected usage, but low enough to catch issues)
   - This triggers alerts before you hit the $200 free credit limit

### Step 3: Set Alert Thresholds

Configure when you want to be notified:

1. **Threshold rules:**
   - **50%** of budget → Get a heads up
   - **90%** of budget → Warning (take action soon)
   - **100%** of budget → Critical alert

2. Click **"ADD THRESHOLD RULE"** for each percentage:
   - Enter percentage (e.g., `50`)
   - Choose alert type (email notification)

### Step 4: Configure Email Notifications

1. In the **Actions** section, find **"Manage notifications"**
2. Click **"Select email addresses"**
3. Add your email address (where you want to receive alerts)
4. Click **"Save"**

### Step 5: Review and Create

1. Review your budget settings
2. Click **"CREATE BUDGET"**

### Recommended Budget Settings for Pathly

For a small app:
- **Budget Amount:** $50/month
- **Alerts at:** 50%, 90%, 100%
- **Email notifications:** Your primary email

This ensures you're notified:
- At $25 (50%) - Early warning
- At $45 (90%) - Time to investigate
- At $50 (100%) - Take immediate action

### Additional Protection: API Quotas

You can also set daily quotas on your API key to hard-limit usage:

1. Go to **APIs & Services** → **Credentials**
2. Click on your API key
3. Scroll to **"API restrictions"** or **"Quotas"**
4. Set daily limits (e.g., 1,000 requests/day)

**Note:** Quotas are a hard limit and will block requests when exceeded. Alerts just notify you.

---

## Need Help?

- Google Cloud Console: https://console.cloud.google.com/
- OpenAI Support: https://help.openai.com/
- Check browser console for specific API errors

