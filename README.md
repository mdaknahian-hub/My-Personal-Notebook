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

## Build

Open this project in Android Studio with JDK 17 and Android SDK Platform 35 installed. The app uses Gradle 8.9 / Android Gradle Plugin 8.7.3, Kotlin 2.0.21, and target SDK 35. This sandbox had no Java, Gradle, or Android SDK and could not download the official Gradle wrapper, so a Gradle build was not run here. Use Android Studio's Gradle setup or install Gradle 8.9 locally to sync/build the project.

Map tiles and geocoder search may require connectivity. Once registered, geofence monitoring is delegated to Android / Google Play services and may work temporarily without internet where the device supports it; notification timing and reliability remain subject to Android, Play services, device settings, and manufacturer battery policies.

## Verification status

Pure JVM tests are included for coordinate/radius validation, trigger filtering, and recurrence gates. They have not been executed in this environment. This feature has **not** been tested on a real Android device, so it is not being represented as complete or device-verified.

Before release, test on real Android devices (including Android 10 and Android 11+ with Google Play services):

1. Grant precise location, background “Allow all the time,” and notification permission; create an Enter/Exit/Enter-or-Exit reminder and physically cross its selected radius.
2. Verify the actual notification and Done/Snooze/Open actions; test the notification button separately.
3. Repeat with the app backgrounded, swiped away, and screen locked; then repeat after a device reboot and first unlock.
4. Repeat with mobile data unavailable after successful registration, and confirm actual behavior on each device.
5. Exercise denied and permanently denied permissions, Location services off, notification channel blocked, battery optimization, Play services unavailable, and registration failure. Confirm each issue is visible and recoverable in Settings.
6. Verify every recurrence type, duplicate/repeated transitions, disable/delete, app update, and invalid/stale saved coordinates.
