package com.nahian.mypersonalnotebook.data

import android.content.Context
import com.nahian.mypersonalnotebook.domain.ReminderRules
import com.nahian.mypersonalnotebook.geofence.GeofenceRegistrar
import java.security.SecureRandom
import kotlinx.coroutines.flow.Flow

class LocationReminderRepository(context: Context, database: ReminderDatabase = ReminderDatabase.get(context)) {
    private val appContext = context.applicationContext
    private val reminderDao = database.reminderDao()
    private val savedLocationDao = database.savedLocationDao()

    fun observeReminders(): Flow<List<LocationReminder>> = reminderDao.observeAll()

    fun observeSavedLocations(): Flow<List<SavedLocation>> = savedLocationDao.observeAll()

    suspend fun saveReminder(reminder: LocationReminder): OperationResult {
        val validation = ReminderRules.validate(
            title = reminder.title,
            message = reminder.message,
            latitude = reminder.latitude,
            longitude = reminder.longitude,
            radiusMeters = reminder.radiusMeters,
            triggerType = reminder.triggerType,
            recurrenceType = reminder.recurrenceType,
            customIntervalDays = reminder.customIntervalDays,
        )
        if (validation != null) return OperationResult.Error(validation)

        val previous = reminderDao.getById(reminder.id)
        if (reminder.enabled && previous?.enabled != true && reminderDao.countEnabled() >= ReminderRules.MAX_ACTIVE_GEOFENCES) {
            return OperationResult.Error("Android allows up to ${ReminderRules.MAX_ACTIVE_GEOFENCES} active geofences per app.")
        }
        val now = System.currentTimeMillis()
        val notificationId = if (previous != null) previous.notificationId else newNotificationId()
        val restartingOneShot = previous?.enabled == false &&
            reminder.enabled && reminder.recurrenceType == RecurrenceType.ONCE.storageValue
        val candidate = reminder.copy(
            notificationId = notificationId,
            createdAt = previous?.createdAt ?: reminder.createdAt.takeIf { it > 0 } ?: now,
            updatedAt = now,
            lastTriggeredAt = if (restartingOneShot) null else reminder.lastTriggeredAt,
            lastTransitionType = if (restartingOneShot) null else reminder.lastTransitionType,
            registered = false,
            registrationError = null,
        )

        // Persist first. A very small geofence can deliver immediately when registration succeeds.
        reminderDao.upsert(candidate)
        if (!candidate.enabled) {
            val removeError = GeofenceRegistrar.removeOne(appContext, candidate.id)
            val state = candidate.copy(
                registered = false,
                registrationError = removeError?.let { "Reminder is off, but Android could not remove its old geofence: $it" },
            )
            reminderDao.upsert(state)
            return if (removeError == null) OperationResult.Success else OperationResult.Warning(state.registrationError!!)
        }

        val registrationError = GeofenceRegistrar.registerOne(appContext, candidate) {
            reminderDao.updateRegistrationState(candidate.id, registered = true, error = null)
        }
        reminderDao.updateRegistrationState(candidate.id, registered = registrationError == null, error = registrationError)
        val latest = reminderDao.getById(candidate.id)
        return if (registrationError == null || latest?.enabled == false) OperationResult.Success
        else OperationResult.Warning("Reminder saved, but it is not registered yet. $registrationError")
    }

    suspend fun setEnabled(id: String, enabled: Boolean): OperationResult {
        val current = reminderDao.getById(id) ?: return OperationResult.Error("This reminder no longer exists.")
        if (!enabled) {
            val off = current.copy(enabled = false, registered = false, registrationError = null, updatedAt = System.currentTimeMillis())
            reminderDao.upsert(off)
            val error = GeofenceRegistrar.removeOne(appContext, id)
            if (error != null) {
                reminderDao.upsert(off.copy(registrationError = "Reminder is off, but Android could not remove its geofence: $error"))
                return OperationResult.Warning(error)
            }
            return OperationResult.Success
        }

        if (reminderDao.countEnabled() >= ReminderRules.MAX_ACTIVE_GEOFENCES && !current.enabled) {
            return OperationResult.Error("Android allows up to ${ReminderRules.MAX_ACTIVE_GEOFENCES} active geofences per app.")
        }
        val restartingOneShot = !current.enabled && current.recurrenceType == RecurrenceType.ONCE.storageValue
        val on = current.copy(
            enabled = true,
            registered = false,
            registrationError = null,
            updatedAt = System.currentTimeMillis(),
            lastTriggeredAt = if (restartingOneShot) null else current.lastTriggeredAt,
            lastTransitionType = if (restartingOneShot) null else current.lastTransitionType,
        )
        reminderDao.upsert(on)
        val error = GeofenceRegistrar.registerOne(appContext, on) {
            reminderDao.updateRegistrationState(id, registered = true, error = null)
        }
        reminderDao.updateRegistrationState(id, registered = error == null, error = error)
        val latest = reminderDao.getById(id)
        return if (error == null || latest?.enabled == false) OperationResult.Success
        else OperationResult.Warning("Reminder is enabled locally but not registered. $error")
    }

    suspend fun deleteReminder(id: String) {
        // Delete first so an in-flight transition receiver will ignore this id.
        reminderDao.deleteById(id)
        GeofenceRegistrar.removeOne(appContext, id)
    }

    suspend fun testNotification(id: String): OperationResult {
        val reminder = reminderDao.getById(id) ?: return OperationResult.Error("This reminder no longer exists.")
        val reason = com.nahian.mypersonalnotebook.notifications.ReminderNotifications.notificationPermissionIssue(appContext)
        if (reason != null) return OperationResult.Error(reason)
        com.nahian.mypersonalnotebook.notifications.ReminderNotifications.show(appContext, reminder, isTest = true)
        return OperationResult.Success
    }

    suspend fun saveLocation(label: String, latitude: Double, longitude: Double): OperationResult {
        if (label.isBlank()) return OperationResult.Error("Give this saved location a name.")
        if (!ReminderRules.isValidCoordinates(latitude, longitude)) return OperationResult.Error("Those coordinates are invalid.")
        savedLocationDao.upsert(
            SavedLocation(
                label = label.trim(),
                latitude = latitude,
                longitude = longitude,
                createdAt = System.currentTimeMillis(),
            ),
        )
        return OperationResult.Success
    }

    suspend fun deleteSavedLocation(id: Long) = savedLocationDao.deleteById(id)

    suspend fun restoreAllAfterRestart(): RestoreSummary {
        reminderDao.markEnabledUnregistered("Restoring Android geofences after restart or app update.")
        val reminders = reminderDao.getEnabled()
        val result = GeofenceRegistrar.restoreAll(appContext, reminders) { reminder ->
            reminderDao.updateRegistrationState(reminder.id, registered = true, error = null)
        }
        result.states.forEach { (id, state) ->
            reminderDao.updateRegistrationState(id, registered = state.first, error = state.second)
        }
        return RestoreSummary(result.registeredCount, result.errors)
    }

    suspend fun markActiveRemindersUnregistered(reason: String) {
        reminderDao.markEnabledUnregistered(reason)
    }

    suspend fun retryPendingRegistrations(): RestoreSummary {
        val enabled = reminderDao.getEnabled()
        val pending = enabled.filter { !it.registered }
        var availableSlots = (ReminderRules.MAX_ACTIVE_GEOFENCES - enabled.count { it.registered }).coerceAtLeast(0)
        var successful = 0
        val errors = mutableListOf<String>()
        for (reminder in pending) {
            if (availableSlots <= 0) {
                val message = "Android supports at most ${ReminderRules.MAX_ACTIVE_GEOFENCES} active geofences per app."
                reminderDao.upsert(reminder.copy(registered = false, registrationError = message))
                errors += "${reminder.title}: $message"
                continue
            }
            val error = GeofenceRegistrar.registerOne(appContext, reminder) {
                reminderDao.updateRegistrationState(reminder.id, registered = true, error = null)
            }
            reminderDao.updateRegistrationState(reminder.id, registered = error == null, error = error)
            if (error == null) {
                successful++
                availableSlots--
            } else errors += "${reminder.title}: $error"
        }
        return RestoreSummary(successful, errors)
    }

    private suspend fun newNotificationId(): Int {
        val random = SecureRandom()
        repeat(20) {
            val candidate = random.nextInt(Int.MAX_VALUE - 1) + 1
            if (reminderDao.countWithNotificationId(candidate) == 0) return candidate
        }
        // This is exceptionally unlikely, but a deterministic positive fallback avoids id 0.
        var fallback = (System.currentTimeMillis() and 0x7fffffff).toInt().coerceAtLeast(1)
        while (reminderDao.countWithNotificationId(fallback) > 0) fallback = if (fallback == Int.MAX_VALUE) 1 else fallback + 1
        return fallback
    }
}

data class RestoreSummary(val registeredCount: Int, val errors: List<String>)

sealed interface OperationResult {
    data object Success : OperationResult
    data class Warning(val message: String) : OperationResult
    data class Error(val message: String) : OperationResult
}
