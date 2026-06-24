# Dakis Studio — Content Portal

AI-powered social media content generator for local business clients.

## Project structure

```
dakis-content-portal/
├── public/
│   └── index.html          # The client-facing portal
├── netlify/
│   └── functions/
│       └── generate.js     # Serverless function (keeps API key safe)
└── netlify.toml            # Netlify config
```

## Deploy to Netlify (step by step)

### 1. Get your Anthropic API key
- Go to https://console.anthropic.com
- Sign up / log in
- Go to API Keys → Create Key
- Copy the key (starts with sk-ant-...)

### 2. Push to GitHub
- Create a new repo on github.com (call it dakis-content-portal)
- Upload this whole folder to it

### 3. Connect to Netlify
- Go to https://netlify.com and sign up (free)
- Click "Add new site" → "Import an existing project"
- Connect your GitHub account and select your repo
- Build settings:
  - Build command: (leave blank)
  - Publish directory: public

### 4. Add your API key as an environment variable
- In Netlify dashboard → Site settings → Environment variables
- Add variable:
  - Key: ANTHROPIC_API_KEY
  - Value: your key from step 1

### 5. Deploy
- Netlify will auto-deploy. Your site will be live at a .netlify.app URL
- To use your own domain (e.g. content.dakisstudio.com):
  - Go to Domain settings in Netlify
  - Add your custom domain and follow the DNS instructions

## Per-client setup

Each client gets the URL. To add basic password protection:
- In Netlify → Site settings → Access control → Password protection
- Set a password per client, or use a shared password for all clients

## Costs

- Netlify hosting: Free (more than enough for small client volumes)
- Anthropic API: ~$0.003–0.008 per generation (pennies per client per month)
- Suggested client pricing: £49–99/month per business

## Customisation

To white-label for a specific client, duplicate the public/ folder and update:
- The "Dakis Studio" wordmark in index.html
- The accent colour (--accent: #d4621a) to match their brand
