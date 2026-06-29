# Collectively Delanie

Umbrella website for Designs by Delanie and PEPd.

## Preview

Open `index.html` in a browser or serve this folder with a local web server.

## Before publishing

- Replace `hello@collectivelydelanie.com` with the preferred contact email.
- Add the PEPd destination when it is ready.
- Confirm the final wellness language and required legal disclosures.
- Replace the Google review search link in `reviews.html` with the direct Google Business Profile review URL once the final profile link is available.

## Custom order form

The custom order page sends submissions to the Google Apps Script order tracker:

`https://script.google.com/macros/s/AKfycbzHGJWOJYbEYb-hNgZvMU2CluuukOKEhD_TtEiIMaak7_Lf10r0Qb9ftFdWAZHhPRJgmg/exec`

The Apps Script saves Design, Peptide, and Aesthetics submissions into the Google Sheet and sends email notifications to `collectivelydelanie@gmail.com`.

Photo uploads are not connected to Google Drive yet. The form currently asks customers to paste shareable inspiration links instead.

The website JavaScript submits the form to Apps Script in the background, then redirects customers to `order-thank-you.html`.

## Google Sheet order tracker

The `order-tracker` folder beside this website folder contains the Google Apps Script setup for saving custom order submissions into a Google Sheet.

After publishing, submit one test order and confirm it appears in the Google Sheet.
