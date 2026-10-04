# Website Tabs and Custom Pages

Open **Login → Open sample admin preview → Website Tabs & Pages** on the GitHub client preview. In database mode, sign in with an administrator account.

## Create a genuinely new page

1. Under **Add a tab**, leave **Tab destination → Create a new page**, choose **Page type for new tab**, and select **Add Tab**. This opens the page editor. Alternatively, use **Create and Edit Pages → Create New Page**.
2. Add the title, introduction, text, header image and content items. Upload JPG/PNG/WebP images or use an approved public image URL.
3. Select **Save Page** to keep a draft. Drafts are not available at their public address.
4. When ready, check **Make this page public when I save** and select **Save Page** again.
5. Select **Add to Menu**, then **Save Tabs**. Page content and menu order are saved separately.

Page types: Landing/Home, Standard/About, Services, Portfolio, Design Concepts, Gallery, Blog/News, Contact Information, FAQ and Team. These ten types are reusable templates, not a ten-page limit: create multiple pages of any type. Each is a blank, independent page with a layout inspired by the existing website. Existing site sections are not copied or changed. Blog entries expand on the new page; Contact Information displays public information and links to the existing consultation page, rather than adding another private enquiry form.

Changing the layout preserves the page's text, images and items. Content is plain text with line breaks, not arbitrary HTML. Each page supports up to 40 content items. The address contains a stable page ID, so changing a title does not break old links.

## Manage website tabs

- Use **Add a tab → Tab destination** to create a new page or add an existing/published page not already in the menu. Rename labels, show/hide or remove menu links. Each page has at most one menu link; multiple pages can use the same template.
- Reorder with drag handles, keyboard arrows, Up/Down or A–Z/Z–A, then select **Save Tabs**.
- There is no eight- or ten-tab layout limit and no automatic overflow grouping. A technical safety guard allows up to 250 links per menu; browser storage and practical usability still apply.
- Under **Dropdown menu options**, turn **Use a dropdown menu** on or off. Off shows all visible tabs directly, retaining their saved grouping preferences for later.
- Edit **Dropdown title** to replace “More” with the client's preferred name, such as “Explore”.
- On each tab, choose **Menu placement → Main menu** or **Dropdown**. Choose exactly which tabs go inside, and how many. **Move All to Dropdown** and **Keep All in Main Menu** are optional shortcuts. Nothing is moved automatically.
- Select **Save Tabs** to apply the title, dropdown setting, placements and order together. Desktop and mobile honor the same grouping; the footer lists all visible public links. An empty dropdown is not shown. Hidden/unpublished pages never acquire a public link through grouping.
- Logo, direct desktop links, the optional dropdown and account actions share one row. When there are more links than fit, use the navigation arrows, horizontal scrolling or keyboard focus to reach them. Links never wrap into a second row or move into a dropdown automatically. Phones use an expandable menu; page content stays below the measured header.
- Removing a tab does not delete or unpublish its page. To take a custom page offline, edit it, uncheck the public setting and save. Its content remains available in the editor, while its public route and menu link are hidden. Republishing restores a retained menu link.
- Reset Default Tabs prepares the original eight links with no dropdown as a draft; it does not delete custom pages. Select Save Tabs to apply the reset.
- Login/Admin access stays independent of menu settings.

Unsaved page and menu drafts survive navigation within the same signed-in session. Reloading/closing warns about unsaved work; logout clears in-memory drafts. Saved-version conflicts are rejected instead of silently overwriting another editor's changes.

## Client-preview limitations

GitHub Pages uses sample content and browser-only storage. Your pages, uploaded images and edits are visible only in your browser, not to other testers or DianaHost. Do not enter confidential information. Clearing browser data removes those test edits; these preview changes are not production content. Demo uploads are limited to 500 KB per image and available browser storage; configured backend uploads support up to 5 MB per image.

Real account management, consultation delivery, shared content and persistent audit history require the separate hosted QA application. Production approval and deployment are separate from publishing this client preview.

## Database-backed release

Custom-page writes and draft reads require an administrator with branding permission. Public reads return only published pages. Updates require a saved version and create transactional audit records with actor, date/time, page identity and changed field names. Permanent page deletion is disabled; unpublish to retain content/history.

Custom pages reuse `app_content`; no additional migration is required beyond migrations 001–005. Navigation migration 005 is still required and preserves existing edits when rerun. Back up and validate hosted QA before deploying; this feature's verification uses a disposable local database, not hosted QA or production.
