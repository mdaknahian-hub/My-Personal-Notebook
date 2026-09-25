package com.nahian.mypersonalnotebook.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotebookVoiceCommandsTest {
    @Test
    fun recognizesEnglishNavigationPhrases() {
        assertEquals(NotebookVoiceDestination.SUMMARY, NotebookVoiceCommands.destinationFor("Open the home"))
        assertEquals(NotebookVoiceDestination.NOTES, NotebookVoiceCommands.destinationFor("Please open notes"))
        assertEquals(NotebookVoiceDestination.CHECKLISTS, NotebookVoiceCommands.destinationFor("show checklists"))
        assertEquals(NotebookVoiceDestination.TIME_REMINDERS, NotebookVoiceCommands.destinationFor("go to time reminders"))
        assertEquals(NotebookVoiceDestination.LOCATION_REMINDERS, NotebookVoiceCommands.destinationFor("open location reminders"))
        assertEquals(NotebookVoiceDestination.SETTINGS, NotebookVoiceCommands.destinationFor("open settings"))
    }

    @Test
    fun recognizesBanglaNavigationPhrases() {
        assertEquals(NotebookVoiceDestination.SUMMARY, NotebookVoiceCommands.destinationFor("সারসংক্ষেপ খুলুন"))
        assertEquals(NotebookVoiceDestination.NOTES, NotebookVoiceCommands.destinationFor("নোট খুলুন"))
        assertEquals(NotebookVoiceDestination.CHECKLISTS, NotebookVoiceCommands.destinationFor("চেকলিস্ট দেখাও"))
        assertEquals(NotebookVoiceDestination.TIME_REMINDERS, NotebookVoiceCommands.destinationFor("সময়ভিত্তিক রিমাইন্ডার খুলুন"))
        assertEquals(NotebookVoiceDestination.LOCATION_REMINDERS, NotebookVoiceCommands.destinationFor("লোকেশন রিমাইন্ডার খুলুন"))
        assertEquals(NotebookVoiceDestination.SETTINGS, NotebookVoiceCommands.destinationFor("সেটিংস খুলুন"))
    }

    @Test
    fun ignoresUnknownOrEmptyCommands() {
        assertNull(NotebookVoiceCommands.destinationFor(""))
        assertNull(NotebookVoiceCommands.destinationFor("write a new note"))
        assertNull(NotebookVoiceCommands.destinationFor("weather today"))
    }
}
