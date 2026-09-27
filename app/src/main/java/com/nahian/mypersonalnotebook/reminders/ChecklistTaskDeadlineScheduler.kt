package com.nahian.mypersonalnotebook.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimit
import com.nahian.mypersonalnotebook.data.NotebookChecklistItem
import com.nahian.mypersonalnotebook.data.NotebookContentDatabase
import com.nahian.mypersonalnotebook.notifications.ChecklistTaskDeadlineNotifications

object ChecklistTaskDeadlineScheduler {
    const val ACTION_CHECK_TASK_LIMIT = "com.nahian.mypersonalnotebook.CHECK_TASK_LIMIT"
    const val ACTION_COMPLETE_TASK = "com.nahian.mypersonalnotebook.COMPLETE_TASK_FROM_ALERT"
    const val EXTRA_TASK_ID = "checklist_task_id"

    fun schedule(context: Context, item: NotebookChecklistItem, atMillis: Long? = null) {
        if (item.isChecked) {
            cancel(context, item.id)
            return
        }
        val dueAt = ChecklistTaskTimeLimit.from(item).dueAt() ?: run {
            cancel(context, item.id)
            return
        }
        val triggerAt = atMillis ?: maxOf(dueAt, System.currentTimeMillis())
        ChecklistTaskDeadlineNotifications.ensureChannel(context)
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val alarm = alarmPendingIntent(context, item.id)
        try {
            if (TimeReminderScheduler.canScheduleExactAlarms(context)) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, alarm)
            } else {
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, alarm)
            }
        } catch (_: SecurityException) {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, alarm)
        }
    }

    fun cancel(context: Context, taskId: String) {
        val alarm = alarmPendingIntent(context, taskId)
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarm)
        alarm.cancel()
        NotificationManagerCompat.from(context).cancel(notificationId(taskId))
    }

    suspend fun restoreAll(context: Context) {
        NotebookContentDatabase.get(context).dao().getAllChecklistItems().forEach { item ->
            if (item.isChecked) cancel(context, item.id) else schedule(context, item)
        }
    }

    fun notificationId(taskId: String): Int = taskId.hashCode()

    private fun alarmPendingIntent(context: Context, taskId: String): PendingIntent {
        val intent = Intent(context, ChecklistTaskDeadlineReceiver::class.java)
            .setAction(ACTION_CHECK_TASK_LIMIT)
            .putExtra(EXTRA_TASK_ID, taskId)
        return PendingIntent.getBroadcast(
            context,
            notificationId(taskId),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
