# EMT Student PCR Web App

This is a simple web application designed to help EMT students practice filling out Patient Care Reports (PCRs) during their ride time or for training purposes.

## Features

*   A structured form based on common PCR fields.
*   Sections for Incident Details, Patient Information, Vital Signs, and Narrative.
*   Basic client-side validation for required fields (via HTML `required` attribute).
*   "Save Report" button (currently logs data to the browser console).
*   "Clear Form" button with a confirmation prompt.

## How to Use

1.  Open the `index.html` file in a web browser.
2.  Fill out the form fields as you would for a patient encounter.
3.  Click "Save Report". The data will be logged to your browser's developer console (usually accessible by pressing F12).
4.  Click "Clear Form" to reset all fields.

## Future Enhancements (Potential)

*   Local storage saving: Allow reports to be saved in the browser's local storage so they persist between sessions.
*   Export to PDF/Print: Functionality to generate a printable or PDF version of the completed PCR.
*   More detailed fields: Add more specific fields based on regional protocols or advanced assessments.
*   Timestamping for vitals: Allow multiple sets of vitals to be recorded with timestamps.
*   Offline capabilities: Make the app usable without an internet connection (e.g., using service workers).
*   Data synchronization: For a more advanced version, sync data to a secure backend.

## Development

This application is built with:

*   HTML
*   CSS
*   JavaScript (vanilla)

No external libraries or frameworks are currently used to keep it simple and lightweight.

To modify or extend this application:

1.  Edit `index.html` for the structure.
2.  Edit `style.css` for visual styling.
3.  Edit `script.js` for application logic and interactivity.

## Disclaimer

This application is for educational and training purposes only. It does not store data securely and should not be used for real patient information or official record-keeping.