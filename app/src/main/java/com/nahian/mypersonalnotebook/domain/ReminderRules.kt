package com.nahian.mypersonalnotebook.domain

import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.TriggerType
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.WeekFields

object ReminderRules {
    val allowedRadiiMeters = setOf(100, 200, 500, 1_000)
    const val MAX_ACTIVE_GEOFENCES = 100
    private const val DUPLICATE_TRANSITION_WINDOW_MS = 2_000L

    fun validate(
        title: String,
        message: String,
        latitude: Double?,
        longitude: Double?,
        radiusMeters: Int,
        triggerType: String,
        recurrenceType: String,
        customIntervalDays: Int,
    ): String? {
        if (title.isBlank()) return "Add a title for this reminder."
        if (message.isBlank()) return "Add a reminder message."
        if (latitude == null || longitude == null) return "Choose a location before saving."
        if (!latitude.isFinite() || latitude !in -90.0..90.0) return "The selected latitude is invalid. Choose the location again."
        if (!longitude.isFinite() || longitude !in -180.0..180.0) return "The selected longitude is invalid. Choose the location again."
        if (radiusMeters !in allowedRadiiMeters) return "Choose a radius of 100 m, 200 m, 500 m, or 1 km."
        if (TriggerType.entries.none { it.storageValue == triggerType }) return "Choose a valid geofence trigger."
        if (RecurrenceType.entries.none { it.storageValue == recurrenceType }) return "Choose a valid recurrence."
        if (recurrenceType == RecurrenceType.CUSTOM.storageValue && customIntervalDays !in 1..365) {
            return "Custom recurrence must be between 1 and 365 days."
        }
        return null
    }

    fun isValidCoordinates(latitude: Double, longitude: Double): Boolean =
        latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0

    fun transitionMatches(triggerType: String, entering: Boolean): Boolean = when (TriggerType.fromStorage(triggerType)) {
        TriggerType.ENTER -> entering
        TriggerType.EXIT -> !entering
        TriggerType.ENTER_OR_EXIT -> true
    }

    /**
     * A database transaction calls this before claiming a delivered transition. This prevents
     * duplicate Play Services broadcasts from producing duplicate notifications.
     */
    fun mayTrigger(
        reminder: LocationReminder,
        entering: Boolean,
        nowMillis: Long,
        zoneId: ZoneId = ZoneId.systemDefault(),
    ): Boolean {
        if (!reminder.enabled || !transitionMatches(reminder.triggerType, entering)) return false
        val last = reminder.lastTriggeredAt ?: return true
        if (nowMillis < last) return false

        return when (RecurrenceType.fromStorage(reminder.recurrenceType)) {
            RecurrenceType.ONCE -> false
            RecurrenceType.EVERY_VISIT -> {
                val transition = if (entering) "ENTER" else "EXIT"
                reminder.lastTransitionType != transition || nowMillis - last >= DUPLICATE_TRANSITION_WINDOW_MS
            }
            RecurrenceType.DAILY -> dateAt(last, zoneId) != dateAt(nowMillis, zoneId)
            RecurrenceType.WEEKLY -> {
                val fields = WeekFields.ISO
                val previous = dateAt(last, zoneId)
                val current = dateAt(nowMillis, zoneId)
                previous.get(fields.weekBasedYear()) != current.get(fields.weekBasedYear()) ||
                    previous.get(fields.weekOfWeekBasedYear()) != current.get(fields.weekOfWeekBasedYear())
            }
            RecurrenceType.CUSTOM -> {
                val dueDate = dateAt(last, zoneId).plusDays(reminder.customIntervalDays.coerceIn(1, 365).toLong())
                !dateAt(nowMillis, zoneId).isBefore(dueDate)
            }
        }
    }

    private fun dateAt(epochMillis: Long, zoneId: ZoneId): LocalDate =
        Instant.ofEpochMilli(epochMillis).atZone(zoneId).toLocalDate()
}
