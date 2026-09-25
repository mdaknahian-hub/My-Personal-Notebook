package com.nahian.mypersonalnotebook.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Upsert
import com.nahian.mypersonalnotebook.reminders.TimeReminderScheduler
import com.nahian.mypersonalnotebook.notifications.TimeReminderNotifications
import java.security.SecureRandom
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "time_reminders")
data class TimeReminder(
    @PrimaryKey val id: String,
    val title: String,
    val message: String,
    val scheduledAt: Long,
    val enabled: Boolean,
    val notificationId: Int,
    val createdAt: Long,
    val updatedAt: Long,
    val lastTriggeredAt: Long? = null,
    val scheduleError: String? = null,
)

@Dao
interface TimeReminderDao {
    @Query("SELECT * FROM time_reminders ORDER BY enabled DESC, scheduledAt ASC")
    fun observeAll(): Flow<List<TimeReminder>>

    @Query("SELECT * FROM time_reminders WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TimeReminder?

    @Query("SELECT COUNT(*) FROM time_reminders WHERE notificationId = :notificationId")
    suspend fun countWithNotificationId(notificationId: Int): Int

    @Query("SELECT * FROM time_reminders WHERE enabled = 1 ORDER BY scheduledAt ASC")
    suspend fun getEnabled(): List<TimeReminder>

    @Upsert
    suspend fun upsert(reminder: TimeReminder)

    @Query("DELETE FROM time_reminders WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Database(entities = [TimeReminder::class], version = 1, exportSchema = true)
abstract class TimeReminderDatabase : RoomDatabase() {
    abstract fun timeReminderDao(): TimeReminderDao

    companion object {
        @Volatile
        private var instance: TimeReminderDatabase? = null

        fun get(context: Context): TimeReminderDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                TimeReminderDatabase::class.java,
                "time_reminders.db",
            ).build().also { instance = it }
        }
    }
}

class TimeReminderRepository(context: Context) {
    private val appContext = context.applicationContext
    private val dao = TimeReminderDatabase.get(appContext).timeReminderDao()

    fun observeAll(): Flow<List<TimeReminder>> = dao.observeAll()

    suspend fun save(reminder: TimeReminder): ContentResult {
        if (reminder.title.isBlank()) return ContentResult.Error("Add a title for this reminder.")
        if (reminder.message.isBlank()) return ContentResult.Error("Add a reminder message.")
        TimeReminderNotifications.notificationPermissionIssue(appContext)?.let { return ContentResult.Error(it) }
        if (reminder.scheduledAt <= System.currentTimeMillis() + MINIMUM_LEAD_TIME_MS) {
            return ContentResult.Error("Choose a future date and time.")
        }
        val previous = dao.getById(reminder.id)
        val now = System.currentTimeMillis()
        val notificationId = previous?.notificationId ?: reminder.notificationId.takeIf { it > 0 } ?: nextNotificationId()
        var candidate = reminder.copy(
            title = reminder.title.trim(),
            message = reminder.message.trim(),
            notificationId = notificationId,
            createdAt = previous?.createdAt ?: reminder.createdAt.takeIf { it > 0 } ?: now,
            updatedAt = now,
            scheduleError = null,
        )
        dao.upsert(candidate)
        val error = if (candidate.enabled) TimeReminderScheduler.schedule(appContext, candidate) else {
            TimeReminderScheduler.cancel(appContext, candidate)
            null
        }
        if (error != null) {
            candidate = candidate.copy(scheduleError = error)
            dao.upsert(candidate)
            return ContentResult.Error("Reminder saved, but Android did not accept its schedule: $error")
        }
        return ContentResult.Success
    }

    suspend fun setEnabled(id: String, enabled: Boolean): ContentResult {
        val current = dao.getById(id) ?: return ContentResult.Error("This reminder no longer exists.")
        if (enabled) TimeReminderNotifications.notificationPermissionIssue(appContext)?.let { return ContentResult.Error(it) }
        if (enabled && current.scheduledAt <= System.currentTimeMillis()) {
            return ContentResult.Error("Choose a new future time before enabling this reminder.")
        }
        val updated = current.copy(enabled = enabled, updatedAt = System.currentTimeMillis(), scheduleError = null)
        dao.upsert(updated)
        val error = if (enabled) TimeReminderScheduler.schedule(appContext, updated) else {
            TimeReminderScheduler.cancel(appContext, updated)
            null
        }
        if (error != null) {
            dao.upsert(updated.copy(scheduleError = error))
            return ContentResult.Error(error)
        }
        return ContentResult.Success
    }

    suspend fun delete(id: String) {
        val current = dao.getById(id)
        if (current != null) TimeReminderScheduler.cancel(appContext, current)
        dao.deleteById(id)
    }

    suspend fun markDelivered(id: String, nowMillis: Long, deliveryError: String? = null) {
        val current = dao.getById(id) ?: return
        if (!current.enabled) return
        dao.upsert(
            current.copy(
                enabled = false,
                lastTriggeredAt = nowMillis,
                updatedAt = nowMillis,
                scheduleError = deliveryError,
            ),
        )
    }

    suspend fun restoreEnabledReminders(): List<String> {
        val now = System.currentTimeMillis()
        val errors = mutableListOf<String>()
        for (reminder in dao.getEnabled()) {
            val scheduled = if (reminder.scheduledAt <= now) {
                reminder.copy(scheduledAt = now + MINIMUM_LEAD_TIME_MS, updatedAt = now)
            } else reminder
            val error = TimeReminderScheduler.schedule(appContext, scheduled)
            dao.upsert(scheduled.copy(scheduleError = error))
            if (error != null) errors += "${reminder.title}: $error"
        }
        return errors
    }

    suspend fun getById(id: String): TimeReminder? = dao.getById(id)

    private suspend fun nextNotificationId(): Int {
        val random = SecureRandom()
        repeat(20) {
            val candidate = random.nextInt(Int.MAX_VALUE - 1) + 1
            if (dao.countWithNotificationId(candidate) == 0) return candidate
        }
        var candidate = (System.currentTimeMillis() and 0x7fffffff).toInt().coerceAtLeast(1)
        while (dao.countWithNotificationId(candidate) > 0) candidate = if (candidate == Int.MAX_VALUE) 1 else candidate + 1
        return candidate
    }

    private companion object {
        const val MINIMUM_LEAD_TIME_MS = 5_000L
    }
}
