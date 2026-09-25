package com.nahian.mypersonalnotebook.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.nahian.mypersonalnotebook.R
import com.nahian.mypersonalnotebook.data.TimeReminder
import com.nahian.mypersonalnotebook.reminders.TimeReminderActionReceiver
import com.nahian.mypersonalnotebook.ui.MainActivity
import com.nahian.mypersonalnotebook.ui.NotebookLanguage
import com.nahian.mypersonalnotebook.ui.NotebookLanguageSettings
import com.nahian.mypersonalnotebook.ui.uiText
import java.text.DateFormat
import java.util.Date

object TimeReminderNotifications {
    const val CHANNEL_ID = "scheduled_reminders_high"
    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = manager.getNotificationChannel(CHANNEL_ID)
            ?: NotificationChannel(CHANNEL_ID, uiText("Scheduled reminders"), NotificationManager.IMPORTANCE_HIGH)
        channel.name = uiText("Scheduled reminders")
        channel.description = uiText("Notifications for reminders scheduled by date and time")
        channel.enableVibration(true)
        channel.setShowBadge(true)
        manager.createNotificationChannel(channel)
    }

    fun notificationPermissionIssue(context: Context): String? {
        ensureChannel(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return "Allow notifications so scheduled reminders can alert you."
        }
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            return "Notifications are turned off for NAHIAN'S NOTEBOOK. Enable them in Android settings."
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .getNotificationChannel(CHANNEL_ID)
            if (channel?.importance == NotificationManager.IMPORTANCE_NONE) {
                return "The Scheduled reminders notification channel is blocked. Enable it in Android settings."
            }
        }
        return null
    }

    fun show(context: Context, reminder: TimeReminder, isSnoozed: Boolean = false): Boolean {
        ensureChannel(context)
        if (notificationPermissionIssue(context) != null) return false
        val openIntent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val contentIntent = PendingIntent.getActivity(
            context,
            reminder.notificationId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val timeText = DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(reminder.scheduledAt))
        val body = if (isSnoozed) reminder.message else reminder.message
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(reminder.title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$body\n$timeText"))
            .setSubText(uiText("Scheduled reminder"))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOnlyAlertOnce(false)
            .addAction(0, uiText("Done"), actionPendingIntent(context, reminder, TimeReminderActionReceiver.ACTION_DONE))
            .addAction(0, uiText("Snooze 10 min"), actionPendingIntent(context, reminder, TimeReminderActionReceiver.ACTION_SNOOZE))
            .addAction(0, uiText("Open"), actionPendingIntent(context, reminder, TimeReminderActionReceiver.ACTION_OPEN))
        return try {
            NotificationManagerCompat.from(context).notify(reminder.notificationId, builder.build())
            true
        } catch (_: SecurityException) {
            // Notification permission can be revoked after the alarm is scheduled.
            false
        }
    }

    private fun actionPendingIntent(context: Context, reminder: TimeReminder, action: String): PendingIntent {
        val intent = Intent(context, TimeReminderActionReceiver::class.java)
            .setAction(action)
            .putExtra(TimeReminderActionReceiver.EXTRA_REMINDER_ID, reminder.id)
            .putExtra(TimeReminderActionReceiver.EXTRA_NOTIFICATION_ID, reminder.notificationId)
        return PendingIntent.getBroadcast(
            context,
            reminder.notificationId xor action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
