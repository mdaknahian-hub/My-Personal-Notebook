package com.nahian.mypersonalnotebook.ui

import android.content.Context

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
)

internal object NotebookAppSettingsStore {
    private const val PREFERENCES = "notebook_preferences"
    private const val PROFILE_NAME_KEY = "profile_name"
    private const val THEME_MODE_KEY = "theme_mode"

    @Volatile
    var profileName: String = ""
        private set

    @Volatile
    var themeMode: NotebookThemeMode = NotebookThemeMode.DARK
        private set

    fun load(context: Context): NotebookAppSettings {
        val preferences = context.applicationContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
        profileName = preferences.getString(PROFILE_NAME_KEY, "").orEmpty()
        themeMode = NotebookThemeMode.fromPreference(preferences.getString(THEME_MODE_KEY, NotebookThemeMode.DARK.preferenceValue))
        return NotebookAppSettings(profileName, themeMode)
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
}
