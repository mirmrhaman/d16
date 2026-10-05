# Pic Your Concept — item galleries

Each detail item, such as **Bed Room → Master Bed**, can have its own optional, full-page photo gallery. Its existing **Get a Quote** link is unchanged. Updated 2026-10-05: galleries now open a page, not a popup.

## Add photos and choose the button name

1. Open **Admin Dashboard → Pic Your Concept** (`/AdminPicYourConcept`).
2. Select **Edit** on the category, for example **Bed Room**.
3. Find the appropriate **Detail section**, for example **Master Bed**.
4. In **Item gallery (optional)**, set **Gallery button name** to “Gallery”, “Images”, “Design Ideas”, or another name. Leaving it blank uses **View Gallery**.
5. Optionally enter **Gallery page title** and **Gallery page description**. A blank page title uses the item name; a blank description is hidden. Set **Continue button name**, or leave it blank for **Continue with this concept**.
6. Select **Upload gallery images (select several)**. You can select several PNG, JPEG or WEBP files together, then add more later. Alternatively, use **Or add an image URL → Add image**.
7. Each photo has an optional title and description. Leave either blank to show only the image/selection controls. Use each photo’s left/right arrow to move it earlier/later; the remove button takes it out of this item’s gallery. This does not delete uploaded files from the server.
8. Select **Save Concept**, then **View** on that category.

The gallery button appears beside **Get a Quote** only when the item has at least one gallery photo. Remove all gallery photos and save to hide the button. The main section/card image is separate and stays unchanged. Other items have independent galleries and names. To add galleries in categories without detail sections yet, use **Add section** first.

## Visitor experience

The gallery button opens a separate page, with the same website header/footer and a photo-card layout inspired by the main Gallery page. It has **no video section** and no popup.

- Click a photo once to select it, and again to deselect it. Several photos can be selected together. Keyboard Enter/Space works too.
- Selected cards show a check mark and highlighted border. The continue button remains disabled until at least one design is selected.
- Continue opens Contact with the item name and selected-photo thumbnails. **Change selection** returns to the gallery with the current choices.
- Selections survive refresh and back/forward navigation through public photo IDs in the URL, not image data or private contact information. References are checked against the current item; missing photos produce a warning instead of selecting a different image.
- On the database-backed site, the consultation message automatically includes the selected photo IDs/titles and item reference, stored with the existing encrypted message. The preview does not send real consultations.

## Limits and where data goes

- Up to 40 gallery photos per item; button name up to 60 characters.
- Optional page title: 180 characters; page description: 3,000; each photo title: 180; photo description: 2,000. Continue-button name: 60.
- Browser/GitHub Pages preview: up to 500 KB per file. Photos and edits remain in that browser only, not shared with clients on other devices or with DianaHost. Browser storage can fill before 40 photos; use smaller photos or hosted image URLs. Failed saves keep the draft open.
- Database-backed site: up to 5 MB per uploaded file, subject to hosting configuration. It uses the authenticated upload service, saved concept data, existing edit permissions and dated actor audit history. Stale edits are rejected. This feature has not been deployed to DianaHost.
- Only upload approved public website photos. Gallery images are not confidential/encrypted records. SVG and executable URLs are rejected. URLs must be HTTP(S) without embedded credentials, or safe local upload paths.
- Save is disabled while uploads are in progress. If a batch partially fails, successful photos remain in the draft; retry only the failed files. Duplicate image URLs are rejected/skipped.

## Deployment and rollback

The current JSON content store supports these fields without another database migration. `PicYourConcept.sub_services` accepts optional `gallery_images`, `gallery_button_label`, `gallery_title`, `gallery_description` and `gallery_continue_label`. Legacy URL-string photos still work. Newly uploaded/captioned photos use `{ id, url, title, description }`, so reordering or renaming a photo does not change its selection identity. Section IDs are retained/assigned on the next admin save; deterministic legacy references work before that save. Existing images are not replaced and Services are unchanged.

Publish the matching frontend and API together when production is approved. Older API versions reject the new nested fields and older gallery viewers do not understand photo objects. A rollback after captions/photos have been saved needs a compatibility review or restoration of an approved content backup; do not silently strip saved captions or gallery data. Back up the database and uploads before a future production deployment. QA source archives alone do not back up photos or database contents.

## Verified for this change

Automated tests cover legacy/object photos, optional captions/page text, stable references, select/deselect, multiple selection, unsafe and missing data, ordering, bounds, retained siblings, browser quota failure, and encrypted-message size. Disposable local database tests cover real API round trips, caption/reorder persistence, authentication, stale/unsafe writes, removal, dated actor history and encrypted consultation references. Browser checks cover page navigation (no dialog/video), photo toggle, keyboard selection, refresh, contact summary/change-selection and mobile layout. No hosted database was used for these tests.
