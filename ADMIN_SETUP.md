# Admin Dashboard Google Sheets Setup

This setup lets the custom order form keep sending the normal FormSubmit email while also saving text responses into a private Google Sheet for `admin.html`.

## What You Need

- A Google Sheet owned by Delanie.
- A private admin key, such as a long phrase only Delanie knows.
- The deployed Google Apps Script web app URL.

## 1. Create The Google Sheet

1. Go to Google Sheets.
2. Create a new spreadsheet named `Collectively Delanie Orders`.
3. Leave the first sheet blank. The script will create headers automatically.

## 2. Add The Apps Script

1. In the Google Sheet, click `Extensions` > `Apps Script`.
2. Delete the starter code.
3. Paste the contents of `google-apps-script.js`.
4. Click `Save`.

## 3. Save Your Admin Key

1. In Apps Script, click `Project Settings`.
2. Under `Script properties`, click `Add script property`.
3. Set:
   - Property: `ADMIN_KEY`
   - Value: a private key only Delanie knows
4. Save.

## 4. Deploy The Web App

1. Click `Deploy` > `New deployment`.
2. Choose type: `Web app`.
3. Description: `Collectively Delanie Orders`.
4. Execute as: `Me`.
5. Who has access: `Anyone`.
6. Click `Deploy`.
7. Approve permissions.
8. Copy the Web app URL.

## 5. Connect The Website

1. Open `site-config.js`.
2. Paste the web app URL between the quotes:

```js
window.COLLECTIVELY_DELANIE_CONFIG = {
  appsScriptUrl: "PASTE_WEB_APP_URL_HERE",
  adminKeyLabel: "Use the private admin key you set in Google Apps Script."
};
```

3. Upload the updated website files to GitHub.

## 6. Test It

1. Submit a test order on `custom-order.html`.
2. Check that the normal FormSubmit email arrives.
3. Open the Google Sheet and confirm a new row appeared.
4. Open `https://www.collectivelydelanie.com/admin.html`.
5. Enter your private admin key.
6. Click `Open Dashboard`.

## Important Notes

- Photo uploads still arrive through FormSubmit email. The Google Sheet dashboard stores the text fields.
- The admin key is checked by Google Apps Script, not stored in the public repo.
- If you change the Apps Script code later, deploy a new version and update the web app if Google asks.
