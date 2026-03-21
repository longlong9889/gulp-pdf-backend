# gulp-pdf-backend

A serverless grammar analysis API built with [Compromise NLP](https://compromise.cool) and deployed on [Vercel](https://vercel.com). Designed as a backend for a Swift iOS app.

🔗 **Live:** [gulp-pdf-backend.vercel.app](https://gulp-pdf-backend.vercel.app)

## What It Does

Accepts text via a POST request and returns a sentence-by-sentence breakdown of parts of speech — nouns, verbs, adjectives, adverbs, and interjections.

## API

### `POST /api/analyze-grammar`

**Request:**

```json
{
  "text": "The quick brown fox jumps over the lazy dog."
}
```

**Response:**

```json
{
  "success": true,
  "sentences": [
    {
      "sentence": "The quick brown fox jumps over the lazy dog",
      "nouns": "fox, dog",
      "verbs": "jumps",
      "adjectives": "quick, brown, lazy",
      "adverbs": "-",
      "interjections": "-"
    }
  ]
}
```

## Tech Stack

- **Runtime:** Node.js
- **NLP:** [Compromise](https://www.npmjs.com/package/compromise)
- **Deployment:** Vercel Serverless Functions
- **Client:** Swift (iOS)

## Getting Started

```bash
git clone https://github.com/longlong9889/gulp-pdf-backend.git
cd gulp-pdf-backend
npm install
npx vercel dev
```

## License

This project is open source.
