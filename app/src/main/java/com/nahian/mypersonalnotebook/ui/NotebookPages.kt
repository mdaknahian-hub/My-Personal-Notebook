package com.nahian.mypersonalnotebook.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.nahian.mypersonalnotebook.data.ChecklistWithItems
import com.nahian.mypersonalnotebook.data.ContentResult
import com.nahian.mypersonalnotebook.data.NotebookChecklist
import com.nahian.mypersonalnotebook.data.NotebookContentRepository
import com.nahian.mypersonalnotebook.data.NotebookNote
import com.nahian.mypersonalnotebook.data.TimeReminderRepository
import kotlinx.coroutines.launch

private enum class NotebookSection {
    SUMMARY,
    REMINDERS,
    TIME_REMINDERS,
    CHECKLISTS,
    NOTES,
}

@Composable
internal fun NotebookAppRoot(
    locationRepository: com.nahian.mypersonalnotebook.data.LocationReminderRepository,
    contentRepository: NotebookContentRepository,
    timeReminderRepository: TimeReminderRepository,
    initialReminderId: String? = null,
) {
    var section by remember(initialReminderId) {
        mutableStateOf(if (initialReminderId == null) NotebookSection.SUMMARY else NotebookSection.REMINDERS)
    }
    val reminders by locationRepository.observeReminders().collectAsState(initial = emptyList())
    val recentNotes by contentRepository.observeRecentNotes().collectAsState(initial = emptyList())
    val checklists by contentRepository.observeChecklists().collectAsState(initial = emptyList())
    val timeReminders by timeReminderRepository.observeAll().collectAsState(initial = emptyList())

    when (section) {
        NotebookSection.SUMMARY -> NotebookSummaryScreen(
            activeTimeReminders = timeReminders.count { it.enabled },
            activeLocationReminders = reminders.count { it.enabled },
            registeredLocationReminders = reminders.count { it.enabled && it.registered },
            checklists = checklists,
            recentNotes = recentNotes,
            onOpenReminders = { section = NotebookSection.REMINDERS },
            onOpenTimeReminders = { section = NotebookSection.TIME_REMINDERS },
            onOpenChecklists = { section = NotebookSection.CHECKLISTS },
            onOpenNotes = { section = NotebookSection.NOTES },
        )
        NotebookSection.REMINDERS -> LocationReminderApp(
            repository = locationRepository,
            initialReminderId = initialReminderId,
            onExit = { section = NotebookSection.SUMMARY },
        )
        NotebookSection.TIME_REMINDERS -> TimeRemindersScreen(
            repository = timeReminderRepository,
            onBack = { section = NotebookSection.SUMMARY },
        )
        NotebookSection.CHECKLISTS -> NotebookChecklistsScreen(
            repository = contentRepository,
            onBack = { section = NotebookSection.SUMMARY },
        )
        NotebookSection.NOTES -> NotebookNotesScreen(
            repository = contentRepository,
            onBack = { section = NotebookSection.SUMMARY },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookSummaryScreen(
    activeTimeReminders: Int,
    activeLocationReminders: Int,
    registeredLocationReminders: Int,
    checklists: List<ChecklistWithItems>,
    recentNotes: List<NotebookNote>,
    onOpenReminders: () -> Unit,
    onOpenTimeReminders: () -> Unit,
    onOpenChecklists: () -> Unit,
    onOpenNotes: () -> Unit,
) {
    val outstandingItems = checklists.sumOf { it.remainingCount }
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("NAHIAN'S NOTEBOOK", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("Your day, in one place", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 10.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(24.dp)) {
                    Column(Modifier.fillMaxWidth().padding(20.dp)) {
                        Text("Summary", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.Bold)
                        Text(
                            if (activeTimeReminders == 0 && activeLocationReminders == 0 && outstandingItems == 0) "A calm place for your notes, plans, and reminders."
                            else "You have $activeTimeReminders scheduled and $activeLocationReminders active location reminders, with $outstandingItems checklist items left.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
            }
            item {
                SummaryActionCard(
                    title = "Time reminders",
                    subtitle = if (activeTimeReminders == 0) "No scheduled reminders" else "$activeTimeReminders scheduled reminders",
                    icon = { Icon(Icons.Filled.Alarm, contentDescription = null) },
                    onClick = onOpenTimeReminders,
                )
            }
            item {
                SummaryActionCard(
                    title = "Location reminders",
                    subtitle = if (activeLocationReminders == 0) "No active location reminders" else "$registeredLocationReminders of $activeLocationReminders registered with Android",
                    icon = { Icon(Icons.Filled.NotificationsActive, contentDescription = null) },
                    onClick = onOpenReminders,
                )
            }
            item {
                SummaryActionCard(
                    title = "Checklists",
                    subtitle = "${checklists.size} lists · $outstandingItems items remaining",
                    icon = { Icon(Icons.Filled.Checklist, contentDescription = null) },
                    onClick = onOpenChecklists,
                )
            }
            item {
                SummaryActionCard(
                    title = "Notebook",
                    subtitle = "${recentNotes.size} recent notes shown below",
                    icon = { Icon(Icons.Filled.MenuBook, contentDescription = null) },
                    onClick = onOpenNotes,
                )
            }
            item {
                Text("Recent notes", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
            }
            if (recentNotes.isEmpty()) {
                item {
                    Text("Your saved notes will appear here.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                items(recentNotes, key = { "recent-${it.id}" }) { note ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenNotes),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text(note.title.ifBlank { "Untitled note" }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            if (note.body.isNotBlank()) {
                                Text(
                                    note.body,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.padding(top = 5.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryActionCard(
    title: String,
    subtitle: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(14.dp), modifier = Modifier.size(46.dp)) {
                androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center) { icon() }
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookNotesScreen(repository: NotebookContentRepository, onBack: () -> Unit) {
    val notes by repository.observeNotes().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var editorOpen by remember { mutableStateOf(false) }
    var editingNote by remember { mutableStateOf<NotebookNote?>(null) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var pendingDelete by remember { mutableStateOf<NotebookNote?>(null) }

    fun openEditor(note: NotebookNote?) {
        editingNote = note
        title = note?.title.orEmpty()
        body = note?.body.orEmpty()
        editorOpen = true
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notebook") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to summary") }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { openEditor(null) }, icon = { Icon(Icons.Filled.Add, contentDescription = null) }, text = { Text("New note") })
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        if (notes.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.MenuBook, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(56.dp))
                Text("Your notebook is ready", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp))
                Text("Create a note; it will be saved on this device.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                Button(onClick = { openEditor(null) }, modifier = Modifier.padding(top = 16.dp)) { Text("Create first note") }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(notes, key = { it.id }) { note ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f).clickable { openEditor(note) }) {
                                Text(note.title.ifBlank { "Untitled note" }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                if (note.body.isNotBlank()) {
                                    Text(note.body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 4, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 5.dp))
                                }
                            }
                            IconButton(onClick = { openEditor(note) }) { Icon(Icons.Filled.Edit, contentDescription = "Edit note") }
                            IconButton(onClick = { pendingDelete = note }) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete note") }
                        }
                    }
                }
            }
        }
    }

    if (editorOpen) {
        AlertDialog(
            onDismissRequest = { editorOpen = false },
            title = { Text(if (editingNote == null) "New note" else "Edit note") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, singleLine = true)
                    OutlinedTextField(value = body, onValueChange = { body = it }, label = { Text("Write your note") }, minLines = 4)
                }
            },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        when (val result = repository.saveNote(editingNote?.id, title, body)) {
                            ContentResult.Success -> editorOpen = false
                            is ContentResult.Error -> snackbar.showSnackbar(result.message)
                        }
                    }
                }) { Text("Save") }
            },
            dismissButton = { TextButton(onClick = { editorOpen = false }) { Text("Cancel") } },
        )
    }

    pendingDelete?.let { note ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete this note?") },
            text = { Text("This removes the note from this device.") },
            confirmButton = {
                Button(onClick = {
                    pendingDelete = null
                    scope.launch { repository.deleteNote(note.id) }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotebookChecklistsScreen(repository: NotebookContentRepository, onBack: () -> Unit) {
    val checklists by repository.observeChecklists().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var createOpen by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var pendingDelete by remember { mutableStateOf<NotebookChecklist?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Checklists") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back to summary") }
                },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { newTitle = ""; createOpen = true }, icon = { Icon(Icons.Filled.Add, contentDescription = null) }, text = { Text("New checklist") })
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        if (checklists.isEmpty()) {
            Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Filled.Checklist, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(56.dp))
                Text("Make a list you can check off", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp))
                Text("Your checklists are saved on this device.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp))
                Button(onClick = { createOpen = true }, modifier = Modifier.padding(top = 16.dp)) { Text("Create first checklist") }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(checklists, key = { it.checklist.id }) { checklist ->
                    ChecklistCard(
                        checklist = checklist,
                        onCheck = { item, checked -> scope.launch { repository.setChecklistItemChecked(checklist.checklist.id, item.id, checked) } },
                        onAddItem = { text ->
                            scope.launch {
                                when (val result = repository.addChecklistItem(checklist.checklist.id, text)) {
                                    ContentResult.Success -> Unit
                                    is ContentResult.Error -> snackbar.showSnackbar(result.message)
                                }
                            }
                        },
                        onDeleteItem = { item -> scope.launch { repository.deleteChecklistItem(checklist.checklist.id, item.id) } },
                        onDeleteList = { pendingDelete = checklist.checklist },
                    )
                }
            }
        }
    }

    if (createOpen) {
        AlertDialog(
            onDismissRequest = { createOpen = false },
            title = { Text("New checklist") },
            text = { OutlinedTextField(value = newTitle, onValueChange = { newTitle = it }, label = { Text("Checklist name") }, singleLine = true) },
            confirmButton = {
                Button(onClick = {
                    scope.launch {
                        when (val result = repository.createChecklist(newTitle)) {
                            ContentResult.Success -> createOpen = false
                            is ContentResult.Error -> snackbar.showSnackbar(result.message)
                        }
                    }
                }) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { createOpen = false }) { Text("Cancel") } },
        )
    }

    pendingDelete?.let { checklist ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete checklist?") },
            text = { Text("The list and its items will be removed from this device.") },
            confirmButton = {
                Button(onClick = {
                    pendingDelete = null
                    scope.launch { repository.deleteChecklist(checklist.id) }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun ChecklistCard(
    checklist: ChecklistWithItems,
    onCheck: (com.nahian.mypersonalnotebook.data.NotebookChecklistItem, Boolean) -> Unit,
    onAddItem: (String) -> Unit,
    onDeleteItem: (com.nahian.mypersonalnotebook.data.NotebookChecklistItem) -> Unit,
    onDeleteList: () -> Unit,
) {
    var newItem by remember(checklist.checklist.id) { mutableStateOf("") }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(checklist.checklist.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("${checklist.completedCount} of ${checklist.items.size} complete", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDeleteList) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete checklist") }
            }
            if (checklist.items.isNotEmpty()) Spacer(Modifier.height(4.dp))
            checklist.items.forEach { item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = item.isChecked, onCheckedChange = { onCheck(item, it) })
                    Text(
                        item.text,
                        modifier = Modifier.weight(1f).clickable { onCheck(item, !item.isChecked) },
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (item.isChecked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                    )
                    IconButton(onClick = { onDeleteItem(item) }) { Icon(Icons.Filled.DeleteOutline, contentDescription = "Delete checklist item") }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = newItem,
                    onValueChange = { newItem = it },
                    label = { Text("Add an item") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                TextButton(
                    onClick = {
                        val value = newItem
                        onAddItem(value)
                        if (value.isNotBlank()) newItem = ""
                    },
                ) { Text("Add") }
            }
        }
    }
}
