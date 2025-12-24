# Quick Setup - API Keys Needed

## ✅ What You Already Have
- Google Places API Key: (configured in Google Cloud Console)

## ❌ What You Need to Add

### Hugging Face API Key (REQUIRED for AI extraction)

**Step 1: Get Token**
1. Visit: https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: "Pathly"
4. Access: "Read" (that's enough)
5. Copy the token

**Step 2: Add to `.env.local`**

Your `.env.local` file should look like this:

```bash
# Google Places API (get from Google Cloud Console)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_api_key_here

# Hugging Face API (ADD THIS)
HUGGINGFACE_API_KEY=your_token_here_paste_it
```

**Step 3: Restart Dev Server**
```bash
npm run dev
```

---

## That's It!

Once you add the Hugging Face token, AI extraction will work with:
- ✅ Text input
- ✅ PDF files
- ✅ Word documents
- ✅ Screenshot images (OCR)

**Without Hugging Face token:** The app will still work but use basic regex extraction (less accurate).

