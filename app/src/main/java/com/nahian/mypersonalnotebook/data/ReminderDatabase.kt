package com.nahian.mypersonalnotebook.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Upsert
import com.nahian.mypersonalnotebook.domain.ReminderRules
import kotlinx.coroutines.flow.Flow

@Dao
abstract class ReminderDao {
    @Query("SELECT * FROM location_reminders ORDER BY enabled DESC, createdAt DESC")
    abstract fun observeAll(): Flow<List<LocationReminder>>

    @Query("SELECT * FROM location_reminders WHERE id = :id LIMIT 1")
    abstract suspend fun getById(id: String): LocationReminder?

    @Query("SELECT * FROM location_reminders WHERE enabled = 1 ORDER BY createdAt ASC")
    abstract suspend fun getEnabled(): List<LocationReminder>

    @Query("SELECT COUNT(*) FROM location_reminders WHERE enabled = 1")
    abstract suspend fun countEnabled(): Int

    @Query("UPDATE location_reminders SET registered = 0, registrationError = :error WHERE enabled = 1")
    abstract suspend fun markEnabledUnregistered(error: String)

    @Upsert
    abstract suspend fun upsert(reminder: LocationReminder)

    @Query("DELETE FROM location_reminders WHERE id = :id")
    abstract suspend fun deleteById(id: String)

    @Query("SELECT COUNT(*) FROM location_reminders WHERE notificationId = :notificationId")
    abstract suspend fun countWithNotificationId(notificationId: Int): Int

    @Transaction
    open suspend fun updateRegistrationState(id: String, registered: Boolean, error: String?) {
        val current = getById(id) ?: return
        val isStillEnabled = current.enabled
        upsert(
            current.copy(
                registered = isStillEnabled && registered,
                registrationError = if (isStillEnabled) error else current.registrationError,
            ),
        )
    }

    /** Atomically gate and record a geofence delivery before a notification is shown. */
    @Transaction
    open suspend fun claimTrigger(id: String, entering: Boolean, nowMillis: Long): LocationReminder? {
        val current = getById(id) ?: return null
        if (!current.registered || !ReminderRules.mayTrigger(current, entering, nowMillis)) return null
        val isOnce = current.recurrenceType == RecurrenceType.ONCE.storageValue
        val updated = current.copy(
            enabled = !isOnce,
            registered = !isOnce,
            registrationError = null,
            updatedAt = nowMillis,
            lastTriggeredAt = nowMillis,
            lastTransitionType = if (entering) "ENTER" else "EXIT",
        )
        upsert(updated)
        return updated
    }
}

@Dao
interface SavedLocationDao {
    @Query("SELECT * FROM saved_locations ORDER BY label COLLATE NOCASE ASC")
    fun observeAll(): Flow<List<SavedLocation>>

    @Upsert
    suspend fun upsert(location: SavedLocation)

    @Query("DELETE FROM saved_locations WHERE id = :id")
    suspend fun deleteById(id: Long)
}

@Database(
    entities = [LocationReminder::class, SavedLocation::class],
    version = 1,
    exportSchema = true,
)
abstract class ReminderDatabase : RoomDatabase() {
    abstract fun reminderDao(): ReminderDao
    abstract fun savedLocationDao(): SavedLocationDao

    companion object {
        @Volatile
        private var instance: ReminderDatabase? = null

        fun get(context: Context): ReminderDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                ReminderDatabase::class.java,
                "personal_notebook.db",
            )
                // Never use destructive migrations here: reminder data must survive app updates.
                .build()
                .also { instance = it }
        }
    }
}
