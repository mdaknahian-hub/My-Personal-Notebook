package com.nahian.mypersonalnotebook

import android.app.Application
import com.nahian.mypersonalnotebook.notifications.ReminderNotifications
import com.nahian.mypersonalnotebook.notifications.TimeReminderNotifications
import com.nahian.mypersonalnotebook.ui.NotebookLanguageSettings

class NotebookApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        NotebookLanguageSettings.load(this)
        ReminderNotifications.ensureChannel(this)
        TimeReminderNotifications.ensureChannel(this)
    }
}
