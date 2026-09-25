package com.nahian.mypersonalnotebook.geofence

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Tasks
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.GeofenceStatusCodes
import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.TriggerType
import com.nahian.mypersonalnotebook.domain.ReminderRules
import com.nahian.mypersonalnotebook.notifications.ReminderNotifications
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex

/** Registers system geofences only; this code never starts a GPS polling service. */
object GeofenceRegistrar {
    private const val REQUEST_CODE = 7134
    private const val TASK_TIMEOUT_SECONDS = 30L
    private val registrationMutex = Mutex()

    fun permissionOrDeviceIssue(context: Context): String? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return "Precise location permission is required to monitor this geofence."
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED
        ) {
            return "Allow location access all the time in Android settings so reminders can trigger while the app is closed."
        }
        if (!isLocationEnabled(context)) return "Location services are off. Turn on device location to register geofences."
        if (GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) != ConnectionResult.SUCCESS) {
            return "Google Play services for location are unavailable or need updating."
        }
        return ReminderNotifications.notificationPermissionIssue(context)
    }

    suspend fun registerOne(
        context: Context,
        reminder: LocationReminder,
        beforeAdd: suspend () -> Unit = {},
    ): String? = withRegistrationLock {
        if (!reminder.enabled) return@withRegistrationLock "This reminder is disabled."
        val inputError = validateReminder(reminder)
        if (inputError != null) return@withRegistrationLock inputError
        val deviceIssue = permissionOrDeviceIssue(context)
        if (deviceIssue != null) return@withRegistrationLock deviceIssue

        val client = LocationServices.getGeofencingClient(context)
        val removeError = removeById(client, reminder.id)
        if (removeError != null) return@withRegistrationLock "Could not safely replace this geofence: $removeError"
        try {
            // Mark the row armed only after any previous fence has been removed, but before an
            // initial transition can be delivered for the new fence.
            beforeAdd()
            addOne(client, geofencePendingIntent(context), reminder)
        } catch (error: Exception) {
            "Could not prepare reminder registration: ${describe(error)}"
        }
    }

    suspend fun removeOne(context: Context, id: String): String? = withRegistrationLock {
        val client = LocationServices.getGeofencingClient(context)
        removeById(client, id)
    }

    suspend fun restoreAll(
        context: Context,
        reminders: List<LocationReminder>,
        beforeAdd: suspend (LocationReminder) -> Unit = {},
    ): RestoreRegistrationResult = withRegistrationLock {
        val problem = if (reminders.isNotEmpty()) permissionOrDeviceIssue(context) else null
        if (problem != null) {
            val states = reminders.associate { it.id to (false to problem) }
            return@withRegistrationLock RestoreRegistrationResult(0, states, listOf(problem))
        }

        val client = LocationServices.getGeofencingClient(context)
        try {
            // Package updates can leave old registrations behind; clear this app's request first.
            withContext(Dispatchers.IO) {
                Tasks.await(client.removeGeofences(geofencePendingIntent(context)), TASK_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            }
        } catch (error: Exception) {
            val reason = "Android could not clear old geofences before restoring: ${describe(error)}"
            return@withRegistrationLock RestoreRegistrationResult(0, reminders.associate { it.id to (false to reason) }, listOf(reason))
        }
        if (reminders.isEmpty()) return@withRegistrationLock RestoreRegistrationResult(0, emptyMap(), emptyList())

        val states = linkedMapOf<String, Pair<Boolean, String?>>()
        val errors = mutableListOf<String>()
        var registered = 0
        val countsById = reminders.groupingBy { it.id }.eachCount()
        val unique = reminders.distinctBy { it.id }

        unique.forEachIndexed { index, reminder ->
            val validationError = validateReminder(reminder)
            val error = when {
                countsById[reminder.id] != 1 -> "Duplicate geofence ID found in local data; edit this reminder to repair it."
                index >= ReminderRules.MAX_ACTIVE_GEOFENCES -> "Android supports at most ${ReminderRules.MAX_ACTIVE_GEOFENCES} active geofences per app."
                validationError != null -> validationError
                else -> try {
                    beforeAdd(reminder)
                    addOne(client, geofencePendingIntent(context), reminder)
                } catch (failure: Exception) {
                    "Could not prepare reminder registration: ${describe(failure)}"
                }
            }
            states[reminder.id] = (error == null) to error
            if (error == null) registered++ else errors += "${reminder.title}: $error"
        }
        RestoreRegistrationResult(registered, states, errors)
    }

    private suspend fun <T> withRegistrationLock(action: suspend () -> T): T {
        registrationMutex.lock()
        try {
            return action()
        } finally {
            registrationMutex.unlock()
        }
    }

    private suspend fun addOne(client: GeofencingClient, pendingIntent: PendingIntent, reminder: LocationReminder): String? =
        withContext(Dispatchers.IO) {
            try {
                val geofence = Geofence.Builder()
                    .setRequestId(reminder.id)
                    .setCircularRegion(reminder.latitude, reminder.longitude, reminder.radiusMeters.toFloat())
                    .setExpirationDuration(Geofence.NEVER_EXPIRE)
                    .setTransitionTypes(transitionMask(reminder.triggerType))
                    .setNotificationResponsiveness(10_000)
                    .build()
                val request = GeofencingRequest.Builder()
                    .setInitialTrigger(initialTriggerMask(reminder.triggerType))
                    .addGeofence(geofence)
                    .build()
                Tasks.await(client.addGeofences(request, pendingIntent), TASK_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                null
            } catch (error: Exception) {
                "Geofence registration failed: ${describe(error)}"
            }
        }

    private suspend fun removeById(client: GeofencingClient, id: String): String? = withContext(Dispatchers.IO) {
        try {
            Tasks.await(client.removeGeofences(listOf(id)), TASK_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            null
        } catch (error: Exception) {
            "${describe(error)}"
        }
    }

    private fun transitionMask(type: String): Int = when (TriggerType.fromStorage(type)) {
        TriggerType.ENTER -> Geofence.GEOFENCE_TRANSITION_ENTER
        TriggerType.EXIT -> Geofence.GEOFENCE_TRANSITION_EXIT
        TriggerType.ENTER_OR_EXIT -> Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT
    }

    private fun initialTriggerMask(type: String): Int = when (TriggerType.fromStorage(type)) {
        TriggerType.ENTER -> GeofencingRequest.INITIAL_TRIGGER_ENTER
        TriggerType.EXIT -> GeofencingRequest.INITIAL_TRIGGER_EXIT
        TriggerType.ENTER_OR_EXIT -> GeofencingRequest.INITIAL_TRIGGER_ENTER or GeofencingRequest.INITIAL_TRIGGER_EXIT
    }

    private fun validateReminder(reminder: LocationReminder): String? {
        if (!ReminderRules.isValidCoordinates(reminder.latitude, reminder.longitude)) return "The saved coordinates are invalid. Edit the reminder and choose a location again."
        if (reminder.radiusMeters !in ReminderRules.allowedRadiiMeters) return "The saved geofence radius is invalid. Choose 100 m, 200 m, 500 m, or 1 km."
        if (TriggerType.entries.none { it.storageValue == reminder.triggerType }) return "The saved trigger type is invalid. Edit this reminder."
        if (RecurrenceType.entries.none { it.storageValue == reminder.recurrenceType }) return "The saved recurrence is invalid. Edit this reminder."
        if (reminder.recurrenceType == RecurrenceType.CUSTOM.storageValue && reminder.customIntervalDays !in 1..365) {
            return "The saved custom recurrence is invalid. Edit this reminder."
        }
        return null
    }

    private fun geofencePendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, GeofenceTransitionReceiver::class.java)
            .setAction(ACTION_GEOFENCE_TRANSITION)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Play services must attach transition extras to this explicit receiver intent.
            PendingIntent.FLAG_MUTABLE
        } else 0
        return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
    }

    private fun isLocationEnabled(context: Context): Boolean {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            manager.isLocationEnabled
        } else {
            runCatching {
                manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
            }.getOrDefault(false)
        }
    }

    private fun describe(error: Throwable): String {
        val cause = (error as? ApiException) ?: generateSequence(error) { it.cause }.filterIsInstance<ApiException>().firstOrNull()
        if (cause != null) {
            val text = runCatching { GeofenceStatusCodes.getStatusCodeString(cause.statusCode) }.getOrNull()
            return text ?: cause.statusMessage ?: "Google Play services error ${cause.statusCode}"
        }
        return error.message?.takeIf { it.isNotBlank() } ?: error.javaClass.simpleName
    }

    private const val ACTION_GEOFENCE_TRANSITION = "com.nahian.mypersonalnotebook.GEOFENCE_TRANSITION"
}

data class RestoreRegistrationResult(
    val registeredCount: Int,
    val states: Map<String, Pair<Boolean, String?>>,
    val errors: List<String>,
)
