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

    @Upsert
    abstract suspend fun upsertChecklistItem(item: NotebookChecklistItem)

    @Query("UPDATE notebook_checklist_items SET isChecked = :isChecked WHERE id = :id")
    abstract suspend fun setItemChecked(id: String, isChecked: Boolean)

    @Query("DELETE FROM notebook_checklist_items WHERE id = :id")
    abstract suspend fun deleteChecklistItem(id: String)
}

@androidx.room.Database(
    entities = [NotebookNote::class, NotebookChecklist::class, NotebookChecklistItem::class],
    version = 1,
    exportSchema = true,
)
abstract class NotebookContentDatabase : RoomDatabase() {
    abstract fun dao(): NotebookContentDao

    companion object {
        @Volatile
        private var instance: NotebookContentDatabase? = null

        fun get(context: Context): NotebookContentDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                NotebookContentDatabase::class.java,
                "notebook_content.db",
            ).build().also { instance = it }
        }
    }
}

class NotebookContentRepository(context: Context) {
    private val dao = NotebookContentDatabase.get(context).dao()

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

    suspend fun deleteChecklist(id: String) = dao.deleteChecklist(id)

    suspend fun addChecklistItem(checklistId: String, text: String): ContentResult {
        val cleanText = text.trim()
        if (cleanText.isEmpty()) return ContentResult.Error("Write a checklist item first.")
        if (dao.getChecklist(checklistId) == null) return ContentResult.Error("This checklist no longer exists.")
        val now = System.currentTimeMillis()
        dao.upsertChecklistItem(
            NotebookChecklistItem(
                id = UUID.randomUUID().toString(),
                checklistId = checklistId,
                text = cleanText,
                isChecked = false,
                createdAt = now,
            ),
        )
        dao.touchChecklist(checklistId, now)
        return ContentResult.Success
    }

    suspend fun setChecklistItemChecked(checklistId: String, itemId: String, isChecked: Boolean) {
        dao.setItemChecked(itemId, isChecked)
        dao.touchChecklist(checklistId, System.currentTimeMillis())
    }

    suspend fun deleteChecklistItem(checklistId: String, itemId: String) {
        dao.deleteChecklistItem(itemId)
        dao.touchChecklist(checklistId, System.currentTimeMillis())
    }
}

sealed interface ContentResult {
    data object Success : ContentResult
    data class Error(val message: String) : ContentResult
}
