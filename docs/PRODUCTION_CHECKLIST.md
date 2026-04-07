# Kamarasan Production Checklist

## Credentials & Environment

- [ ] Get production ESB bearer token from Nando/ESB team
- [ ] Set `ESB_COMPANY_CODE=MBLA` (production company code, was SAE on staging)
- [ ] Set `ESB_DEFAULT_BRANCH=MOOUT1` (production default branch, was MDOUT on staging)
- [ ] Set `ESB_ENV=production` and `NODE_ENV=production` on server
- [ ] Set `EXPO_PUBLIC_ENV=production` in EAS build profile
- [ ] Set `ESB_WEBHOOK_SECRET` on server and configure ESB to send it
- [ ] Get production DANA/Xendit credentials (currently using sandbox)
- [ ] Get Google Places API key, restrict to bundle ID `com.kamarasan.app`
- [ ] Set `EXPO_PUBLIC_GOOGLE_PLACES_KEY` in EAS build env vars
- [ ] Set up Google Cloud billing alerts ($200/month free tier for Places API)

## Server Deployment (Railway)

- [ ] Create Railway project, connect to repo `kamarasan-app/server/`
- [ ] Add env vars from `.env.production` to Railway dashboard
- [ ] Verify health check: `GET /api/health` returns `{ status: "ok" }`
- [ ] Verify CORS allows `https://kamarasan.app`
- [ ] Custom domain: `api.kamarasan.app` → Railway service
- [ ] SSL certificate auto-provisioned by Railway

## App Build (EAS)

- [ ] Run `eas build --profile production --platform all`
- [ ] Fill in `eas.json` submit section: Apple ID, ASC App ID, Team ID
- [ ] Android: create `google-services.json` from Play Console service account
- [ ] Test production build on physical device before submitting
- [ ] Run `eas submit --platform ios` and `eas submit --platform android`

## ESB Integration Verification

- [ ] Verify branch settings load from production ESB
- [ ] Place a test order on production ESB
- [ ] Verify DANA payment redirect works with production Xendit
- [ ] Verify membership check works on production URL
- [ ] Verify WhatsApp OTP flow works end-to-end
- [ ] Test webhook delivery (order status updates)

## Deep Links

- [ ] Verify `kamarasan://order/callback` opens order tracking after DANA payment
- [ ] Verify `kamarasan://auth/callback` opens after WhatsApp OTP redirect
- [ ] iOS: add Associated Domains for universal links (if needed)
- [ ] Android: verify intent filter for `kamarasan://` scheme

## Monitoring

- [ ] Railway logs for server errors
- [ ] Set up error tracking (Sentry or similar) for app + server
- [ ] Monitor ESB webhook delivery success rate
