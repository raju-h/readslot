# ReadSlot OAuth Verification Site

This folder is a dependency-free static website for ReadSlot's Google OAuth verification. It can
be hosted on any service that serves HTML and CSS. The pages use relative links, no cookies, no
analytics, no remote fonts, and no backend.

## Included pages

- **index.html**: public product homepage and Google Calendar access explanation
- **privacy.html**: Google user-data, storage, sharing, retention, deletion, and Limited Use policy
- **terms.html**: terms of use
- **support.html**: connection, revocation, deletion, and troubleshooting guidance
- **styles.css**: shared responsive styling

## Before publishing

1. Choose a stable HTTPS domain you control, such as **https://readslot.example**.
2. Review every page and replace the support route if GitHub Issues is not the desired contact
   method. Google must be able to contact the project owner privately during verification.
3. Confirm that the privacy policy exactly describes the released extension's behavior.
4. Confirm that the product name is **ReadSlot** everywhere: website, consent screen, extension,
   Chrome Web Store listing, and verification submission.
5. Confirm that all pages are public without login and return successful HTTPS responses.
6. Do not add analytics, trackers, cookies, or third-party scripts without updating the privacy
   policy and reviewing Google and Chrome Web Store disclosure requirements.

The homepage and privacy policy should be on the same verified domain. A custom domain is the most
reliable option because Google requires proof that the OAuth project owner controls the submitted
domain.

## Preview locally

From this folder, start any static file server:

    python3 -m http.server 8080

Then open **http://localhost:8080/**. The website itself does not require Python; this command is
only for local preview.

## Hosting

Upload the contents of this folder—not the enclosing folder—so **index.html** is served from the
domain root. Suitable options include GitHub Pages with a custom domain, Cloudflare Pages, Netlify,
Vercel static hosting, or an ordinary web server.

After deployment, record these final URLs:

    Application homepage: https://YOUR_DOMAIN/
    Privacy policy:       https://YOUR_DOMAIN/privacy.html
    Terms of service:     https://YOUR_DOMAIN/terms.html
    Support:              https://YOUR_DOMAIN/support.html

Do not submit **YOUR_DOMAIN**; replace it with the real HTTPS domain.

## Google OAuth verification: step by step

Google's interface calls this area **Google Auth Platform**. Some accounts may still show the older
**APIs & Services → OAuth consent screen** wording.

### 1. Separate development and production

Use a dedicated production Google Cloud project. Keep the existing development project and client
for local testing. This prevents test users, experimental scopes, and quota from affecting the
verified production configuration.

### 2. Prepare the production extension identity

1. Create or reserve ReadSlot's Chrome Web Store item.
2. Copy the Store item ID from the end of its listing URL.
3. Keep the release extension ID stable.
4. In Google Auth Platform → Clients, create a **Chrome Extension** OAuth client using that exact
   item ID.
5. Do not create or use a client secret. Chrome extensions are public OAuth clients.
6. Build the release with the production client ID through ignored environment configuration.
   Never commit production credentials or signing material.

The development extension ID **lbmgjokmljcgnhalhkbdfmomifkcedmp** and its OAuth client are for the
development build only. Do not submit them as the production Store identity unless the Store item
was intentionally reserved with that exact ID.

### 3. Enable the API

1. Select the production project in Google Cloud Console.
2. Open APIs & Services → Library.
3. Find and enable **Google Calendar API**.

### 4. Configure Branding

In Google Auth Platform → Branding, enter:

- App name: **ReadSlot**
- User support email: a monitored address
- App logo: the final ReadSlot icon
- Application homepage: the deployed homepage URL
- Privacy policy: the deployed **privacy.html** URL
- Terms of service: the deployed **terms.html** URL
- Authorized domain: the verified root domain
- Developer contact information: a monitored address

The app name, logo, and purpose must match the public website and Chrome Web Store listing.

### 5. Verify domain ownership

1. Open [Google Search Console](https://search.google.com/search-console/).
2. Add the website as a domain property when possible.
3. Complete the DNS ownership challenge.
4. Ensure the verified Search Console owner is also an Owner or Editor of the Google Cloud project.
5. Add the root domain under the OAuth application's authorized domains.

DNS verification can take time to propagate. Complete it before submitting OAuth verification.

### 6. Configure Audience

1. Choose **External** unless ReadSlot will be limited to one Google Workspace organization.
2. Keep the production configuration in testing while preparing the submission.
3. Add the maintainer and reviewer test accounts while testing is enabled.
4. Move to production as part of the verification workflow when Google instructs you to do so.

Changing publishing status alone does not remove the unverified-app warning. Sensitive Calendar
scopes must be approved.

### 7. Declare only the scopes ReadSlot uses

In Google Auth Platform → Data Access, add exactly:

    https://www.googleapis.com/auth/calendar.calendarlist.readonly
    https://www.googleapis.com/auth/calendar.events.freebusy
    https://www.googleapis.com/auth/calendar.events

The released manifest, Data Access page, privacy policy, in-product explanation, Chrome Web Store
listing, and verification request must agree. Remove any scope the production build does not use.

### 8. Paste-ready scope justifications

Adapt these only if the implementation changes.

#### calendar.calendarlist.readonly

> ReadSlot uses this scope to show the signed-in user's calendar names, identifiers, and access
> roles so the user can explicitly choose a destination calendar and which calendars should be
> considered for availability. ReadSlot does not modify the user's calendar list.

#### calendar.events.freebusy

> ReadSlot uses this scope to retrieve busy time intervals, without event titles or descriptions,
> from calendars the user selects. It uses those intervals to generate explainable reading-time
> suggestions that avoid known conflicts.

#### calendar.events

> ReadSlot uses this scope to create a reading event only after the user reviews and explicitly
> confirms it. The scope is also used to reconcile, update, or detect deletion of ReadSlot-created
> events. ReadSlot does not automatically book suggestions and does not silently recreate events
> deleted outside the extension.

### 9. Prepare the demonstration video

Record one continuous, clearly narrated video using the production or reviewer build:

1. Show the public homepage, privacy policy, and Chrome Web Store identity.
2. Install or open ReadSlot and show its extension ID.
3. Open Settings and show the pre-consent permission explanation.
4. Click Connect Google and show the complete OAuth consent screen.
5. Show the three requested permissions.
6. List calendars and select destination and availability calendars.
7. Generate suggestions from FreeBusy data.
8. Show that a suggestion is not automatically booked.
9. Review and explicitly confirm one event.
10. Show the resulting event in Google Calendar.
11. Disconnect ReadSlot and show how to revoke access from the Google Account.
12. Show how to delete local ReadSlot data.

Do not reveal private event details, tokens, credentials, or personal URLs. Use a dedicated reviewer
account with synthetic Calendar data.

### 10. Submit verification

1. Open Google Auth Platform → Verification Center.
2. Confirm Branding, Audience, Clients, and Data Access are complete.
3. Start the verification request.
4. Provide each sensitive-scope justification.
5. Provide the demonstration video URL and precise testing instructions.
6. Explain that ReadSlot is a Chrome extension and identify the Store item ID.
7. Provide reviewer access or test-user authorization when requested.
8. Monitor the developer contact inbox and respond to the verification thread without opening a
   second submission.

Google may request clarifications or changes. Keep the submitted website, consent screen, scopes,
and test build stable while the review is active.

## Suggested reviewer instructions

    1. Install the supplied ReadSlot Chrome extension build or use the Store test listing.
    2. Open ReadSlot Settings.
    3. Select "Connect Google" and authorize the three Calendar permissions.
    4. Select a destination calendar and at least one availability calendar.
    5. Save a public article in ReadSlot, then open the planner.
    6. Generate suggestions and select one candidate.
    7. Review the event details and explicitly confirm creation.
    8. Verify the event appears in the chosen Google Calendar.
    9. Return to Settings and select "Disconnect Google".

Include reviewer-account requirements separately and send credentials only through the secure
channel requested by Google's verification team.

## Final pre-submission checklist

- [ ] All four public pages load over HTTPS without authentication.
- [ ] Homepage clearly describes ReadSlot and why it uses Google user data.
- [ ] Homepage links to the exact submitted privacy-policy URL.
- [ ] Privacy policy covers access, use, storage, sharing, safeguards, retention, and deletion.
- [ ] Privacy policy includes the Google API Services User Data Policy/Limited Use disclosure.
- [ ] Domain ownership is verified by a Google Cloud project Owner or Editor.
- [ ] OAuth app, website, extension, and Store listing use the ReadSlot name and final logo.
- [ ] Production Chrome OAuth client matches the final Store item ID.
- [ ] Calendar API is enabled in the production project.
- [ ] Requested and declared scopes match exactly.
- [ ] No broader or unused Calendar scopes remain.
- [ ] Production permission explanation is visible before connection.
- [ ] Demonstration video shows the complete OAuth and data-deletion flow.
- [ ] Reviewer instructions and test access work in a clean Chrome profile.
- [ ] Support and developer-contact channels are monitored.
- [ ] No token, client secret, signing key, or personal Calendar data is published.

## Official references

- [Google OAuth verification requirements](https://support.google.com/cloud/answer/13464321)
- [Submit an app for verification](https://support.google.com/cloud/answer/13461325)
- [Google Calendar scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [Chrome Identity OAuth guide](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)
- [Chrome extension OAuth manifest](https://developer.chrome.com/docs/extensions/reference/manifest/oauth2)

## Repository documents to keep synchronized

If Calendar behavior, scopes, or data handling changes, update this website together with
**PRIVACY.md**, **docs/oauth.md**, **docs/permissions.md**, **docs/store-listing.md**,
**docs/submission-checklist.md**, and the extension's in-product permission explanation.
