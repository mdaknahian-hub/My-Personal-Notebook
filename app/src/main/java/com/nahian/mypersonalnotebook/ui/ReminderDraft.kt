package com.nahian.mypersonalnotebook.ui

import com.nahian.mypersonalnotebook.data.LocationReminder
import com.nahian.mypersonalnotebook.data.LocationPoint
import com.nahian.mypersonalnotebook.data.RecurrenceType
import com.nahian.mypersonalnotebook.data.TriggerType
import java.util.UUID

internal data class ReminderDraft(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "",
    val message: String = "",
    val locationName: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radiusMeters: Int = 200,
    val triggerType: String = TriggerType.ENTER.storageValue,
    val recurrenceType: String = RecurrenceType.ONCE.storageValue,
    val customIntervalText: String = "1",
    val enabled: Boolean = true,
    val notificationId: Int = 0,
    val createdAt: Long = 0,
    val lastTriggeredAt: Long? = null,
    val lastTransitionType: String? = null,
)

internal fun LocationReminder.toDraft() = ReminderDraft(
    id = id,
    title = title,
    message = message,
    locationName = title,
    latitude = latitude,
    longitude = longitude,
    radiusMeters = radiusMeters,
    triggerType = triggerType,
    recurrenceType = recurrenceType,
    customIntervalText = customIntervalDays.toString(),
    enabled = enabled,
    notificationId = notificationId,
    createdAt = createdAt,
    lastTriggeredAt = lastTriggeredAt,
    lastTransitionType = lastTransitionType,
)

internal fun ReminderDraft.asLocationPoint(): LocationPoint? {
    val lat = latitude ?: return null
    val lon = longitude ?: return null
    return LocationPoint(locationName.ifBlank { title.ifBlank { "Selected location" } }, lat, lon)
}
