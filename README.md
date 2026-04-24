# BFHL — SRM Full Stack Engineering Challenge

## Project Structure

```
bfhl/
├── backend/
│   ├── index.js        # Express API  →  POST /bfhl
│   └── package.json
├── frontend/
│   └── index.html      # Single-page UI
├── vercel.json         # Vercel deployment config
└── package.json        # Root (for Vercel)
```

## Setup (local)

```bash
# Install & run backend
cd backend
npm install
npm start         # listens on :3001

# Open frontend
open frontend/index.html    # or serve with any static server
```

## ⚠️ Before deploying — fill in your real details

Edit `backend/index.js` lines 7-9:

```js
const USER_ID       = 'yourname_ddmmyyyy';      // fullname_ddmmyyyy
const EMAIL_ID      = 'you@srmist.edu.in';       // your college email
const COLLEGE_ROLL  = 'RA2XXXXXXXXXX';           // your roll number
```

And update the API URL in `frontend/index.html` line near the bottom:

```js
const API_URL = 'https://YOUR-DEPLOYED-URL.vercel.app/bfhl';
```

## Deploy to Vercel (fastest)

```bash
# From project root
npm i -g vercel
vercel            # follow prompts, one-click deploy
```

Your API will be at: `https://your-project.vercel.app/bfhl`  
Your frontend will be at: `https://your-project.vercel.app/`

## Deploy to Render

1. Push repo to GitHub
2. New Web Service → connect repo
3. Build Command: `npm install`
4. Start Command: `npm start`

---

## API Quick Test

```bash
curl -X POST https://your-url/bfhl \
  -H 'Content-Type: application/json' \
  -d '{"data":["A->B","A->C","B->D","X->Y","Y->Z","Z->X","hello","1->2"]}'
```

## Key Processing Rules Implemented

| Rule | Implementation |
|------|----------------|
| Valid format | `/^[A-Z]->[A-Z]$/` + no self-loops |
| Whitespace | trimmed before validation |
| Duplicates | first occurrence used, rest pushed to `duplicate_edges` (once per unique) |
| Multi-parent | first-encountered edge wins |
| Cycle detection | DFS with stack tracking |
| Pure cycles | lex-smallest node as root, `tree: {}`, `has_cycle: true` |
| Depth | node count on longest root-to-leaf path |
| Largest tree | max depth, lex-smaller root on tie |
