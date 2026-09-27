package com.nahian.mypersonalnotebook.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class NotebookRichTextTest {
    @Test
    fun legacyPlainNotesRemainReadable() {
        val document = decodeNotebookNote("An older note\nwith two lines")
        assertEquals("An older note\nwith two lines", document.text)
        assertEquals(NotebookNoteAlignment.LEFT, document.alignment)
        assertEquals(NotebookNoteFont.SANS, document.font)
    }

    @Test
    fun formattingPreferencesRoundTripWithoutDatabaseMigration() {
        val original = NotebookNoteDocument(
            text = "# Heading\n**Bold** and ==highlight==",
            alignment = NotebookNoteAlignment.CENTER,
            font = NotebookNoteFont.SERIF,
        )
        assertEquals(original, decodeNotebookNote(encodeNotebookNote(original)))
    }

    @Test
    fun previewRendersMarkupWithoutShowingFormattingMarkers() {
        val preview = renderNotebookNote("## Heading\n**Bold** *italic* __underlined__ ==marked== ~~struck~~")
        assertEquals("Heading\nBold italic underlined marked struck", preview.text)
    }
}
