# The Beauty Method: website

This is a plain static site with no build step. Booking runs through the existing Apps Script backend, which the site calls as a JSON API.

```
index.html      Home
services.html   Service menu (built from the Apps Script catalog)
gallery.html    Gallery
about.html      About, contact, hours, map
policies.html   Policies + FAQ
book.html       Booking (native form → Apps Script API)
assets/css/styles.css
assets/js/config.js    ← API URL + phone/email/address/Instagram
assets/js/api.js       API client + demo data
assets/js/site.js      Nav, contact details, hours table
assets/js/services.js  Services page
assets/js/book.js      Booking page
```

## Go-live steps

1. **Update the backend (test copy first).** Paste the new `Code.gs` into the Merovingian project. Then go to Deploy > Manage deployments > pencil > *New version*. Keep the settings *Execute as: Me* and *Who has access: Anyone*. Use the `/exec` URL. The `/dev` URL requires a Google login, so it will fail when the site calls it.
2. **Point the site at it.** Put that `/exec` URL in `assets/js/config.js` → `API_URL`. Until you do, the site runs in **demo mode**, which uses sample data and saves nothing.
3. **Test a real booking** against the test copy. The row, the calendar event, and both emails should all show up exactly as they do now.
4. **Port to live.** Apply the same `Code.gs` changes to the live salon project and deploy a new version. Then swap `API_URL` to the live `/exec` URL.
5. **Host it.** Upload the folder to any static host (GitHub Pages, Cloudflare Pages, Netlify), then point `beautymethodservices.com` at the host. With GitHub Pages, add a `CNAME` file that contains `beautymethodservices.com`.

The old Apps Script booking page keeps working at its current URL, so existing links won't break during the switch.

## Before launch: replace placeholders

- `assets/js/config.js`: phone, Instagram handle, address, maps link.
- Text placeholders are wrapped in `class="ph"` and highlighted. Search the files for `class="ph"`, replace the text, then remove the class.
- Photos are marked `<div class="photo ..."><span class="photo-note">Photo: …</span></div>`. To swap one in, replace the `<span>` with `<img src="assets/img/name.jpg" alt="Describe the set">`. The frame shape stays the same. Resize images to about 1200px on the long edge before uploading.
- Map: on Google Maps, open Share > Embed a map, then paste the iframe into `.map` on `about.html`.
- Policies: every policy line is a placeholder. **She needs to confirm the actual numbers**, such as the notice period, late fee, and fix window.
- Home page "from $X" prices are static. Update them if the catalog changes. The Services and Book pages update on their own.

## Notes

- Services, prices, durations, hours, and open dates all come from `Code.gs`, so make those edits there and only there.
- Apps Script cold starts can take 1–3 s, so the first load of the menu or the booking page may pause briefly. Responses are cached in the browser for 5 minutes.
- The booking POST is sent as `text/plain` on purpose. Apps Script can't answer a CORS preflight, so don't change it to `application/json`.
