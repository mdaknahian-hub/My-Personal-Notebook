# My Personal Notebook — Android location-reminder slice

This repository was an empty Android-app scaffold. The current increment adds a dedicated native Android **Location Reminders** feature; the other notebook roadmap items (notes, sync, vault, widgets, web app, etc.) are not implemented yet.

## Location Reminders

- Native Google Play services `GeofencingClient` / Android Geofencing API. The app does **not** run a foreground service or continuously poll GPS.
- Create, edit, enable/disable, delete, map-preview, and test a reminder.
- Location selection: one-shot current location, OpenStreetMap map pin, Android `Geocoder` search, and locally saved places.
- Radius choices: 100 m, 200 m, 500 m, and 1 km.
- Entry, exit, or either transition; Once, Every visit, Daily, Weekly, or custom every-N-days recurrence.
- Local Room storage contains the requested reminder fields plus registration status/error and custom recurrence interval. Saved places are local too.
- High-importance notification channel with Done, Snooze (10 minutes), and Open actions.
- Boot, user-unlock, and package-replaced receivers rebuild enabled system geofences from Room. A Room migration policy is intentionally non-destructive; future schema versions must ship explicit migrations.
- Permission explanations and Android settings links cover notification permission, precise foreground location, background “Allow all the time” location, disabled device Location, blocked notifications, unavailable Play services, and battery-optimization restrictions.
- Registration failures are stored and visible on the reminder card rather than silently treated as registered.

## Install from an Android phone

A cloud workflow builds a debug APK on pushes to `arena/01a0d731-my-personal-notebook` and keeps its downloadable artifact for seven days. No computer is needed to download it, but this APK is for Android only (not iPhone).

1. On the phone, open the [latest Android debug workflow run](https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/workflows/android-debug.yml?query=branch%3Aarena%2F01a0d731-my-personal-notebook). Sign in to GitHub if prompted, and open the newest run marked **Success**.
2. In **Artifacts**, tap **my-personal-notebook-debug-apk** to download the ZIP.
3. Open the ZIP in the phone’s Files app and extract it. Tap `app-debug.apk` to install. If Android blocks it, allow **Install unknown apps** for the browser or Files app you used, then retry. Only install APKs downloaded from this repository’s workflow.
4. Open **My Personal Notebook** and grant precise location, background location (**Allow all the time** where Android offers it), and notifications. Keep device Location and Google Play services enabled. If Android prompts for a Settings change, follow the in-app guidance.
5. Start with a test reminder at a safe, nearby place you can revisit. Cross the selected boundary physically, allow for Android’s location delay, and check the notification actions. Avoid relying on a geofence firing instantly; Android controls transition timing.

The artifact expires after seven days. If the download is no longer listed, use the newest successful run. The cloud build and JVM tests passed in [run 36109155195](https://github.com/mdaknahian-hub/My-Personal-Notebook/actions/runs/36109155195), producing the APK artifact `my-personal-notebook-debug-apk`.

## Build

The app uses JDK 17, Android SDK Platform 35, Gradle 8.9, Android Gradle Plugin 8.7.3, Kotlin 2.0.21, and target SDK 35. The GitHub Actions workflow `.github/workflows/android-debug.yml` runs `:app:testDebugUnitTest` and `:app:assembleDebug`, then uploads the APK artifact. The local sandbox has no Java, Gradle, or Android SDK, so builds are performed in GitHub Actions rather than locally.

Map tiles and geocoder search may require connectivity. Once registered, geofence monitoring is delegated to Android / Google Play services and may work temporarily without internet where the device supports it; notification timing and reliability remain subject to Android, Play services, device settings, and manufacturer battery policies.

## Verification status

The GitHub Actions run above passed the JVM unit tests and produced a debug APK. That verifies a cloud build, **not** real-device behavior. The feature is not being represented as complete or device-verified until it has been tested on an actual Android phone.

Before release, test on real Android devices (including Android 10 and Android 11+ with Google Play services):

1. Grant precise location, background “Allow all the time,” and notification permission; create an Enter/Exit/Enter-or-Exit reminder and physically cross its selected radius.
2. Verify the actual notification and Done/Snooze/Open actions; test the notification button separately.
3. Repeat with the app backgrounded, swiped away, and screen locked; then repeat after a device reboot and first unlock.
4. Repeat with mobile data unavailable after successful registration, and confirm actual behavior on each device.
5. Exercise denied and permanently denied permissions, Location services off, notification channel blocked, battery optimization, Play services unavailable, and registration failure. Confirm each issue is visible and recoverable in Settings.
6. Verify every recurrence type, duplicate/repeated transitions, disable/delete, app update, and invalid/stale saved coordinates.
