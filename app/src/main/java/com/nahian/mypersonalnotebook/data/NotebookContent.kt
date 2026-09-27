package com.nahian.mypersonalnotebook.data

import android.content.Context
import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Relation
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Upsert
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.nahian.mypersonalnotebook.reminders.ChecklistTaskDeadlineScheduler
import java.util.UUID
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "notebook_notes")
data class NotebookNote(
    @PrimaryKey val id: String,
    val title: String,
    val body: String,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(tableName = "notebook_checklists")
data class NotebookChecklist(
    @PrimaryKey val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
)

@Entity(
    tableName = "notebook_checklist_items",
    foreignKeys = [
        ForeignKey(
            entity = NotebookChecklist::class,
            parentColumns = ["id"],
            childColumns = ["checklistId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["checklistId"])],
)
data class NotebookChecklistItem(
    @PrimaryKey val id: String,
    val checklistId: String,
    val text: String,
    val isChecked: Boolean,
    val createdAt: Long,
    val deadlineAt: Long? = null,
    val countdownDurationMillis: Long? = null,
    val countdownStartedAt: Long? = null,
)

data class ChecklistWithItems(
    @Embedded val checklist: NotebookChecklist,
    @Relation(parentColumn = "id", entityColumn = "checklistId")
    val items: List<NotebookChecklistItem>,
) {
    val completedCount: Int get() = items.count { it.isChecked }
    val remainingCount: Int get() = items.size - completedCount
}

@androidx.room.Dao
abstract class NotebookContentDao {
    @Query("SELECT * FROM notebook_notes ORDER BY updatedAt DESC")
    abstract fun observeNotes(): Flow<List<NotebookNote>>

    @Query("SELECT * FROM notebook_notes ORDER BY updatedAt DESC LIMIT :limit")
    abstract fun observeRecentNotes(limit: Int): Flow<List<NotebookNote>>

    @Query("SELECT * FROM notebook_notes WHERE id = :id LIMIT 1")
    abstract suspend fun getNote(id: String): NotebookNote?

    @Upsert
    abstract suspend fun upsertNote(note: NotebookNote)

    @Query("DELETE FROM notebook_notes WHERE id = :id")
    abstract suspend fun deleteNote(id: String)

    @Transaction
    @Query("SELECT * FROM notebook_checklists ORDER BY updatedAt DESC")
    abstract fun observeChecklists(): Flow<List<ChecklistWithItems>>

    @Query("SELECT * FROM notebook_checklists ORDER BY updatedAt DESC")
    abstract fun observeChecklistHeaders(): Flow<List<NotebookChecklist>>

    @Query("SELECT * FROM notebook_checklists WHERE id = :id LIMIT 1")
    abstract suspend fun getChecklist(id: String): NotebookChecklist?

    @Upsert
    abstract suspend fun upsertChecklist(checklist: NotebookChecklist)

    @Query("UPDATE notebook_checklists SET updatedAt = :updatedAt WHERE id = :id")
    abstract suspend fun touchChecklist(id: String, updatedAt: Long)

    @Query("DELETE FROM notebook_checklists WHERE id = :id")
    abstract suspend fun deleteChecklist(id: String)

    @Query("SELECT * FROM notebook_checklist_items WHERE checklistId = :checklistId ORDER BY createdAt ASC")
    abstract suspend fun getChecklistItems(checklistId: String): List<NotebookChecklistItem>

    @Query("SELECT * FROM notebook_checklist_items WHERE id = :id LIMIT 1")
    abstract suspend fun getChecklistItem(id: String): NotebookChecklistItem?

    @Query("SELECT * FROM notebook_checklist_items")
    abstract suspend fun getAllChecklistItems(): List<NotebookChecklistItem>

    @Upsert
    abstract suspend fun upsertChecklistItem(item: NotebookChecklistItem)

    @Query("UPDATE notebook_checklist_items SET isChecked = :isChecked WHERE id = :id")
    abstract suspend fun setItemChecked(id: String, isChecked: Boolean)

    @Query("DELETE FROM notebook_checklist_items WHERE id = :id")
    abstract suspend fun deleteChecklistItem(id: String)
}

@androidx.room.Database(
    entities = [NotebookNote::class, NotebookChecklist::class, NotebookChecklistItem::class],
    version = 2,
    exportSchema = true,
)
abstract class NotebookContentDatabase : RoomDatabase() {
    abstract fun dao(): NotebookContentDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE notebook_checklist_items ADD COLUMN deadlineAt INTEGER")
                database.execSQL("ALTER TABLE notebook_checklist_items ADD COLUMN countdownDurationMillis INTEGER")
                database.execSQL("ALTER TABLE notebook_checklist_items ADD COLUMN countdownStartedAt INTEGER")
            }
        }

        @Volatile
        private var instance: NotebookContentDatabase? = null

        fun get(context: Context): NotebookContentDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                NotebookContentDatabase::class.java,
                "notebook_content.db",
            )
                // Keep notes and checklist data when adding per-task timing fields.
                .addMigrations(MIGRATION_1_2)
                .build()
                .also { instance = it }
        }
    }
}

class NotebookContentRepository(context: Context) {
    private val appContext = context.applicationContext
    private val dao = NotebookContentDatabase.get(appContext).dao()

    fun observeNotes(): Flow<List<NotebookNote>> = dao.observeNotes()

    fun observeRecentNotes(limit: Int = 3): Flow<List<NotebookNote>> = dao.observeRecentNotes(limit)

    fun observeChecklists(): Flow<List<ChecklistWithItems>> = dao.observeChecklists()

    fun observeChecklistHeaders(): Flow<List<NotebookChecklist>> = dao.observeChecklistHeaders()

    suspend fun saveNote(id: String?, title: String, body: String): ContentResult {
        val cleanTitle = title.trim()
        val cleanBody = body.trim()
        if (cleanTitle.isEmpty() && cleanBody.isEmpty()) return ContentResult.Error("Write a title or some note text first.")
        val old = if (id == null) null else dao.getNote(id)
        val now = System.currentTimeMillis()
        dao.upsertNote(
            NotebookNote(
                id = old?.id ?: id ?: UUID.randomUUID().toString(),
                title = cleanTitle,
                body = cleanBody,
                createdAt = old?.createdAt ?: now,
                updatedAt = now,
            ),
        )
        return ContentResult.Success
    }

    suspend fun deleteNote(id: String) = dao.deleteNote(id)

    suspend fun createChecklist(title: String): ContentResult {
        val cleanTitle = title.trim()
        if (cleanTitle.isEmpty()) return ContentResult.Error("Give the checklist a name.")
        val now = System.currentTimeMillis()
        dao.upsertChecklist(NotebookChecklist(UUID.randomUUID().toString(), cleanTitle, now, now))
        return ContentResult.Success
    }

    suspend fun renameChecklist(id: String, title: String): ContentResult {
        val cleaned = title.trim()
        if (cleaned.isEmpty()) return ContentResult.Error("Give the checklist a name.")
        val existing = dao.getChecklist(id) ?: return ContentResult.Error("This checklist no longer exists.")
        dao.upsertChecklist(existing.copy(title = cleaned, updatedAt = System.currentTimeMillis()))
        return ContentResult.Success
    }

    suspend fun deleteChecklist(id: String) {
        dao.getChecklistItems(id).forEach { ChecklistTaskDeadlineScheduler.cancel(appContext, it.id) }
        dao.deleteChecklist(id)
    }

    suspend fun updateChecklistItem(
        checklistId: String,
        itemId: String,
        text: String,
        timeLimit: ChecklistTaskTimeLimit,
    ): ContentResult {
        val cleaned = text.trim()
        if (cleaned.isEmpty()) return ContentResult.Error("Write a checklist item first.")
        if (!timeLimit.isValid()) return ContentResult.Error("Choose one valid task time limit.")
        val existingList = dao.getChecklist(checklistId) ?: return ContentResult.Error("This checklist no longer exists.")
        val existingItem = dao.getChecklistItem(itemId)?.takeIf { it.checklistId == checklistId }
            ?: return ContentResult.Error("This checklist item no longer exists.")
        val now = System.currentTimeMillis()
        val countdownStartedAt = when {
            timeLimit.countdownDurationMillis == null || !timeLimit.startCountdownWhenSaved -> null
            existingItem.countdownStartedAt != null &&
                existingItem.countdownDurationMillis == timeLimit.countdownDurationMillis -> existingItem.countdownStartedAt
            else -> now
        }
        val updatedItem = existingItem.copy(
            text = cleaned,
            deadlineAt = timeLimit.deadlineAt,
            countdownDurationMillis = timeLimit.countdownDurationMillis,
            countdownStartedAt = countdownStartedAt,
        )
        dao.upsertChecklistItem(updatedItem)
        dao.touchChecklist(existingList.id, now)
        if (updatedItem.isChecked) ChecklistTaskDeadlineScheduler.cancel(appContext, itemId)
        else ChecklistTaskDeadlineScheduler.schedule(appContext, updatedItem)
        return ContentResult.Success
    }

    suspend fun addChecklistItem(
        checklistId: String,
        text: String,
        timeLimit: ChecklistTaskTimeLimit = ChecklistTaskTimeLimit.None,
    ): ContentResult {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) return ContentResult.Error("Write a checklist item first.")
        if (!timeLimit.isValid()) return ContentResult.Error("Choose one valid task time limit.")
        if (dao.getChecklist(checklistId) == null) return ContentResult.Error("This checklist no longer exists.")
        val now = System.currentTimeMillis()
        val item = NotebookChecklistItem(
            id = UUID.randomUUID().toString(),
            checklistId = checklistId,
            text = cleanText,
            isChecked = false,
            createdAt = now,
            deadlineAt = timeLimit.deadlineAt,
            countdownDurationMillis = timeLimit.countdownDurationMillis,
            countdownStartedAt = if (timeLimit.startCountdownWhenSaved) now else null,
        )
        dao.upsertChecklistItem(item)
        dao.touchChecklist(checklistId, now)
        ChecklistTaskDeadlineScheduler.schedule(appContext, item)
        return ContentResult.Success
    }

    suspend fun setChecklistItemChecked(checklistId: String, itemId: String, isChecked: Boolean) {
        val item = dao.getChecklistItem(itemId)?.takeIf { it.checklistId == checklistId } ?: return
        dao.setItemChecked(itemId, isChecked)
        dao.touchChecklist(checklistId, System.currentTimeMillis())
        if (isChecked) ChecklistTaskDeadlineScheduler.cancel(appContext, itemId)
        else ChecklistTaskDeadlineScheduler.schedule(appContext, item.copy(isChecked = false))
    }

    suspend fun startChecklistItemCountdown(checklistId: String, itemId: String): ContentResult {
        val item = dao.getChecklistItem(itemId)?.takeIf { it.checklistId == checklistId }
            ?: return ContentResult.Error("This checklist item no longer exists.")
        if (item.isChecked) return ContentResult.Error("Complete tasks do not need a countdown.")
        if (item.countdownDurationMillis == null) return ContentResult.Error("This task has no countdown time limit.")
        if (item.countdownStartedAt != null) return ContentResult.Success
        val startedItem = item.copy(countdownStartedAt = System.currentTimeMillis())
        dao.upsertChecklistItem(startedItem)
        dao.touchChecklist(checklistId, System.currentTimeMillis())
        ChecklistTaskDeadlineScheduler.schedule(appContext, startedItem)
        return ContentResult.Success
    }

    suspend fun deleteChecklistItem(checklistId: String, itemId: String) {
        ChecklistTaskDeadlineScheduler.cancel(appContext, itemId)
        dao.deleteChecklistItem(itemId)
        dao.touchChecklist(checklistId, System.currentTimeMillis())
    }

    suspend fun restoreChecklistTaskDeadlineAlarms() {
        ChecklistTaskDeadlineScheduler.restoreAll(appContext)
    }

}

sealed interface ContentResult {
    data object Success : ContentResult
    data class Error(val message: String) : ContentResult
}
