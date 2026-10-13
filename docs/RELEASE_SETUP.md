# XonTaom release setup

The application code is ready for production credentials, but secrets and paid
accounts must be owned by the product owner. Never commit a keystore password,
Firebase service-account key, Expo access token, or Supabase service-role key.

## 1. Expo and Firebase push notifications

1. Sign in to Expo and link this project with `eas init`. This writes the EAS
   `projectId` used by `getExpoPushTokenAsync`.
2. In Firebase, create an Android app with package `uz.xontaom.app`.
3. Download `google-services.json` to the repository root, then add
   `"googleServicesFile": "./google-services.json"` under `expo.android` in
   `app.json` and run `npx expo prebuild --platform android --no-install`.
   This file contains public client identifiers and may be committed.
4. Generate an FCM V1 service-account key. Do not commit it. Upload it with
   `eas credentials` under Android production > Google Service Account > FCM V1.
5. Run migrations `0009_push_notifications.sql` and
   `0010_account_deletion.sql` against Supabase.
6. Deploy `supabase/functions/send-push` with JWT verification disabled and set
   `PUSH_WEBHOOK_SECRET`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
   supplied by Supabase; `EXPO_ACCESS_TOKEN` is optional when Expo enhanced
   push security is disabled.
7. Create a Supabase Database Webhook for INSERT events on
   `public.notification_outbox`. Target the deployed `send-push` function and
   send the same secret in the `x-webhook-secret` header.
8. Test on a physical Android phone: allow notifications, close the app, place
   an order, and verify the restaurant receives a sound notification. Then
   change the order status and verify the customer notification.

## 2. Android upload signing

The release Gradle task intentionally fails until production signing exists.
For local signing, create an upload keystore outside the repository, copy
`android/keystore.properties.example` to `android/keystore.properties`, and
fill in its absolute path and passwords. Both the real properties file and
keystores are ignored by Git.

For EAS Build, use the `production` profile in `eas.json` and let EAS manage the
Android production credential. Download an encrypted backup and store it in at
least two owner-controlled locations. Enable Play App Signing in Play Console.

## 3. Legal and account deletion

The app now exposes `/privacy-policy`, `/terms`, and `/delete-account`; login
and profile screens link to them. The included Uzbek legal text is a practical
draft and must be reviewed by the owner or legal counsel before publication.

Deploy the static web export to a public HTTPS domain and use these URLs in the
store listing:

- `https://YOUR-DOMAIN/privacy-policy`
- `https://YOUR-DOMAIN/terms`
- `https://YOUR-DOMAIN/delete-account`

Account deletion creates a protected Supabase request and disables that user's
push tokens. An authorized operator must process pending requests and delete or
anonymize personal data according to the retention policy.

## 4. Store readiness

- Create the Google Play Console account and complete identity/device checks.
- Prepare the store description, app icon, phone screenshots, feature graphic,
  support contact, privacy URL, Data safety answers, and reviewer credentials.
- If the account is a new personal account, plan the required closed test before
  applying for production access.
- iOS publication additionally requires Apple Developer Program membership,
  APNs credentials, App Store Connect metadata, and iOS device testing.
