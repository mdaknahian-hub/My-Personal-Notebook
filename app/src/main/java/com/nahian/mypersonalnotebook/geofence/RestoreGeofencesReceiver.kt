package com.nahian.mypersonalnotebook.geofence

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.nahian.mypersonalnotebook.data.LocationReminderRepository
import com.nahian.mypersonalnotebook.data.TimeReminderRepository

/** Enqueues durable work after reboot, unlock, or package replacement. */
class RestoreGeofencesReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_USER_UNLOCKED,
            -> Unit
            else -> return
        }
        val request = OneTimeWorkRequestBuilder<RestoreGeofencesWorker>().build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            RESTORE_WORK_NAME,
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            request,
        )
    }

    companion object {
        const val RESTORE_WORK_NAME = "restore_location_geofences"
    }
}

class RestoreGeofencesWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result = try {
        val summary = LocationReminderRepository(applicationContext).restoreAllAfterRestart()
        if (summary.errors.isNotEmpty()) {
            Log.w(TAG, "Geofence restore completed with issues: ${summary.errors.joinToString()}")
        } else {
            Log.i(TAG, "Restored ${summary.registeredCount} location geofences")
        }
        val timeErrors = TimeReminderRepository(applicationContext).restoreEnabledReminders()
        if (timeErrors.isNotEmpty()) {
            Log.w(TAG, "Scheduled reminders restored with issues: ${timeErrors.joinToString()}")
        }
        // Registration issues are persisted for the screen to show; do not spin/retry forever.
        Result.success()
    } catch (error: Exception) {
        Log.e(TAG, "Could not restore location geofences", error)
        Result.retry()
    }

    companion object {
        private const val TAG = "LocationReminder"
    }
}
