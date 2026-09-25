package com.nahian.mypersonalnotebook.domain

/** Pure validation for one-shot time reminders; Android scheduling stays in the platform layer. */
object TimeReminderRules {
    const val MINIMUM_LEAD_TIME_MILLIS = 5_000L

    fun validate(title: String, message: String, scheduledAt: Long, nowMillis: Long): String? = when {
        title.isBlank() -> "Add a title for this reminder."
        message.isBlank() -> "Add a reminder message."
        scheduledAt <= nowMillis + MINIMUM_LEAD_TIME_MILLIS -> "Choose a future date and time."
        else -> null
    }

    fun canEnable(scheduledAt: Long, nowMillis: Long): Boolean = scheduledAt > nowMillis
}
