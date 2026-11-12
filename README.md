# Watamelon — Website Design Studio

Static website for **heyywatamelon.in**. Plain HTML, CSS and JavaScript, with no build step and no framework. You can host it free on Vercel, Netlify or GitHub Pages.

```
index.html      ← all page content (edit text here)
styles.css      ← design (colours, fonts, layout)
script.js       ← menu, animations, work cards, contact form
assets/
  logo.svg
  favicon.svg
  hero.jpg      ← optional hero background photo (add your own)
  work/         ← portfolio images & videos (see below)
```

## 1. Add your portfolio files

Put these files in `assets/work/` with exactly these names. Any file that's missing shows a clean placeholder card, so the site never looks broken.

| File | Card |
|---|---|
| `goshot-site.jpg` | GoShot — E-commerce Website |
| `edifywork-landing.jpg` | Edifywork — AI Landing Page |
| `kanvi-wix-store.jpg` | Kanvi Collection — Wix Store |
| `goshot-clutch-ad.jpg` | GoShot — Clutch ad creative |
| `skinoorja-ad.jpg` | Skinoorja — ad creative |

To add or remove a project, copy or delete an `<article class="work-card">` block in `index.html`. Add `is-site` to the class for a wide website card.

## 2. Put it on GitHub

1. Go to github.com → **New repository** → name it `watamelon` → Create.
2. On the empty repo page, click **uploading an existing file**, then drag in everything from this folder (including the `assets` folder) → **Commit changes**.

## 3. Host it free (Vercel)

1. Go to vercel.com → sign up with GitHub.
2. **Add New → Project** → pick the `watamelon` repo → **Deploy**. Leave all settings as they are.
3. You get a live link like `watamelon.vercel.app`.

From then on, every change you commit on GitHub goes live automatically.

## 4. Connect heyywatamelon.in

1. In Vercel → your project → **Settings → Domains** → add `heyywatamelon.in` (and `www.heyywatamelon.in`).
2. Vercel shows the DNS records to add. Log in where you bought the domain (GoDaddy, Hostinger, etc.) → DNS settings → remove the old Lovable records → add Vercel's records.
3. Wait 10 minutes to a few hours. Vercel adds HTTPS automatically.

## 5. Activate the contact form (one time)

The form uses **FormSubmit** (free, no account needed) and emails enquiries to `Heyywatamelon@gmail.com`.
After the site is live, send yourself one test enquiry. FormSubmit emails you an **activation link**. Click it once, and every enquiry after that lands in your inbox.

To change the receiving email, edit the `action="https://formsubmit.co/…"` line in `index.html`.

## 6. Save enquiries to a Google Sheet (optional)

Every enquiry is still emailed. This also adds it as a row in a Google Sheet.

1. Create a new Google Sheet (sheets.new), name it e.g. "Watamelon enquiries".
2. **Extensions → Apps Script**. Delete what's there, paste in everything from `google-sheet/Code.gs`, click **Save**.
3. **Deploy → New deployment** → gear icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   → **Deploy** → approve the permissions (Google may say "unverified app": **Advanced → Go to … (unsafe)**; it's your own script).
4. Copy the **Web app URL** (ends in `/exec`).
5. In `index.html`, paste it into `data-sheet-url=""` on the `<form>` line, commit and push.

The rows land in a tab called **Enquiries**. If you edit the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## Quick edits

- **Text:** search for the text in `index.html` and change it.
- **Colours:** `--bg` (dark teal), `--lime`, `--orange`, `--purple`, `--pink` at the top of `styles.css`.
- **Instagram / LinkedIn links:** replace the two `href="#"` in the footer of `index.html`.
- **Testimonials:** replace with real client quotes in the Testimonials section.
