# Website Tabs — client preview

Open the client preview, select Login, choose **Open sample admin preview**, then go to **Admin Dashboard → Website Tabs**.

- Rename, hide/show or remove a tab. Removing a tab removes only its navigation link; the page and its direct address remain available.
- Add a removed page back using **Existing page → Add Tab**. This editor links existing public pages; it does not create new pages or external links.
- Reorder with drag handles, keyboard arrows, Up/Down or A–Z/Z–A, then choose **Save Tabs**.
- The saved menu controls desktop navigation, mobile navigation and footer Quick Links. Login/Admin access remains independent.
- **Reset Default Tabs** prepares the original menu as a draft. Choose **Save Tabs** to apply it.
- Unsaved edits survive navigation in the same signed-in session. Reloading/closing warns about losing edits; logout clears the draft.

## Preview limitations

This GitHub Pages site uses sample content and browser-only storage. Your edits are visible only in your browser, not to other testers or the live website. Do not enter confidential information. Real account management, consultation delivery and server-side audit history require hosted QA testing.

For client review, test desktop and mobile links, rename/hide/remove/add-back actions, ordering, saving and reloading. Report issues with the page, device/browser, expected result and a screenshot.

## Future database-backed release

Navigation mutations require an administrator with branding permission. Saves use version checks and attributed transactional audit records. Apply `database/migrations/005_navigation.sql` after migrations 001–004 through the backed-up QA deployment procedure; reruns preserve existing menu edits, including an empty menu.

Publishing this client preview does not deploy DianaHost, change its database or grant production approval.
