package com.nahian.mypersonalnotebook.ui

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.nahian.mypersonalnotebook.notifications.ReminderNotifications

internal enum class PermissionIssueType {
    NOTIFICATION_PERMISSION,
    NOTIFICATION_SETTINGS,
    FOREGROUND_LOCATION,
    FOREGROUND_LOCATION_SETTINGS,
    BACKGROUND_LOCATION_RUNTIME,
    BACKGROUND_LOCATION_SETTINGS,
    LOCATION_SERVICES,
    GOOGLE_PLAY_SERVICES,
}

internal data class PermissionIssue(
    val type: PermissionIssueType,
    val title: String,
    val explanation: String,
    val actionLabel: String,
)

internal object PermissionSupport {
    fun firstIssue(
        activity: Activity,
        locationRequestCount: Int,
        backgroundRequestCount: Int = 0,
        notificationRequestCount: Int = 0,
        foregroundOnly: Boolean = false,
    ): PermissionIssue? {
        val context = activity.applicationContext
        if (foregroundOnly) {
            if (!hasPreciseLocation(context)) return foregroundIssue(activity, locationRequestCount)
            if (!isLocationEnabled(context)) return locationServicesIssue()
            return null
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            val permanentlyDenied = notificationRequestCount >= 2 &&
                !activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)
            return if (permanentlyDenied) {
                PermissionIssue(
                    PermissionIssueType.NOTIFICATION_SETTINGS,
                    "Notification permission is blocked",
                    "Enable notifications for My Personal Notebook in Android settings. Android will not show another permission prompt after repeated denials.",
                    "Open notification settings",
                )
            } else {
                PermissionIssue(
                    PermissionIssueType.NOTIFICATION_PERMISSION,
                    "Allow reminder notifications",
                    "Android needs notification permission to show geofence alerts, including when the app is closed.",
                    "Continue",
                )
            }
        }
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            return PermissionIssue(
                PermissionIssueType.NOTIFICATION_SETTINGS,
                "Notifications are turned off",
                "Turn on notifications for My Personal Notebook in Android settings. A geofence cannot show its alert while notifications are blocked.",
                "Open notification settings",
            )
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .getNotificationChannel(ReminderNotifications.CHANNEL_ID)
            if (channel?.importance == NotificationManager.IMPORTANCE_NONE) {
                return PermissionIssue(
                    PermissionIssueType.NOTIFICATION_SETTINGS,
                    "Location reminder channel is blocked",
                    "Enable the Location reminders notification channel in Android settings.",
                    "Open notification settings",
                )
            }
        }
        if (!hasPreciseLocation(context)) return foregroundIssue(activity, locationRequestCount)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            val permanentlyDeniedOnAndroid10 = Build.VERSION.SDK_INT == Build.VERSION_CODES.Q &&
                backgroundRequestCount >= 2 &&
                !activity.shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
            return if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q && !permanentlyDeniedOnAndroid10) {
                PermissionIssue(
                    PermissionIssueType.BACKGROUND_LOCATION_RUNTIME,
                    "Allow location access all the time",
                    "Background location is used only by Android's registered geofence. This app does not continuously track GPS. Android 10 asks for this separately after foreground location.",
                    "Allow all the time",
                )
            } else {
                PermissionIssue(
                    PermissionIssueType.BACKGROUND_LOCATION_SETTINGS,
                    "Allow location access all the time",
                    "For reminders to work while the app is closed, open App permissions → Location and choose “Allow all the time”. This is required by Android for background geofencing.",
                    "Open app settings",
                )
            }
        }
        if (!isLocationEnabled(context)) return locationServicesIssue()
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
            return PermissionIssue(
                PermissionIssueType.GOOGLE_PLAY_SERVICES,
                "Google Play services unavailable",
                "Android GeofencingClient needs Google Play services for location. Update or enable Google Play services, then try again.",
                "Open app settings",
            )
        }
        return null
    }

    fun hasPreciseLocation(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    fun hasNotificationPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun batteryOptimizationIsExempt(context: Context): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(context.packageName)
    } else true

    fun isLocationEnabled(context: Context): Boolean {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) manager.isLocationEnabled else runCatching {
            manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }.getOrDefault(false)
    }

    private fun foregroundIssue(activity: Activity, requestCount: Int): PermissionIssue {
        val permanentlyDenied = requestCount >= 2 &&
            !activity.shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)
        return if (permanentlyDenied) {
            PermissionIssue(
                PermissionIssueType.FOREGROUND_LOCATION_SETTINGS,
                "Precise location permission is blocked",
                "Enable Precise location in this app's Android permissions. Location reminders need precise coordinates to monitor the selected radius.",
                "Open app settings",
            )
        } else {
            PermissionIssue(
                PermissionIssueType.FOREGROUND_LOCATION,
                "Allow precise location",
                "Precise location is used to select a place and register Android geofences. The app does not poll or continuously track your GPS.",
                "Continue",
            )
        }
    }

    private fun locationServicesIssue() = PermissionIssue(
        PermissionIssueType.LOCATION_SERVICES,
        "Turn on device location",
        "Android location services are currently off. Turn them on so the system can detect geofence entry and exit.",
        "Open location settings",
    )
}
