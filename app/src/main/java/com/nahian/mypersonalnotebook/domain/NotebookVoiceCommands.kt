package com.nahian.mypersonalnotebook.domain

/** Destinations accepted by the app's on-device navigation voice commands. */
enum class NotebookVoiceDestination {
    SUMMARY,
    NOTES,
    CHECKLISTS,
    REMINDERS,
    TIME_REMINDERS,
    LOCATION_REMINDERS,
    SETTINGS,
}

object NotebookVoiceCommands {
    private val punctuation = Regex("[?!,.।]+")
    private val whitespace = Regex("\\s+")

    private val aliases = mapOf(
        NotebookVoiceDestination.SUMMARY to setOf("summary", "home", "dashboard", "সারাংশ", "সারসংক্ষেপ", "হোম", "মূল পাতা"),
        NotebookVoiceDestination.NOTES to setOf("notes", "notebook", "নোট", "নোটবুক"),
        NotebookVoiceDestination.CHECKLISTS to setOf("checklists", "checklist", "lists", "চেকলিস্ট", "তালিকা", "তালিকাগুলো"),
        NotebookVoiceDestination.REMINDERS to setOf("reminders", "রিমাইন্ডার", "রিমাইন্ডারগুলো"),
        NotebookVoiceDestination.TIME_REMINDERS to setOf(
            "time reminders", "scheduled reminders", "সময়ভিত্তিক রিমাইন্ডার", "সময়ভিত্তিক রিমাইন্ডার",
            "সময় রিমাইন্ডার", "সময় রিমাইন্ডার", "নির্ধারিত রিমাইন্ডার",
        ),
        NotebookVoiceDestination.LOCATION_REMINDERS to setOf(
            "location reminders", "place reminders", "অবস্থানভিত্তিক রিমাইন্ডার", "অবস্থান রিমাইন্ডার",
            "লোকেশন রিমাইন্ডার", "জিওফেন্স",
        ),
        NotebookVoiceDestination.SETTINGS to setOf("settings", "profile", "সেটিংস", "প্রোফাইল"),
    )

    fun destinationFor(transcript: String): NotebookVoiceDestination? {
        var command = transcript.trim().lowercase().replace(punctuation, " ").replace(whitespace, " ").trim()
        if (command.isEmpty()) return null

        val prefixes = listOf("please ", "open ", "go to ", "show me ", "show ", "navigate to ", "খুলুন ", "দেখান ", "যান ")
        repeat(2) {
            val prefix = prefixes.firstOrNull { prefix -> command.startsWith(prefix) }
            if (prefix != null) command = command.removePrefix(prefix).trim()
        }
        command = command
            .removePrefix("the ")
            .removeSuffix(" please")
            .removeSuffix(" খুলুন")
            .removeSuffix(" দেখান")
            .removeSuffix(" দেখাও")
            .removeSuffix(" এ যান")
            .removeSuffix("-এ যান")
            .trim()

        return aliases.entries.firstOrNull { (_, phrases) -> command in phrases }?.key
    }
}
