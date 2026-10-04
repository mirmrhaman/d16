# Social links and floating media buttons

In the client preview, open **Login → Open sample admin preview → Social Media**. In the database application, sign in with an administrator account that has branding permission.

1. Add the client's platform name (for example, WhatsApp, Facebook or YouTube) and its public HTTP(S) link. Use the client's own destinations; the application does not invent phone numbers or profiles.
   The field suggests supported platforms and displays the matching icon immediately. WhatsApp uses the phone-in-chat brand symbol. X and the older `twitter` key both display X. Facebook, Instagram, YouTube, LinkedIn, Messenger and Telegram use their brand glyphs; `website` uses a globe. Unknown/custom platforms use a generic link symbol. Icon recognition is presentation-only; it does not rewrite saved profile keys or destination URLs.
2. Enable **Show floating media buttons** and choose the left or right side.
3. Select **Keep [platform] visible while scrolling** for each link to display. Select one or several, then use Up/Down to change their displayed order.
4. Save the changes and visit a public page. Selected links stay at the bottom corner while scrolling, on desktop and phones. Each opens its destination in a new tab. Admin and login pages hide these buttons to keep editors clear.

All saved, non-empty social links remain in the footer, including links not selected as floating buttons. Turning floating buttons off retains the links and selection for later. Use Remove to remove a profile from both the footer and floating selection, then save. Named profiles require a valid URL before saving. No links are enabled by default. Large selections scroll within the floating panel, with a safety guard of 40 configured links.

The controls save only social links and floating settings, preserving the logo, contact details and theme. Unsaved drafts survive navigation during the same signed-in session; logout clears the in-memory draft. Reload/close warns about unsaved work, and saved-version conflicts are rejected instead of silently overwriting another editor.

## Testing versus production

GitHub Pages is a browser-only client preview. Edits made there are saved only in that browser, not shared with other testers and not sent to DianaHost. Use non-confidential test data. Closing the browser does not normally erase saved edits, but clearing browser storage does.

In the database-backed application, settings use existing ContactInfo metadata in `app_content`; no additional migration is needed beyond the existing application migrations. Writes require branding permission, validate URLs and selected links, check record versions and create transactional audit records with the editor identity, date/time and changed field names. This feature does not install chat scripts, automatically send messages or make third-party requests until a visitor follows a link. Social URLs should be public contact destinations, never credentials or confidential data.
