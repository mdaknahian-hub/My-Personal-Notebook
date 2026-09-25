package com.nahian.mypersonalnotebook.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import com.nahian.mypersonalnotebook.data.TimeReminderRepository
import com.nahian.mypersonalnotebook.notifications.TimeReminderNotifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class TimeReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(TimeReminderScheduler.EXTRA_REMINDER_ID) ?: return
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val repository = TimeReminderRepository(context)
                val reminder = repository.getById(id) ?: return@launch
                if (!reminder.enabled) return@launch
                val now = System.currentTimeMillis()
                if (reminder.scheduledAt - now > EARLY_DELIVERY_TOLERANCE_MS) {
                    TimeReminderScheduler.schedule(context, reminder)
                    return@launch
                }
                val shown = TimeReminderNotifications.show(context, reminder)
                repository.markDelivered(
                    id,
                    now,
                    deliveryError = if (shown) null else "Android could not show the alert. Check notification permission and channel settings.",
                )
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        const val EARLY_DELIVERY_TOLERANCE_MS = 5_000L
    }
}

class TimeReminderActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(EXTRA_REMINDER_ID) ?: return
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0)
        when (intent.action) {
            ACTION_DONE -> if (notificationId != 0) NotificationManagerCompat.from(context).cancel(notificationId)
            ACTION_SNOOZE -> {
                if (notificationId != 0) {
                    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                    val pendingIntent = snoozePendingIntent(context, id, notificationId)
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        System.currentTimeMillis() + SNOOZE_MILLIS,
                        pendingIntent,
                    )
                    NotificationManagerCompat.from(context).cancel(notificationId)
                }
            }
            ACTION_OPEN -> {
                if (notificationId != 0) NotificationManagerCompat.from(context).cancel(notificationId)
                val open = Intent(context, com.nahian.mypersonalnotebook.ui.MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                context.startActivity(open)
            }
        }
    }

    companion object {
        const val ACTION_DONE = "com.nahian.mypersonalnotebook.TIME_DONE"
        const val ACTION_SNOOZE = "com.nahian.mypersonalnotebook.TIME_SNOOZE"
        const val ACTION_OPEN = "com.nahian.mypersonalnotebook.TIME_OPEN"
        const val EXTRA_REMINDER_ID = "time_reminder_id"
        const val EXTRA_NOTIFICATION_ID = "time_notification_id"
        private const val SNOOZE_MILLIS = 10 * 60 * 1_000L

        private fun snoozePendingIntent(context: Context, id: String, notificationId: Int): PendingIntent {
            val intent = Intent(context, TimeReminderSnoozeReceiver::class.java)
                .setAction("com.nahian.mypersonalnotebook.TIME_SNOOZED")
                .putExtra(EXTRA_REMINDER_ID, id)
                .putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            return PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }
    }
}

class TimeReminderSnoozeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra(TimeReminderActionReceiver.EXTRA_REMINDER_ID) ?: return
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val reminder = TimeReminderRepository(context).getById(id) ?: return@launch
                TimeReminderNotifications.show(context, reminder, isSnoozed = true)
            } finally {
                pending.finish()
            }
        }
    }
}
