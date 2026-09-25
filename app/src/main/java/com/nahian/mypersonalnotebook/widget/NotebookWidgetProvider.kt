package com.nahian.mypersonalnotebook.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.nahian.mypersonalnotebook.R
import com.nahian.mypersonalnotebook.ui.MainActivity
import com.nahian.mypersonalnotebook.ui.NotebookLanguageSettings
import com.nahian.mypersonalnotebook.ui.uiText

class NotebookWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { id -> updateWidget(context, manager, id) }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, NotebookWidgetProvider::class.java))
        onUpdate(context, manager, ids)
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        NotebookLanguageSettings.load(context)
        val views = RemoteViews(context.packageName, R.layout.widget_notebook)
        views.setTextViewText(R.id.widget_title, uiText("NAHIAN'S NOTEBOOK"))
        views.setTextViewText(R.id.widget_subtitle, uiText("Your notes and reminders"))
        views.setTextViewText(R.id.widget_summary, uiText("Summary"))
        views.setTextViewText(R.id.widget_notes, uiText("Notes"))
        views.setTextViewText(R.id.widget_checklists, uiText("Checklists"))
        views.setTextViewText(R.id.widget_reminders, uiText("Reminders"))
        views.setOnClickPendingIntent(R.id.widget_summary, sectionIntent(context, SECTION_SUMMARY, 1))
        views.setOnClickPendingIntent(R.id.widget_notes, sectionIntent(context, SECTION_NOTES, 2))
        views.setOnClickPendingIntent(R.id.widget_checklists, sectionIntent(context, SECTION_CHECKLISTS, 3))
        views.setOnClickPendingIntent(R.id.widget_reminders, sectionIntent(context, SECTION_TIME_REMINDERS, 4))
        manager.updateAppWidget(widgetId, views)
    }

    private fun sectionIntent(context: Context, section: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
            .setAction("com.nahian.mypersonalnotebook.OPEN_WIDGET_${section.uppercase()}")
            .putExtra(MainActivity.EXTRA_OPEN_SECTION, section)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    companion object {
        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, NotebookWidgetProvider::class.java))
            if (ids.isNotEmpty()) NotebookWidgetProvider().onUpdate(context, manager, ids)
        }

        private const val SECTION_SUMMARY = "summary"
        private const val SECTION_NOTES = "notes"
        private const val SECTION_CHECKLISTS = "checklists"
        private const val SECTION_TIME_REMINDERS = "time_reminders"
    }
}
