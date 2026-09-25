# NAHIAN'S NOTEBOOK — Android app

A native Android notebook and reminders app. It opens on a Summary dashboard and stores notes, checklists, and reminders locally on the device.

## Features implemented so far

- **Notebook:** Create, edit, and delete local notes.
- **Checklists:** Create lists, add items, tick items complete, and delete lists or items.
- **Summary:** Opens on launch and shows notebook content and reminder counts.
- **Profile and settings:** A local profile name personalizes the Summary; name and appearance are stored on-device, with no account or cloud sync.
- **Premium appearance:** Dark charcoal, sage, and warm-gold palette is the default; Light and System themes are also selectable.
- **Navigation and motion:** A five-item bottom bar links the main areas and a reminder hub separates time and location reminders. Screen transitions use subtle fades/slides.
- **Time reminders:** One-time date-and-time alarms backed by Android `AlarmManager`, restored after reboot/app replacement. Notifications include Done, Snooze 10 min, and Open. Android may delay delivery depending on exact-alarm, notification, battery, and OS settings.
- **Location reminders:** Native Google Play services `GeofencingClient` / Android Geofencing API. The app does **not** run a foreground service or continuously poll GPS.
  - Create, edit, enable/disable, delete, map-preview, and test a reminder.
  - Choose a one-shot current location, OpenStreetMap map pin, Android `Geocoder` search, or locally saved place.
  - Radius choices: 100 m, 200 m, 500 m, and 1 km.
  - Entry, exit, or either transition; Once, Every visit, Daily, Weekly, or custom every-N-days recurrence.
  - Local Room storage contains reminder fields, registration status/error, and custom recurrence interval. Saved places are local too.
  - Boot, user-unlock, and package-replaced receivers rebuild enabled system geofences from Room. Registration failures stay visible instead of being treated as success.
- **Bangla and English:** Switch from the Summary top bar or Settings; the choice is saved on-device.
- **Voice commands:** Bangla and English speech can open the main app sections. Recognition is delegated to Android's speech service; this app does not save audio, and offline recognition depends on the device.
- **Android launcher:** Long-press the app icon for Notes, Checklists, and Time reminders. A home-screen widget links to Summary, Notes, Checklists, and Time reminders.
- **Branding:** Launcher name is **NAHIAN'S NOTEBOOK**, with a custom notebook icon.
- **AI assistant:** Intentionally hidden/deferred until a secure integration can be provided.

## Install from an Android phone

A cloud workflow builds a debug APK on pushes to `arena/01a0d731-my-personal-notebook` and keeps its downloadable artifact for seven days. No computer is needed to download it; the APK is for Android only (not iPhone).

1. On the phone, open the [Android debug workflow runs](https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/workflows/android-debug.yml?query=branch%3Aarena%2F01a0d731-my-personal-notebook). Sign in to GitHub if prompted, and open the newest run marked **Success**.
2. In **Artifacts**, tap **my-personal-notebook-debug-apk** to download the ZIP.
3. Open the ZIP in the phone's Files app and extract it. Tap `app-debug.apk` to install. If Android blocks it, allow **Install unknown apps** for the browser or Files app you used, then retry. Only install APKs downloaded from this repository's workflow.
4. Open **NAHIAN'S NOTEBOOK**. Grant notifications when asked. For time reminders, enable **Alarms & reminders / exact alarms** in the in-app guidance. For location reminders, grant precise location and background location (**Allow all the time** where Android offers it), and keep device Location and Google Play services enabled.
5. Start with a time reminder a few minutes ahead and a location reminder at a safe, nearby place you can revisit. Check notification actions and physically cross the selected geofence boundary. Android controls timing; neither alarms nor geofences should be assumed instant.

The artifact expires after seven days. If it is no longer listed, use the newest successful run.

## Build and tests

The app uses JDK 17, Android SDK Platform 35, Gradle 8.9, Android Gradle Plugin 8.7.3, Kotlin 2.0.21, and target SDK 35. The GitHub Actions workflow `.github/workflows/android-debug.yml` runs `:app:testDebugUnitTest` and `:app:assembleDebug`, then uploads the APK artifact. This sandbox has no Java, Gradle, or Android SDK, so cloud CI is used for builds.

Map tiles and geocoder search may require connectivity. Once registered, geofence monitoring is delegated to Android / Google Play services and may work temporarily without internet where supported. Notification timing and reliability remain subject to Android, Play services, device settings, and manufacturer battery policies.

## Verification status

The verified code build, [36141458199](https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/runs/36141458199), passed JVM unit tests, assembled the debug APK, and uploaded the artifact. This verifies compilation/tests, **not** installation, profile/theme persistence, voice recognition on the device, alarm delivery, widget behavior, launcher shortcuts, language rendering, or geofencing on a real phone. Do not treat the app as complete until the current build is installed and tested on an actual Android device.

Phone testing should cover:

1. Notes and checklists: create, edit, complete, delete, app restart, and data persistence.
2. Profile-name persistence, Dark/Light/System theme switching, Bangla/English switching, bottom navigation, voice commands, app-icon shortcuts, and the home-screen widget.
3. Time reminders: near-future delivery, Done, Snooze, notification permission/channel blocking, exact-alarm denial, app background/locked, reboot, and OS/battery delay.
4. Location reminders: enter/exit delivery, background/app-swiped-away/locked, reboot and first unlock, offline-after-registration, all recurrence types, duplicate transitions, disable/delete, app update, and stale saved coordinates.
5. Permission recovery: precise/background location denied or permanently denied, Location services off, Play services unavailable, notification channel blocked, battery restrictions, and registration failure.

The reported location-picker change is compiled but still needs real-device testing: selecting current location, map, search, or a saved place should return to the reminder form without an extra confirmation step (preview mode keeps its own confirmation).
