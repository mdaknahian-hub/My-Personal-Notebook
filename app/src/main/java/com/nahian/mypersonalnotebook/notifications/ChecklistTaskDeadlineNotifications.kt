package com.nahian.mypersonalnotebook.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.nahian.mypersonalnotebook.R
import com.nahian.mypersonalnotebook.data.NotebookChecklistItem
import com.nahian.mypersonalnotebook.reminders.ChecklistTaskDeadlineScheduler
import com.nahian.mypersonalnotebook.ui.MainActivity
import com.nahian.mypersonalnotebook.ui.uiText

object ChecklistTaskDeadlineNotifications {
    const val CHANNEL_ID = "checklist_task_deadlines_alarm_v1"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = manager.getNotificationChannel(CHANNEL_ID)
            ?: NotificationChannel(CHANNEL_ID, uiText("Task deadline alerts"), NotificationManager.IMPORTANCE_HIGH).apply {
                setSound(
                    Settings.System.DEFAULT_ALARM_ALERT_URI,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
            }
        channel.name = uiText("Task deadline alerts")
        channel.description = uiText("Audible alerts when a checklist task passes its time limit")
        channel.setShowBadge(true)
        manager.createNotificationChannel(channel)
    }

    fun show(context: Context, checklistTitle: String, item: NotebookChecklistItem): Boolean {
        ensureChannel(context)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return false
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .getNotificationChannel(CHANNEL_ID)
            if (channel?.importance == NotificationManager.IMPORTANCE_NONE) return false
        }

        val openIntent = Intent(context, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_OPEN_SECTION, MainActivity.SECTION_CHECKLISTS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val contentIntent = PendingIntent.getActivity(
            context,
            ChecklistTaskDeadlineScheduler.notificationId(item.id),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val completeIntent = Intent(context, com.nahian.mypersonalnotebook.reminders.ChecklistTaskDeadlineReceiver::class.java)
            .setAction(ChecklistTaskDeadlineScheduler.ACTION_COMPLETE_TASK)
            .putExtra(ChecklistTaskDeadlineScheduler.EXTRA_TASK_ID, item.id)
        val completePendingIntent = PendingIntent.getBroadcast(
            context,
            ChecklistTaskDeadlineScheduler.notificationId(item.id) xor ChecklistTaskDeadlineScheduler.ACTION_COMPLETE_TASK.hashCode(),
            completeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val description = if (checklistTitle.isBlank()) item.text else "$checklistTitle · ${item.text}"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(uiText("Task time limit exceeded"))
            .setContentText(description)
            .setStyle(NotificationCompat.BigTextStyle().bigText(description))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setOnlyAlertOnce(false)
            .addAction(0, uiText("Mark task complete"), completePendingIntent)
            .build()
        return try {
            NotificationManagerCompat.from(context).notify(ChecklistTaskDeadlineScheduler.notificationId(item.id), notification)
            true
        } catch (_: SecurityException) {
            false
        }
    }
}
