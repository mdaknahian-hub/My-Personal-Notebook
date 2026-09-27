# NAHIAN'S NOTEBOOK — Android app

A native Android notebook and reminders app. It opens on a colorful Summary dashboard and keeps notes, checklists, reminders, profile, and preferences in local app storage so the app remains usable offline. Android Auto Backup can copy selected app data to the Google account configured on the phone when device backup is enabled.

## Current implementation

- **Summary dashboard:** Opens at launch and shows colorful activity bars for notes, checklists, completed/remaining tasks, and active reminders, plus recent notes and shortcuts into each section.
- **Notes:** Full-screen editor for longer writing, debounced local autosave, one-tap copy, and lightweight formatting for headings, bold, italic, underline, highlight, strike-through, list items, alignment, and sans/serif/monospace fonts. Formatting metadata is stored in the existing note body field, so no Room schema migration is needed; older plain-text notes remain readable.
- **Checklists:** Folder-style cards open into a task view. Checking tasks is available in view mode; an explicit Edit action enables rename, add, edit, and delete controls.
- **Profile and settings:** Local profile name and profile picture, Dark/Light/System theme choices, app version, alert settings, and a Help & App Info page. The profile photo is resized and stored in app-private files.
- **Automatic backup:** Android Auto Backup rules include the Room databases, preferences, and profile photo for cloud backup and device transfer. It requires Android backup to be enabled for a Google account on the device; Android decides when backup runs. This is OS-managed backup, not an in-app Google sign-in or instant cross-device sync. Local data remains on the phone.
- **Time reminders:** One-time date-and-time alarms backed by Android `AlarmManager`, restored after reboot/app replacement. Notifications request the device's default alarm sound and vibration and include Done, Snooze 10 min, and Open actions. Android notification-channel, volume, Do Not Disturb, exact-alarm, battery, and OS settings can affect delivery.
- **Location reminders:** Native Google Play services `GeofencingClient` / Android Geofencing API. The app does **not** run a foreground service or continuously poll GPS.
  - Create, edit, enable/disable, delete, map-preview, and test a reminder.
  - Choose a one-shot current location, OpenStreetMap map pin, Android `Geocoder` search, or locally saved place.
  - Radius choices: 100 m, 200 m, 500 m, and 1 km.
  - Entry, exit, or either transition; Once, Every visit, Daily, Weekly, or custom every-N-days recurrence.
  - Local Room storage contains reminder fields, registration status/error, and custom recurrence interval. Saved places are local too.
  - Boot, user-unlock, and package-replaced receivers rebuild enabled system geofences from Room. Registration failures stay visible instead of being treated as success.
- **Bangla and English:** Switch from the Summary top bar or Settings; the choice is saved on-device.
- **Voice commands:** A language chooser lets the user speak navigation commands in Bangla or English. Recognition is delegated to Android's speech service; this app does not save audio, and offline recognition depends on the device.
- **Updates:** Help & App Info links to the repository's GitHub Actions workflow for builds. A permanent chat URL is not available to embed in the app.
- **Android launcher:** Long-press the app icon for Notes, Checklists, and Time reminders. A home-screen widget links to Summary, Notes, Checklists, and Time reminders.
- **Branding:** Launcher name is **NAHIAN'S NOTEBOOK**, with a custom adaptive notebook icon.
- **AI assistant:** Intentionally hidden/deferred until a secure integration can be provided.

## Still awaiting design or implementation

- Per-task time limits/overdue alerts need a product decision: should each task have a **fixed due date/time** or a **countdown duration**?
- In-app Google sign-in and live cross-device synchronization are not implemented. Current backup relies on Android's secure, device-level Google backup and is not a real-time sync service.
- A permanent link to this chat is not available; the Settings/Help page links to GitHub Actions as the available updates alternative.

## Install from an Android phone

A cloud workflow builds a debug APK on pushes to `arena/01a0d731-my-personal-notebook` and keeps its downloadable artifact for seven days. No computer is needed to download it; the APK is for Android only (not iPhone).

1. On the phone, open the [Android debug workflow runs](https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/workflows/android-debug.yml?query=branch%3Aarena%2F01a0d731-my-personal-notebook). Sign in to GitHub if prompted, and open the newest run marked **Success**.
2. In **Artifacts**, tap **my-personal-notebook-debug-apk** to download the ZIP.
3. Open the ZIP in the phone's Files app and extract it. Tap `app-debug.apk` to install. If Android blocks it, allow **Install unknown apps** for the browser or Files app you used, then retry. Only install APKs downloaded from this repository's workflow.
4. Open **NAHIAN'S NOTEBOOK**. Grant notifications when asked. For time reminders, enable **Alarms & reminders / exact alarms** and allow notification sound in Android settings. For location reminders, grant precise location and background location (**Allow all the time** where Android offers it), and keep device Location and Google Play services enabled.
5. To use online backup, enable Android Backup / Google One backup for the Google account on the phone. The app does not ask for a Google password. Android controls backup timing; the app also remains usable offline.
6. Start with a time reminder a few minutes ahead and a location reminder at a safe, nearby place you can revisit. Check notification actions and physically cross the selected geofence boundary. Android controls timing; neither alarms nor geofences should be assumed instant.

The artifact expires after seven days. If it is no longer listed, use the newest successful run.

## Build and tests

The app uses JDK 17, Android SDK Platform 35, Gradle 8.9, Android Gradle Plugin 8.7.3, Kotlin 2.0.21, and target SDK 35. The GitHub Actions workflow `.github/workflows/android-debug.yml` runs `:app:testDebugUnitTest` and `:app:assembleDebug`, then uploads the APK artifact. This sandbox has no Java, Gradle, or Android SDK, so cloud CI is used for builds.

Map tiles and geocoder search may require connectivity. Once registered, geofence monitoring is delegated to Android / Google Play services and may work temporarily without internet where supported. Notification timing and reliability remain subject to Android, Play services, device settings, and manufacturer battery policies.

## Verification status

A previous verified code build, [36141458199](https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/runs/36141458199), passed JVM unit tests, assembled the debug APK, and uploaded the artifact. That run predates the current changes. The current notes/checklist/dashboard/settings/backup/notification changes still need a fresh CI build and tests, and **all new flows still require testing on an actual Android phone**. Do not treat them as device-verified until then.

Phone testing should cover:

1. Notes: long text entry and scrolling, autosave after edits and app close, rich formatting persistence, old-note compatibility, copying, edit/delete, restart, and data persistence.
2. Checklists: folder open/back, checking in view mode, edit-mode-only add/rename/task edit/delete, and persistence after restart.
3. Dashboard chart counts and layout, long text fitting, profile photo selection/removal, Settings/Help version, and both update/Android settings links.
4. Android backup enabled and disabled: confirm local data stays available offline, and test device/account restore where supported.
5. Bangla/English display and voice-command chooser, including device support for Bangla speech recognition.
6. Time reminders: alarm sound/vibration, near-future delivery, Done, Snooze, notification permission/channel blocking, exact-alarm denial, app background/locked, reboot, and OS/battery delay.
7. Location reminders: enter/exit delivery, background/app-swiped-away/locked, reboot and first unlock, offline-after-registration, all recurrence types, duplicate transitions, disable/delete, app update, and stale saved coordinates.
8. Permission recovery: precise/background location denied or permanently denied, Location services off, Play services unavailable, notification channel blocked, battery restrictions, and registration failure.
