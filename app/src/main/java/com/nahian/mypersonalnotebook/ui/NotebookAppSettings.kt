package com.nahian.mypersonalnotebook.ui

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File

internal enum class NotebookThemeMode(val preferenceValue: String) {
    DARK("dark"),
    LIGHT("light"),
    SYSTEM("system");

    companion object {
        fun fromPreference(value: String?): NotebookThemeMode = entries.firstOrNull { it.preferenceValue == value } ?: DARK
    }
}

internal data class NotebookAppSettings(
    val profileName: String,
    val themeMode: NotebookThemeMode,
    val profilePhotoPath: String?,
)

internal object NotebookAppSettingsStore {
    private const val PREFERENCES = "notebook_preferences"
    private const val PROFILE_NAME_KEY = "profile_name"
    private const val THEME_MODE_KEY = "theme_mode"
    private const val PROFILE_PHOTO_KEY = "profile_photo"
    private const val PROFILE_PHOTO_FILE = "profile_photo.jpg"

    @Volatile
    var profileName: String = ""
        private set

    @Volatile
    var themeMode: NotebookThemeMode = NotebookThemeMode.DARK
        private set

    @Volatile
    var profilePhotoPath: String? = null
        private set

    fun load(context: Context): NotebookAppSettings {
        val appContext = context.applicationContext
        val preferences = appContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        profileName = preferences.getString(PROFILE_NAME_KEY, "").orEmpty()
        themeMode = NotebookThemeMode.fromPreference(preferences.getString(THEME_MODE_KEY, NotebookThemeMode.DARK.preferenceValue))
        profilePhotoPath = File(appContext.filesDir, PROFILE_PHOTO_FILE).takeIf { it.isFile }?.absolutePath
        return NotebookAppSettings(profileName, themeMode, profilePhotoPath)
    }

    fun saveProfileName(context: Context, name: String) {
        val cleaned = name.trim().take(40)
        profileName = cleaned
        context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(PROFILE_NAME_KEY, cleaned)
            .apply()
    }

    fun saveThemeMode(context: Context, mode: NotebookThemeMode) {
        themeMode = mode
        context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(THEME_MODE_KEY, mode.preferenceValue)
            .apply()
    }

    fun saveProfilePhoto(context: Context, uri: Uri?): String? {
        val appContext = context.applicationContext
        val file = File(appContext.filesDir, PROFILE_PHOTO_FILE)
        val preferences = appContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        if (uri == null) {
            if (file.exists() && !file.delete()) error("The profile photo could not be removed.")
            preferences.edit().remove(PROFILE_PHOTO_KEY).apply()
            profilePhotoPath = null
            return null
        }
        val temporaryFile = File(appContext.filesDir, "$PROFILE_PHOTO_FILE.tmp")
        try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            val boundsStream = appContext.contentResolver.openInputStream(uri) ?: error("The selected photo could not be opened.")
            boundsStream.use { BitmapFactory.decodeStream(it, null, bounds) }
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) error("The selected photo could not be decoded.")
            val largestDimension = maxOf(bounds.outWidth, bounds.outHeight)
            var sampleSize = 1
            while (largestDimension / sampleSize > 1024) sampleSize *= 2
            val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = appContext.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
                ?: error("The selected photo could not be decoded.")
            try {
                temporaryFile.outputStream().use { destination ->
                    if (!bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 84, destination)) {
                        error("The profile photo could not be compressed.")
                    }
                }
            } finally {
                bitmap.recycle()
            }
            if (file.exists() && !file.delete()) error("The previous profile photo could not be replaced.")
            if (!temporaryFile.renameTo(file)) error("The profile photo could not be saved on this device.")
        } catch (exception: Exception) {
            temporaryFile.delete()
            throw exception
        }
        preferences.edit().putString(PROFILE_PHOTO_KEY, PROFILE_PHOTO_FILE).apply()
        profilePhotoPath = file.absolutePath
        return file.absolutePath
    }
}
