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
import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.ui.MainActivity

object ReminderNotifications {
    const val CHANNEL_ID = "location_reminders_high"
    private const val CHANNEL_NAME = "Location reminders"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Alerts when you enter or leave places you selected"
            enableVibration(true)
            setShowBadge(true)
        }
        manager.createNotificationChannel(channel)
    }

    fun notificationPermissionIssue(context: Context): String? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return "Allow notifications so Android can show location reminder alerts."
        }
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            return "Notifications are turned off for My Personal Notebook. Enable them in Android settings."
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .getNotificationChannel(CHANNEL_ID)
            if (channel?.importance == NotificationManager.IMPORTANCE_NONE) {
                return "The Location reminders notification channel is blocked. Enable it in Android settings."
            }
        }
        return null
    }

    fun show(context: Context, reminder: LocationReminder, isTest: Boolean = false, isSnoozed: Boolean = false) {
        ensureChannel(context)
        if (notificationPermissionIssue(context) != null) return

        val openIntent = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_REMINDER_ID, reminder.id)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val contentIntent = PendingIntent.getActivity(
            context,
            reminder.notificationId,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val displayMessage = when {
            isTest -> "Test notification · ${reminder.message}"
            isSnoozed -> reminder.message
            else -> reminder.message
        }
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Location Reminder")
            .setContentText(displayMessage)
            .setStyle(NotificationCompat.BigTextStyle().bigText(displayMessage))
            .setSubText(reminder.title)
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOnlyAlertOnce(false)

        builder.addAction(
            0,
            "Done",
            actionPendingIntent(context, reminder, ReminderActionReceiver.ACTION_DONE),
        )
        builder.addAction(
            0,
            "Snooze 10 min",
            actionPendingIntent(context, reminder, ReminderActionReceiver.ACTION_SNOOZE),
        )
        builder.addAction(
            0,
            "Open",
            actionPendingIntent(context, reminder, ReminderActionReceiver.ACTION_OPEN),
        )

        try {
            NotificationManagerCompat.from(context).notify(reminder.notificationId, builder.build())
        } catch (_: SecurityException) {
            // Runtime notification permission can be revoked between delivery and notify().
        }
    }

    private fun actionPendingIntent(context: Context, reminder: LocationReminder, action: String): PendingIntent {
        val intent = Intent(context, ReminderActionReceiver::class.java)
            .setAction(action)
            .putExtra(ReminderActionReceiver.EXTRA_REMINDER_ID, reminder.id)
            .putExtra(ReminderActionReceiver.EXTRA_NOTIFICATION_ID, reminder.notificationId)
        val requestCode = reminder.notificationId xor action.hashCode()
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
