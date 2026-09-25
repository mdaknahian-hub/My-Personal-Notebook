package com.nahian.mypersonalnotebook

import android.app.Application
import com.nahian.mypersonalnotebook.notifications.ReminderNotifications
import com.nahian.mypersonalnotebook.notifications.TimeReminderNotifications

class NotebookApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ReminderNotifications.ensureChannel(this)
        TimeReminderNotifications.ensureChannel(this)
    }
}
