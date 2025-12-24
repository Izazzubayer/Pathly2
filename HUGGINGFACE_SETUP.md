# Hugging Face API Setup Guide

## Quick Setup

1. **Go to Hugging Face:**
   - Visit: https://huggingface.co/
   - Sign up or log in (it's free!)

2. **Create Access Token:**
   - Go to: https://huggingface.co/settings/tokens
   - Click "New token"
   - Name it (e.g., "Pathly")
   - Select "Read" access (that's all you need)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

3. **Add to `.env.local`:**
   ```bash
   HUGGINGFACE_API_KEY=your_token_here
   ```

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## What It Does

The Hugging Face API is used for:
- **Named Entity Recognition (NER)** - Finds place names in your text
- **Zero-shot Classification** - Categorizes places (food, attraction, etc.)
- **File Processing** - Works with uploaded PDFs, docs, and images

## Models Used

1. **`dslim/bert-base-NER`** - Finds location entities in text
2. **`facebook/bart-large-mnli`** - Classifies places into categories

## Pricing

- **FREE** for most use cases
- Free tier: 1000 requests/day
- More than enough for development and small apps
- Paid plans available if you need more

## Troubleshooting

**"Hugging Face API key not found"**
- Make sure you added `HUGGINGFACE_API_KEY` to `.env.local`
- Restart your dev server after adding it

**"Extraction failed"**
- Check your token is valid at https://huggingface.co/settings/tokens
- Make sure the token has "Read" access
- Check browser console for specific error messages

**No places extracted**
- Try adding more specific place names
- Make sure your text contains actual place names (not just generic words)
- Check that files are being uploaded correctly

## Need Help?

- Hugging Face Docs: https://huggingface.co/docs/api-inference
- Hugging Face Community: https://huggingface.co/community

