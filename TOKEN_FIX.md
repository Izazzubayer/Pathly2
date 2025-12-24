# 🔧 FIX: Hugging Face Token Permissions

## The Problem
Your current token only has **Read** access, which is NOT enough for the Inference API.

## EXACT Steps to Fix

### 1. Create a NEW Token with WRITE Access

1. Go to: **https://huggingface.co/settings/tokens**
2. Click **"New token"**
3. **Name it**: `Pathly-Inference` (or whatever you want)
4. **IMPORTANT**: Select **"Write"** (NOT "Read")
   - Write access includes Inference API permissions
   - Read access does NOT work for Inference API
5. Click **"Generate token"**
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

### 2. Update Your .env.local

Replace your current token:

```bash
HUGGINGFACE_API_KEY=hf_YOUR_NEW_WRITE_TOKEN_HERE
```

### 3. Restart Your Server

```bash
npm run dev
```

---

## Why This Happens

- **Read tokens**: Only for reading public models/datasets
- **Write tokens**: Includes Inference API access (which is what we need)

The Inference API requires Write permissions even though we're not writing to repos - it's just how HF's permission system works.

---

## Test It

After updating the token, try uploading a PDF again. Check your terminal logs - you should see:
- `✅ Extracted text length: X characters`
- `Found X location entities`
- `Extracted X places`

If you still see errors, the logs will now show exactly what's wrong.

