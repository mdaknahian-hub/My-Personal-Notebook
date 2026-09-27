package com.nahian.mypersonalnotebook.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.sp

internal enum class NotebookNoteAlignment(val storedValue: String, val textAlign: TextAlign) {
    LEFT("left", TextAlign.Start),
    CENTER("center", TextAlign.Center),
    RIGHT("right", TextAlign.End);

    companion object {
        fun fromStored(value: String?): NotebookNoteAlignment = entries.firstOrNull { it.storedValue == value } ?: LEFT
    }
}

internal enum class NotebookNoteFont(val storedValue: String, val family: FontFamily) {
    SANS("sans", FontFamily.SansSerif),
    SERIF("serif", FontFamily.Serif),
    MONO("mono", FontFamily.Monospace);

    companion object {
        fun fromStored(value: String?): NotebookNoteFont = entries.firstOrNull { it.storedValue == value } ?: SANS
    }
}

internal data class NotebookNoteDocument(
    val text: String,
    val alignment: NotebookNoteAlignment = NotebookNoteAlignment.LEFT,
    val font: NotebookNoteFont = NotebookNoteFont.SANS,
)

private const val NOTE_METADATA_PREFIX = "[[NAHIAN_NOTE_V1|"
private const val NOTE_METADATA_END = "]]\n"

internal fun encodeNotebookNote(document: NotebookNoteDocument): String =
    "$NOTE_METADATA_PREFIX${document.alignment.storedValue}|${document.font.storedValue}$NOTE_METADATA_END${document.text}"

internal fun decodeNotebookNote(value: String): NotebookNoteDocument {
    if (!value.startsWith(NOTE_METADATA_PREFIX)) return NotebookNoteDocument(value)
    val endIndex = value.indexOf(NOTE_METADATA_END)
    if (endIndex < 0) return NotebookNoteDocument(value)
    val metadata = value.substring(NOTE_METADATA_PREFIX.length, endIndex).split('|', limit = 2)
    if (metadata.size != 2) return NotebookNoteDocument(value)
    return NotebookNoteDocument(
        text = value.substring(endIndex + NOTE_METADATA_END.length),
        alignment = NotebookNoteAlignment.fromStored(metadata[0]),
        font = NotebookNoteFont.fromStored(metadata[1]),
    )
}

internal fun renderNotebookNote(value: String): AnnotatedString {
    val document = decodeNotebookNote(value)
    val lines = document.text.lines()
    return buildAnnotatedString {
        lines.forEachIndexed { index, rawLine ->
            val (line, headingSize) = when {
                rawLine.startsWith("# ") -> rawLine.removePrefix("# ") to 24
                rawLine.startsWith("## ") -> rawLine.removePrefix("## ") to 20
                rawLine.startsWith("### ") -> rawLine.removePrefix("### ") to 18
                else -> rawLine to null
            }
            val bulletLine = line.startsWith("- ") || line.startsWith("• ")
            val visibleLine = if (bulletLine) "• ${line.drop(2)}" else line
            val start = length
            appendInlineMarkup(visibleLine)
            if (headingSize != null && start < length) {
                addStyle(
                    SpanStyle(fontSize = headingSize.sp, fontWeight = FontWeight.Bold),
                    start,
                    length,
                )
            }
            if (index < lines.lastIndex) append('\n')
        }
    }
}

private fun AnnotatedString.Builder.appendInlineMarkup(text: String) {
    val tokens = listOf("**" to SpanStyle(fontWeight = FontWeight.Bold), "__" to SpanStyle(textDecoration = TextDecoration.Underline), "==" to SpanStyle(background = Color(0x66E2C47F)), "~~" to SpanStyle(textDecoration = TextDecoration.LineThrough), "*" to SpanStyle(fontStyle = androidx.compose.ui.text.font.FontStyle.Italic))
    var index = 0
    while (index < text.length) {
        val token = tokens.firstOrNull { (marker, _) -> text.startsWith(marker, index) && text.indexOf(marker, index + marker.length) >= 0 }
        if (token == null) {
            append(text[index])
            index++
        } else {
            val (marker, style) = token
            val close = text.indexOf(marker, index + marker.length)
            val start = length
            append(text.substring(index + marker.length, close))
            if (start < length) addStyle(style, start, length)
            index = close + marker.length
        }
    }
}
