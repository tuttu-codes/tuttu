# Deployment Guide for Tuttu

This guide will help you deploy Tuttu to Vercel with wildcard domains using Cloudflare.

## Prerequisites

- Vercel account
- Cloudflare account
- Custom domain (e.g., `tuttu.codes`)
- GitHub repository for your Tuttu instance

## Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Tuttu repository from GitHub
4. Vercel will auto-detect it as a Remix project

## Step 2: Configure Environment Variables in Vercel

In your Vercel project settings, add the following environment variables:

### Required Environment Variables

```env
# Convex Configuration
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment-name

# OAuth Configuration
CONVEX_OAUTH_CLIENT_ID=your_oauth_client_id
CONVEX_OAUTH_CLIENT_SECRET=your_oauth_client_secret

# WorkOS Configuration
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_REDIRECT_URI=https://yourdomain.com
VITE_WORKOS_REDIRECT_URI=https://yourdomain.com
VITE_WORKOS_API_HOSTNAME=api.workos.com

# Convex API Configuration
BIG_BRAIN_HOST=https://api.convex.dev
CONVEX_OAUTH_CLIENT_SECRET=your_oauth_secret

# Optional: AI Provider API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key
GOOGLE_API_KEY=your-key
XAI_API_KEY=your-key

# Analytics (Optional)
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com
```

## Step 3: Set Up Custom Domain in Vercel

1. In your Vercel project, go to "Settings" → "Domains"
2. Add your domain: `tuttu.codes`
3. Vercel will provide DNS records to configure

## Step 4: Configure Cloudflare for Wildcard Domains

### A. Add Domain to Cloudflare

1. Sign in to [Cloudflare](https://cloudflare.com)
2. Click "Add a Site"
3. Enter your domain (e.g., `tuttu.codes`)
4. Select a plan (Free plan works fine)
5. Update your domain's nameservers as instructed by Cloudflare

### B. Configure DNS Records in Cloudflare

1. Go to DNS → Records in your Cloudflare dashboard
2. Add the following records:

```
Type    Name    Content               Proxy Status
A       @       Vercel IP              Proxied
CNAME   www     cname.vercel-dns.com   Proxied
CNAME   *       cname.vercel-dns.com   Proxied (for wildcard)
```

Note: Vercel's IP addresses can change. Check Vercel's documentation for current IPs or use CNAME records when possible.

### C. Configure SSL/TLS

1. In Cloudflare, go to SSL/TLS
2. Set encryption mode to "Full" or "Full (strict)"
3. Enable "Always Use HTTPS"

### D. Configure Page Rules (Optional)

Optional page rules for better performance:

```
URL: *.tuttu.codes/*
Setting: Cache Level: Standard
```

## Step 5: Configure Wildcard DNS in Vercel

For wildcard subdomains:

1. In Vercel project settings → Domains
2. Add `*.tuttu.codes` 
3. Vercel will automatically handle all subdomains

Or configure at Cloudflare level:
- Add a wildcard A record: `*` → Vercel IP (Proxied)

## Step 6: Vercel Build Configuration

Create or update `vercel.json` in your project root:

```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "pnpm install",
  "framework": "remix",
  "regions": ["iad1"],
  "functions": {
    "app/**/*.tsx": {
      "maxDuration": 30
    }
  }
}
```

## Step 7: Deploy

1. Push your code to GitHub
2. Vercel will automatically deploy on push to main branch
3. Monitor the deployment in Vercel dashboard

## Step 8: Post-Deployment Verification

1. Visit `https://tuttu.codes` - should load Tuttu
2. Test subdomain: `https://app.tuttu.codes` (if configured)
3. Verify SSL certificate is valid (green padlock)
4. Test OAuth flow
5. Test Convex connection

## Troubleshooting

### SSL Issues
- Make sure Cloudflare SSL is set to "Full" mode
- Wait 24 hours for SSL certificate propagation
- Check DNS propagation: `dig tuttu.codes`

### Subdomain Not Working
- Verify wildcard DNS record is configured
- Check Vercel domain settings for wildcard domain
- Ensure subdomain resolves: `nslookup subdomain.tuttu.codes`

### Environment Variables Not Loading
- Verify all variables are set in Vercel
- Redeploy after adding new variables
- Check Vercel logs for errors

### OAuth Redirect Issues
- Verify `WORKOS_REDIRECT_URI` matches your domain
- Check OAuth app settings in Convex dashboard
- Ensure redirect URI includes protocol (https)

## Cloudflare Workers (Advanced - Optional)

For additional functionality, you can deploy Cloudflare Workers:

```javascript
// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Custom routing logic here
    if (url.pathname.startsWith('/api')) {
      // Handle API routes
    }
    
    return fetch(request);
  }
}
```

Deploy using:
```bash
npx wrangler deploy
```

## Domain Configuration Best Practices

1. **Always use HTTPS** - Cloudflare provides free SSL
2. **Enable DNSSEC** - In Cloudflare DNS settings
3. **Use Proxied records** - Orange cloud icon in Cloudflare
4. **Cache static assets** - Configure caching in Cloudflare
5. **Enable CDN** - Let Cloudflare handle content delivery

## Cost Estimates

- Vercel: Free tier (hobby) or $20/month (Pro)
- Cloudflare: Free tier works great for most cases
- Domain: ~$10-15/year (depending on TLD)
- **Total: ~$0-20/month**

## Next Steps

- Set up monitoring with Vercel Analytics
- Configure backup database
- Set up staging environment
- Implement CI/CD pipelines
- Configure custom error pages

## Support

For issues or questions:
- Check Vercel documentation: https://vercel.com/docs
- Check Cloudflare documentation: https://developers.cloudflare.com
- Review Tuttu repository issues

