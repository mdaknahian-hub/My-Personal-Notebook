package com.nahian.mypersonalnotebook.reminders

import android.content.Context

object ChecklistTaskAlertSettings {
    const val DEFAULT_REPEAT_INTERVAL_MINUTES = 5
    const val MIN_REPEAT_INTERVAL_MINUTES = 1
    const val MAX_REPEAT_INTERVAL_MINUTES = 120
    private const val PREFERENCES = "notebook_preferences"
    private const val REPEAT_INTERVAL_KEY = "checklist_task_alert_repeat_minutes"

    fun repeatIntervalMinutes(context: Context): Int = context.applicationContext
        .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        .getInt(REPEAT_INTERVAL_KEY, DEFAULT_REPEAT_INTERVAL_MINUTES)
        .coerceIn(MIN_REPEAT_INTERVAL_MINUTES, MAX_REPEAT_INTERVAL_MINUTES)

    fun saveRepeatIntervalMinutes(context: Context, minutes: Int): Boolean {
        if (minutes !in MIN_REPEAT_INTERVAL_MINUTES..MAX_REPEAT_INTERVAL_MINUTES) return false
        context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putInt(REPEAT_INTERVAL_KEY, minutes)
            .apply()
        return true
    }
}
