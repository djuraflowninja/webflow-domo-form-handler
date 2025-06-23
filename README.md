# Webflow Domo Form Handler

Custom JavaScript handler for enhancing Webflow forms with ChiliPiper integration, UTM enrichment, validation, and fallback submission to Eloqua.

## 🚀 Features

- ✅ ChiliPiper integration with conditional triggering (based on geolocation or URL params)
- ✅ Fallback to Eloqua if ChiliPiper is not triggered
- ✅ Advanced field enrichment:
  - UTM parameters (from URL & cookies)
  - Domo ID generation
  - Unique FFID hash
  - GeoIP country detection
- ✅ Dynamic form enrichment (redirect URLs, timestamps, path)
- ✅ Input validation for name, email, phone, job title
- ✅ Gated content logic via localStorage token
- ✅ DataLayer event tracking (`form_start`, `form_submit`, `form_success`)
- ✅ Duplicate Eloqua submissions prevented with global and per-form flags

---

## 📦 Installation

Use via CDN:

<html>
<script src="https://cdn.jsdelivr.net/gh/djuraflowninja/webflow-domo-form-handler@main/form-handler.js"></script>
</html>

🔧 How It Works
Targets all forms with eloquaform="true" attribute.

Populates hidden fields (UTM, geo, domo_id, etc.)

Validates inputs

On submit:

If ChiliPiper should trigger (US or ?book=demo), opens the modal

If not, submits directly to Eloqua

If ChiliPiper fails or is closed, Eloqua fallback can be activated if needed.

🧾 Form Requirements
Webflow forms must include:

Hidden fields:

utmSource1, utmMedium1, utmCampaign1, domo_id, g_id, uniqueFFID, geoip_country_code, contentURL1, pathName1, etc.

Attribute: eloquaform="true" on the <form>

Valid action pointing to Eloqua endpoint

🌍 ChiliPiper Rules
ChiliPiper is triggered when:

Form name is website_cta_talktosales

AND user is from US OR has ?book=demo in the URL

This logic is handled inside handleSubmit().

🧪 Testing Tips
Test with US IP or add ?book=demo to the URL

Open DevTools > Console and look for:

📤 fallbackSubmitToEloqua called

🔥 CP će presresti ovaj submit i otvoriti modal

📁 Repo Structure
bash
Copy
Edit
form-handler.js   # Main script logic
README.md         # This file
🔮 Future Ideas
 Optional email verification

 Versioning support via tags (e.g. v1.0.0 on CDN)

 Modularization for easier maintenance

🧠 Maintained by
Flow Ninja – Webflow Enterprise Partner
Made with 🧡 by @djuraflowninja

