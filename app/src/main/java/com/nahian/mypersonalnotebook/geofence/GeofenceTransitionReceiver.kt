package com.nahian.mypersonalnotebook.geofence

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofenceStatusCodes
import com.google.android.gms.location.GeofencingEvent
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.ReminderDatabase
import com.nahian.mypersonalnotebook.notifications.ReminderNotifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class GeofenceTransitionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent)
        if (event == null) {
            Log.w(TAG, "Ignoring an empty geofence event")
            return
        }
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val dao = ReminderDatabase.get(context).reminderDao()
                if (event.hasError()) {
                    val message = "Android geofence delivery error: ${GeofenceStatusCodes.getStatusCodeString(event.errorCode)}"
                    Log.e(TAG, message)
                    dao.getEnabled().forEach { dao.upsert(it.copy(registered = false, registrationError = message)) }
                    return@launch
                }

                val entering = when (event.geofenceTransition) {
                    Geofence.GEOFENCE_TRANSITION_ENTER -> true
                    Geofence.GEOFENCE_TRANSITION_EXIT -> false
                    else -> {
                        Log.w(TAG, "Ignoring unsupported geofence transition ${event.geofenceTransition}")
                        return@launch
                    }
                }
                val now = System.currentTimeMillis()
                event.triggeringGeofences.orEmpty().map { it.requestId }.distinct().forEach { id ->
                    val current = dao.getById(id) ?: return@forEach
                    if (!current.enabled || !current.registered) return@forEach
                    val notificationIssue = ReminderNotifications.notificationPermissionIssue(context)
                    if (notificationIssue != null) {
                        dao.upsert(current.copy(registered = false, registrationError = notificationIssue))
                        return@forEach
                    }
                    val claimed = dao.claimTrigger(id, entering, now) ?: return@forEach
                    if (claimed.recurrenceType == RecurrenceType.ONCE.storageValue) {
                        val removeError = GeofenceRegistrar.removeOne(context, id)
                        if (removeError != null) {
                            dao.upsert(claimed.copy(registrationError = "One-time reminder fired, but Android could not remove its geofence: $removeError"))
                        }
                    }
                    ReminderNotifications.show(context, claimed)
                }
            } catch (error: Exception) {
                Log.e(TAG, "Failed to process location reminder transition", error)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        private const val TAG = "LocationReminder"
    }
}
