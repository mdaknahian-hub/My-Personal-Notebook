package com.nahian.mypersonalnotebook.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Persisted locally so Android can rebuild system geofences after a reboot or app update. */
@Entity(tableName = "location_reminders")
data class LocationReminder(
    @PrimaryKey val id: String,
    val title: String,
    val message: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int,
    val triggerType: String,
    val recurrenceType: String,
    val enabled: Boolean,
    val notificationId: Int,
    val createdAt: Long,
    val updatedAt: Long,
    val lastTriggeredAt: Long?,
    /** Used only to suppress duplicate deliveries of the same Play services transition. */
    val lastTransitionType: String? = null,
    /** Used only when recurrenceType is CUSTOM. */
    val customIntervalDays: Int = 1,
    /** Last known registration state; Android remains the geofence monitor. */
    val registered: Boolean = false,
    val registrationError: String? = null,
)

enum class TriggerType(val storageValue: String, val label: String) {
    ENTER("ENTER", "On enter"),
    EXIT("EXIT", "On exit"),
    ENTER_OR_EXIT("ENTER_OR_EXIT", "Enter or exit");

    companion object {
        fun fromStorage(value: String): TriggerType = entries.firstOrNull { it.storageValue == value } ?: ENTER
    }
}

enum class RecurrenceType(val storageValue: String, val label: String) {
    ONCE("ONCE", "Once"),
    EVERY_VISIT("EVERY_VISIT", "Every visit"),
    DAILY("DAILY", "Daily"),
    WEEKLY("WEEKLY", "Weekly"),
    CUSTOM("CUSTOM", "Custom");

    companion object {
        fun fromStorage(value: String): RecurrenceType = entries.firstOrNull { it.storageValue == value } ?: ONCE
    }
}

data class LocationPoint(
    val label: String,
    val latitude: Double,
    val longitude: Double,
)

@Entity(tableName = "saved_locations")
data class SavedLocation(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val label: String,
    val latitude: Double,
    val longitude: Double,
    val createdAt: Long,
)
