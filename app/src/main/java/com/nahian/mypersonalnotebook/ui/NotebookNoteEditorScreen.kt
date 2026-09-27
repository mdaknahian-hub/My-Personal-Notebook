package com.nahian.mypersonalnotebook.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotebookNoteEditorScreen(
    noteKey: String,
    title: String,
    serializedBody: String,
    saveStatus: String,
    onTitleChange: (String) -> Unit,
    onBodyChange: (String) -> Unit,
    onCopy: () -> Unit,
    onClose: () -> Unit,
) {
    val initialDocument = remember(noteKey) { decodeNotebookNote(serializedBody) }
    var document by remember(noteKey) { mutableStateOf(initialDocument) }
    var bodyValue by remember(noteKey) { mutableStateOf(TextFieldValue(initialDocument.text)) }

    fun publishDocument(next: NotebookNoteDocument) {
        document = next
        onBodyChange(encodeNotebookNote(next))
    }

    fun wrapSelection(prefix: String, suffix: String) {
        val text = bodyValue.text
        val start = bodyValue.selection.min.coerceIn(0, text.length)
        val end = bodyValue.selection.max.coerceIn(start, text.length)
        val selected = text.substring(start, end)
        val updated = text.replaceRange(start, end, prefix + selected + suffix)
        val selection = if (start == end) {
            TextRange(start + prefix.length)
        } else {
            TextRange(start + prefix.length, start + prefix.length + selected.length)
        }
        bodyValue = TextFieldValue(AnnotatedString(updated), selection)
        publishDocument(document.copy(text = updated))
    }

    fun prefixCurrentLine(prefix: String) {
        val text = bodyValue.text
        val cursor = bodyValue.selection.start.coerceIn(0, text.length)
        val lineStart = text.lastIndexOf('\n', (cursor - 1).coerceAtLeast(0)).let { if (it < 0) 0 else it + 1 }
        val existingPrefix = when {
            prefix.startsWith("#") -> listOf("### ", "## ", "# ").firstOrNull { text.startsWith(it, lineStart) }
            prefix == "- " && text.startsWith("- ", lineStart) -> "- "
            else -> null
        }
        val updated = when {
            existingPrefix == prefix -> text.removeRange(lineStart, lineStart + prefix.length)
            existingPrefix != null -> text.replaceRange(lineStart, lineStart + existingPrefix.length, prefix)
            else -> text.replaceRange(lineStart, lineStart, prefix)
        }
        val delta = when {
            existingPrefix == prefix -> -prefix.length
            existingPrefix != null -> prefix.length - existingPrefix.length
            else -> prefix.length
        }
        val newCursor = (cursor + if (cursor >= lineStart) delta else 0).coerceIn(0, updated.length)
        bodyValue = TextFieldValue(AnnotatedString(updated), TextRange(newCursor))
        publishDocument(document.copy(text = updated))
    }

    fun updateText(value: TextFieldValue) {
        bodyValue = value
        publishDocument(document.copy(text = value.text))
    }

    fun updateAlignment(alignment: NotebookNoteAlignment) = publishDocument(document.copy(alignment = alignment))
    fun updateFont(font: NotebookNoteFont) = publishDocument(document.copy(font = font))

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(uiText("Edit note"), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(uiText(saveStatus), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onClose) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = uiText("Back to notes")) }
                },
                actions = {
                    IconButton(onClick = onCopy) { Icon(Icons.Filled.ContentCopy, contentDescription = uiText("Copy note")) }
                    TextButton(onClick = onClose) { Text(uiText("Done")) }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = onTitleChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text(uiText("Note title")) },
                singleLine = true,
                textStyle = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            )
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = { prefixCurrentLine("# ") }) { Text("H1") }
                TextButton(onClick = { prefixCurrentLine("## ") }) { Text("H2") }
                TextButton(onClick = { wrapSelection("**", "**") }) { Text("B", fontWeight = FontWeight.Bold) }
                TextButton(onClick = { wrapSelection("*", "*") }) { Text("I", fontStyle = androidx.compose.ui.text.font.FontStyle.Italic) }
                TextButton(onClick = { wrapSelection("__", "__") }) { Text("U", textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline) }
                TextButton(onClick = { wrapSelection("==", "==") }) { Text(uiText("Highlight")) }
                TextButton(onClick = { wrapSelection("~~", "~~") }) { Text(uiText("Mark")) }
                TextButton(onClick = { prefixCurrentLine("- ") }) { Text("• ${uiText("List item")}") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
                FilterChip(selected = document.alignment == NotebookNoteAlignment.LEFT, onClick = { updateAlignment(NotebookNoteAlignment.LEFT) }, label = { Text(uiText("Left")) })
                FilterChip(selected = document.alignment == NotebookNoteAlignment.CENTER, onClick = { updateAlignment(NotebookNoteAlignment.CENTER) }, label = { Text(uiText("Center")) })
                FilterChip(selected = document.alignment == NotebookNoteAlignment.RIGHT, onClick = { updateAlignment(NotebookNoteAlignment.RIGHT) }, label = { Text(uiText("Right")) })
                FilterChip(selected = document.font == NotebookNoteFont.SANS, onClick = { updateFont(NotebookNoteFont.SANS) }, label = { Text(uiText("Sans")) })
                FilterChip(selected = document.font == NotebookNoteFont.SERIF, onClick = { updateFont(NotebookNoteFont.SERIF) }, label = { Text(uiText("Serif")) })
                FilterChip(selected = document.font == NotebookNoteFont.MONO, onClick = { updateFont(NotebookNoteFont.MONO) }, label = { Text(uiText("Mono")) })
            }
            OutlinedTextField(
                value = bodyValue,
                onValueChange = ::updateText,
                modifier = Modifier.weight(1f).fillMaxWidth(),
                label = { Text(uiText("Write your note")) },
                textStyle = TextStyle(
                    fontFamily = document.font.family,
                    textAlign = document.alignment.textAlign,
                    fontSize = MaterialTheme.typography.bodyLarge.fontSize,
                    lineHeight = MaterialTheme.typography.bodyLarge.lineHeight,
                ),
                minLines = 8,
            )
            Text(uiText("Formatting and text are saved automatically."), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
