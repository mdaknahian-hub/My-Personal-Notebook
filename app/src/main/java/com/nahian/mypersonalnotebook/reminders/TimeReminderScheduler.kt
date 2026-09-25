package com.nahian.mypersonalnotebook.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.nahian.mypersonalnotebook.data.TimeReminder

object TimeReminderScheduler {
    fun canScheduleExactAlarms(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return manager.canScheduleExactAlarms()
    }

    fun exactAlarmSettingsIntent(context: Context): Intent =
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).setData(Uri.parse("package:${context.packageName}"))

    fun schedule(context: Context, reminder: TimeReminder): String? {
        if (!canScheduleExactAlarms(context)) {
            return "Allow exact alarms for NAHIAN'S NOTEBOOK in Android settings, then save again."
        }
        return try {
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pendingIntent = alarmPendingIntent(context, reminder)
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.scheduledAt, pendingIntent)
            null
        } catch (_: SecurityException) {
            "Android denied exact alarm access. Enable Alarms & reminders in app settings."
        } catch (error: Exception) {
            error.message ?: "Android could not schedule this reminder."
        }
    }

    fun cancel(context: Context, reminder: TimeReminder) {
        val pendingIntent = alarmPendingIntent(context, reminder)
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pendingIntent)
        pendingIntent.cancel()
    }

    private fun alarmPendingIntent(context: Context, reminder: TimeReminder): PendingIntent {
        val intent = Intent(context, TimeReminderReceiver::class.java)
            .setAction(ACTION_TIME_REMINDER)
            .putExtra(EXTRA_REMINDER_ID, reminder.id)
        return PendingIntent.getBroadcast(
            context,
            reminder.notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    const val EXTRA_REMINDER_ID = "time_reminder_id"
    const val ACTION_TIME_REMINDER = "com.nahian.mypersonalnotebook.TIME_REMINDER"
}
