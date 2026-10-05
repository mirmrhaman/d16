# Pic Your Concept — item galleries

Each detail item, such as **Bed Room → Master Bed**, can have its own optional photo gallery. Its existing **Get a Quote** link is unchanged.

## Add photos and choose the button name

1. Open **Admin Dashboard → Pic Your Concept** (`/AdminPicYourConcept`).
2. Select **Edit** on the category, for example **Bed Room**.
3. Find the appropriate **Detail section**, for example **Master Bed**.
4. In **Item gallery (optional)**, set **Gallery button name** to “Gallery”, “Images”, “Design Ideas”, or another name. Leaving it blank uses **View Gallery**.
5. Select **Upload gallery images (select several)**. You can select several PNG, JPEG or WEBP files together, then add more later. Alternatively, use **Or add an image URL → Add image**.
6. Use each photo’s left/right arrow to move it earlier/later; the remove button takes it out of this item’s gallery. This does not delete uploaded files from the server.
7. Select **Save Concept**, then **View** on that category.

The gallery button appears beside **Get a Quote** only when the item has at least one gallery photo. Remove all gallery photos and save to hide the button. The main section/card image is separate and stays unchanged. Other items have independent galleries and names. To add galleries in categories without detail sections yet, use **Add section** first.

The viewer provides a large image, thumbnails, previous/next controls, keyboard arrows and Escape-to-close. Closing restores focus to the gallery button. Unavailable images show a message. The viewer is usable on phones and does not crop the full-size photo.

## Limits and where data goes

- Up to 40 gallery photos per item; button name up to 60 characters.
- Browser/GitHub Pages preview: up to 500 KB per file. Photos and edits remain in that browser only, not shared with clients on other devices or with DianaHost. Browser storage can fill before 40 photos; use smaller photos or hosted image URLs. Failed saves keep the draft open.
- Database-backed site: up to 5 MB per uploaded file, subject to hosting configuration. It uses the authenticated upload service, saved concept data, existing edit permissions and dated actor audit history. Stale edits are rejected. This feature has not been deployed to DianaHost.
- Only upload approved public website photos. Gallery images are not confidential/encrypted records. SVG and executable URLs are rejected. URLs must be HTTP(S) without embedded credentials, or safe local upload paths.
- Save is disabled while uploads are in progress. If a batch partially fails, successful photos remain in the draft; retry only the failed files. Duplicate image URLs are rejected/skipped.

## Deployment and rollback

This is an additive change to `PicYourConcept.sub_services`: optional `gallery_images` (ordered URL strings) and `gallery_button_label`. Existing records and Services are unchanged. The current JSON content store supports these fields without another database migration.

Publish the matching frontend and API together when production is approved. Older API versions reject the new nested fields. Reverting the frontend hides the gallery, but reverting the API after clients save galleries would also prevent editing those concepts until the matching API is restored; do not remove saved gallery data to work around that. Back up the database and uploads before a future production deployment. QA source archives alone do not back up photos or database contents.

## Verified for this change

Automated validation/persistence tests cover missing/empty galleries, custom labels, ordering, bounds, unsafe URLs, browser quota failure, retained siblings, backward compatibility and demo reloads. Disposable local database tests cover real API round trips, authentication, stale writes, removal and attributed audit history. Browser checks cover selecting two photos together, reordering, save/reload, per-item visibility, desktop/mobile viewing, keyboard navigation and focus restoration. No hosted database was used for these tests.
