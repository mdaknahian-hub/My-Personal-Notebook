package com.nahian.mypersonalnotebook.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.nahian.mypersonalnotebook.data.ReminderDatabase
import com.nahian.mypersonalnotebook.ui.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ReminderActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: return
        val notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0)
        when (intent.action) {
            ACTION_DONE -> {
                cancelSnooze(context, reminderId, notificationId)
                if (notificationId != 0) NotificationManagerCompat.from(context).cancel(notificationId)
            }
            ACTION_SNOOZE -> {
                scheduleSnooze(context, reminderId, notificationId)
                if (notificationId != 0) NotificationManagerCompat.from(context).cancel(notificationId)
            }
            ACTION_OPEN -> {
                cancelSnooze(context, reminderId, notificationId)
                if (notificationId != 0) NotificationManagerCompat.from(context).cancel(notificationId)
                val open = Intent(context, MainActivity::class.java)
                    .putExtra(MainActivity.EXTRA_REMINDER_ID, reminderId)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                context.startActivity(open)
            }
        }
    }

    private fun scheduleSnooze(context: Context, reminderId: String, notificationId: Int) {
        if (notificationId == 0) return
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pendingIntent = snoozePendingIntent(context, reminderId, notificationId)
        val triggerAt = System.currentTimeMillis() + SNOOZE_MILLIS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
        }
    }

    companion object {
        const val ACTION_DONE = "com.nahian.mypersonalnotebook.ACTION_DONE"
        const val ACTION_SNOOZE = "com.nahian.mypersonalnotebook.ACTION_SNOOZE"
        const val ACTION_OPEN = "com.nahian.mypersonalnotebook.ACTION_OPEN"
        const val EXTRA_REMINDER_ID = "reminder_id"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
        private const val SNOOZE_MILLIS = 10 * 60 * 1_000L

        private fun snoozePendingIntent(context: Context, reminderId: String, notificationId: Int): PendingIntent {
            val intent = Intent(context, SnoozedReminderReceiver::class.java)
                .setAction("com.nahian.mypersonalnotebook.SNOOZED_REMINDER")
                .putExtra(EXTRA_REMINDER_ID, reminderId)
                .putExtra(EXTRA_NOTIFICATION_ID, notificationId)
            return PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        fun cancelSnooze(context: Context, reminderId: String, notificationId: Int) {
            if (notificationId == 0) return
            val pendingIntent = snoozePendingIntent(context, reminderId, notificationId)
            (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }
}

class SnoozedReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra(ReminderActionReceiver.EXTRA_REMINDER_ID) ?: return
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val reminder = ReminderDatabase.get(context).reminderDao().getById(reminderId) ?: return@launch
                ReminderNotifications.show(context, reminder, isSnoozed = true)
            } finally {
                pending.finish()
            }
        }
    }
}
