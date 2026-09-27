package com.nahian.mypersonalnotebook.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimit
import com.nahian.mypersonalnotebook.data.NotebookContentDatabase
import com.nahian.mypersonalnotebook.notifications.ChecklistTaskDeadlineNotifications
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class ChecklistTaskDeadlineReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra(ChecklistTaskDeadlineScheduler.EXTRA_TASK_ID) ?: return
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val dao = NotebookContentDatabase.get(context).dao()
                if (intent.action == ChecklistTaskDeadlineScheduler.ACTION_COMPLETE_TASK) {
                    dao.getChecklistItem(taskId)?.let { item ->
                        if (!item.isChecked) {
                            dao.setItemChecked(taskId, true)
                            dao.touchChecklist(item.checklistId, System.currentTimeMillis())
                        }
                    }
                    ChecklistTaskDeadlineScheduler.cancel(context, taskId)
                    return@launch
                }

                val item = dao.getChecklistItem(taskId)
                if (item == null || item.isChecked) {
                    ChecklistTaskDeadlineScheduler.cancel(context, taskId)
                    return@launch
                }
                val dueAt = ChecklistTaskTimeLimit.from(item).dueAt()
                if (dueAt == null) {
                    ChecklistTaskDeadlineScheduler.cancel(context, taskId)
                    return@launch
                }
                val now = System.currentTimeMillis()
                if (dueAt - now > EARLY_DELIVERY_TOLERANCE_MS) {
                    ChecklistTaskDeadlineScheduler.schedule(context, item)
                    return@launch
                }

                val checklist = dao.getChecklist(item.checklistId)
                ChecklistTaskDeadlineNotifications.show(context, checklist?.title.orEmpty(), item)
                val repeatMinutes = ChecklistTaskAlertSettings.repeatIntervalMinutes(context)
                ChecklistTaskDeadlineScheduler.schedule(context, item, now + repeatMinutes * MINUTE_MS)
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        const val EARLY_DELIVERY_TOLERANCE_MS = 5_000L
        const val MINUTE_MS = 60_000L
    }
}

class ChecklistTaskDeadlineRestoreReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                ChecklistTaskDeadlineScheduler.restoreAll(context)
            } finally {
                pending.finish()
            }
        }
    }
}
