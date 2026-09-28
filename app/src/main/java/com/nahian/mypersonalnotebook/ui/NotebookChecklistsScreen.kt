package com.nahian.mypersonalnotebook.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.nahian.mypersonalnotebook.data.ChecklistCategory
import com.nahian.mypersonalnotebook.data.ChecklistTimeRange
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimit
import com.nahian.mypersonalnotebook.data.ChecklistTaskTimeLimitType
import com.nahian.mypersonalnotebook.data.ChecklistWithItems
import com.nahian.mypersonalnotebook.data.ContentResult
import com.nahian.mypersonalnotebook.data.NotebookChecklist
import com.nahian.mypersonalnotebook.data.NotebookChecklistItem
import com.nahian.mypersonalnotebook.data.NotebookContentRepository
import com.nahian.mypersonalnotebook.data.calculateTaskClockRanges
import com.nahian.mypersonalnotebook.data.checklistTaskLetter
import com.nahian.mypersonalnotebook.data.formatChecklistClockTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun NotebookChecklistsScreen(repository: NotebookContentRepository, onBack: () -> Unit) {
    val checklists by repository.observeChecklists().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var selectedCategory by remember { mutableStateOf<ChecklistCategory?>(null) }
    var openChecklistId by remember { mutableStateOf<String?>(null) }
    var isEditingChecklist by remember(openChecklistId) { mutableStateOf(false) }
    var showPlanDialog by remember { mutableStateOf(false) }
    var planDialogTarget by remember { mutableStateOf<NotebookChecklist?>(null) }
    var showTaskDialog by remember { mutableStateOf(false) }
    var taskDialogTarget by remember { mutableStateOf<NotebookChecklistItem?>(null) }
    var pendingDeleteChecklist by remember { mutableStateOf<NotebookChecklist?>(null) }
    var pendingDeleteTask by remember { mutableStateOf<NotebookChecklistItem?>(null) }

    val openChecklist = checklists.firstOrNull { it.checklist.id == openChecklistId }
    BackHandler(enabled = openChecklistId != null) {
        if (isEditingChecklist) isEditingChecklist = false else openChecklistId = null
    }
    LaunchedEffect(openChecklistId, checklists) {
        if (openChecklistId != null && openChecklist == null) openChecklistId = null
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    if (openChecklist == null) {
                        Column {
                            Text(uiText("Checklists"), maxLines = 1)
                            Text(uiText("Professional daily planner"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                        }
                    } else {
                        Column {
                            Text(openChecklist.checklist.title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                "${uiText(ChecklistCategory.fromStorage(openChecklist.checklist.categoryType).labelKey)} · ${checklistPlanTimeLabel(openChecklist.checklist)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (openChecklist == null) onBack()
                        else if (isEditingChecklist) isEditingChecklist = false
                        else openChecklistId = null
                    }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = if (openChecklist == null) uiText("Back to summary") else uiText("Back to checklists"),
                        )
                    }
                },
                actions = {
                    if (openChecklist != null) {
                        if (isEditingChecklist) {
                            TextButton(onClick = {
                                planDialogTarget = openChecklist.checklist
                                showPlanDialog = true
                            }) { Text(uiText("Edit plan")) }
                            IconButton(onClick = { pendingDeleteChecklist = openChecklist.checklist }) {
                                Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete checklist"))
                            }
                            IconButton(onClick = { isEditingChecklist = false }) {
                                Icon(Icons.Filled.Done, contentDescription = uiText("Finish editing"))
                            }
                        } else {
                            IconButton(onClick = { isEditingChecklist = true }) {
                                Icon(Icons.Filled.Edit, contentDescription = uiText("Edit plan"))
                            }
                        }
                    }
                },
            )
        },
        floatingActionButton = {
            when {
                openChecklist == null -> ExtendedFloatingActionButton(
                    onClick = {
                        planDialogTarget = null
                        showPlanDialog = true
                    },
                    icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                    text = { Text(uiText("New plan")) },
                )
                isEditingChecklist -> ExtendedFloatingActionButton(
                    onClick = {
                        taskDialogTarget = null
                        showTaskDialog = true
                    },
                    icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                    text = { Text(uiText("Add task")) },
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        if (openChecklist == null) {
            val filteredChecklists = checklists
                .filter { selectedCategory == null || ChecklistCategory.fromStorage(it.checklist.categoryType) == selectedCategory }
                .sortedWith(
                    compareBy<ChecklistWithItems> { it.checklist.scheduledStartMinutes ?: Int.MAX_VALUE }
                        .thenByDescending { it.checklist.updatedAt },
                )
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 108.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    PlannerWelcomeCard(
                        planCount = checklists.size,
                        taskCount = checklists.sumOf { it.items.size },
                        remainingCount = checklists.sumOf { it.remainingCount },
                    )
                }
                item {
                    PlannerCategoryFilters(
                        selected = selectedCategory,
                        onSelect = { selectedCategory = it },
                    )
                }
                if (filteredChecklists.isEmpty()) {
                    item {
                        EmptyPlannerState(onCreate = {
                            planDialogTarget = null
                            showPlanDialog = true
                        })
                    }
                } else {
                    itemsIndexed(filteredChecklists, key = { _, plan -> plan.checklist.id }) { index, plan ->
                        ScheduleChecklistCard(
                            number = index + 1,
                            plan = plan,
                            onOpen = { openChecklistId = plan.checklist.id },
                            onEdit = {
                                planDialogTarget = plan.checklist
                                showPlanDialog = true
                            },
                            onDelete = { pendingDeleteChecklist = plan.checklist },
                        )
                    }
                }
            }
        } else {
            val plan = openChecklist
            val tasks = plan.orderedItems
            val clockRanges = calculateTaskClockRanges(tasks.map { it.estimatedDurationMinutes }, plan.checklist.scheduledStartMinutes)
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 108.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item { ChecklistPlanOverviewCard(plan) }
                item {
                    Text(
                        uiText("Task checklist"),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                if (tasks.isEmpty()) {
                    item {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(uiText("No tasks in this plan yet"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Text(
                                    uiText(if (isEditingChecklist) "Add tasks and assign each an estimated time." else "Choose Edit to add the first task."),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                } else {
                    itemsIndexed(tasks, key = { _, task -> task.id }) { index, task ->
                        ChecklistPlanTaskRow(
                            index = index,
                            task = task,
                            clockRange = clockRanges.getOrNull(index),
                            isEditing = isEditingChecklist,
                            onToggle = { checked -> scope.launch { repository.setChecklistItemChecked(plan.checklist.id, task.id, checked) } },
                            onStartCountdown = {
                                scope.launch {
                                    when (val result = repository.startChecklistItemCountdown(plan.checklist.id, task.id)) {
                                        ContentResult.Success -> Unit
                                        is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                                    }
                                }
                            },
                            onEdit = {
                                taskDialogTarget = task
                                showTaskDialog = true
                            },
                            onDelete = { pendingDeleteTask = task },
                        )
                    }
                }
            }
        }
    }

    if (showPlanDialog) {
        ChecklistPlanDialog(
            initialChecklist = planDialogTarget,
            initialCategory = selectedCategory,
            onDismiss = { showPlanDialog = false; planDialogTarget = null },
            onSave = { title, category, timeRange ->
                val target = planDialogTarget
                scope.launch {
                    val result = if (target == null) {
                        repository.createChecklist(title, category, timeRange)
                    } else {
                        repository.updateChecklistPlan(target.id, title, category, timeRange)
                    }
                    when (result) {
                        ContentResult.Success -> { showPlanDialog = false; planDialogTarget = null }
                        is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                    }
                }
            },
        )
    }

    if (showTaskDialog && openChecklist != null) {
        ChecklistTaskEditorDialog(
            initialTask = taskDialogTarget,
            onDismiss = { showTaskDialog = false; taskDialogTarget = null },
            onSave = { text, estimate, timeLimit ->
                val planId = openChecklist.checklist.id
                val task = taskDialogTarget
                scope.launch {
                    val result = if (task == null) {
                        repository.addChecklistItem(planId, text, timeLimit, estimate)
                    } else {
                        repository.updateChecklistItem(planId, task.id, text, timeLimit, estimate)
                    }
                    when (result) {
                        ContentResult.Success -> { showTaskDialog = false; taskDialogTarget = null }
                        is ContentResult.Error -> snackbar.showSnackbar(uiText(result.message))
                    }
                }
            },
        )
    }

    pendingDeleteChecklist?.let { checklist ->
        AlertDialog(
            onDismissRequest = { pendingDeleteChecklist = null },
            title = { Text(uiText("Delete plan?")) },
            text = { Text(uiText("The checklist and its tasks will be removed from this device.")) },
            confirmButton = {
                Button(onClick = {
                    val deletedId = checklist.id
                    pendingDeleteChecklist = null
                    if (openChecklistId == deletedId) openChecklistId = null
                    scope.launch { repository.deleteChecklist(deletedId) }
                }) { Text(uiText("Delete")) }
            },
            dismissButton = { TextButton(onClick = { pendingDeleteChecklist = null }) { Text(uiText("Cancel")) } },
        )
    }

    pendingDeleteTask?.let { task ->
        AlertDialog(
            onDismissRequest = { pendingDeleteTask = null },
            title = { Text(uiText("Delete task?")) },
            text = { Text(uiText("This task will be removed from the plan.")) },
            confirmButton = {
                Button(onClick = {
                    val planId = openChecklistId
                    pendingDeleteTask = null
                    if (planId != null) scope.launch { repository.deleteChecklistItem(planId, task.id) }
                }) { Text(uiText("Delete")) }
            },
            dismissButton = { TextButton(onClick = { pendingDeleteTask = null }) { Text(uiText("Cancel")) } },
        )
    }
}

@Composable
private fun PlannerWelcomeCard(planCount: Int, taskCount: Int, remainingCount: Int) {
    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(15.dp), color = MaterialTheme.colorScheme.primary, modifier = Modifier.size(44.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Checklist, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }
                Column(Modifier.padding(start = 12.dp)) {
                    Text(uiText("PRO PLANNER"), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(uiText("Plan your day"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
            }
            Text(
                uiText("Organize work by type, set a time block, and give every task an estimate."),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                PlannerStat(value = planCount.toString(), label = uiText("Plans"))
                PlannerStat(value = taskCount.toString(), label = uiText("Tasks"))
                PlannerStat(value = remainingCount.toString(), label = uiText("Remaining"))
            }
        }
    }
}

@Composable
private fun PlannerStat(value: String, label: String) {
    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface.copy(alpha = 0.78f)) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 7.dp)) {
            Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PlannerCategoryFilters(selected: ChecklistCategory?, onSelect: (ChecklistCategory?) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilterChip(selected = selected == null, onClick = { onSelect(null) }, label = { Text(uiText("All")) })
        ChecklistCategory.entries.forEach { category ->
            FilterChip(
                selected = selected == category,
                onClick = { onSelect(if (selected == category) null else category) },
                label = { Text(uiText(category.labelKey)) },
            )
        }
    }
}

@Composable
private fun EmptyPlannerState(onCreate: () -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(24.dp)) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(uiText("No plans in this category yet"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(uiText("Create a plan such as Morning meeting or Report, then add timed tasks."), color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onCreate) { Text(uiText("Create a plan")) }
        }
    }
}

@Composable
private fun ScheduleChecklistCard(
    number: Int,
    plan: ChecklistWithItems,
    onOpen: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val progress = if (plan.items.isEmpty()) 0f else plan.completedCount.toFloat() / plan.items.size
    val start = plan.checklist.scheduledStartMinutes
    val end = plan.checklist.scheduledEndMinutes
    Card(
        modifier = Modifier.fillMaxWidth().animateContentSize().clickable(onClick = onOpen),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(32.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(number.toString(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Bold)
                    }
                }
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.padding(start = 8.dp)) {
                    Text(
                        uiText(ChecklistCategory.fromStorage(plan.checklist.categoryType).labelKey),
                        modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                if (start != null && end != null) {
                    Row(
                        modifier = Modifier.padding(start = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.Schedule, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Text(
                            "${formatChecklistClockTime(start)}–${formatChecklistClockTime(end)}",
                            modifier = Modifier.padding(start = 4.dp),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = uiText("Edit plan")) }
                IconButton(onClick = onDelete) { Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete plan")) }
            }
            Text(plan.checklist.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            LinearProgressIndicator(progress = progress, modifier = Modifier.fillMaxWidth())
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    uiText("%d of %d complete").format(plan.completedCount, plan.items.size),
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                val estimateSummary = when {
                    plan.items.isEmpty() -> uiText("No tasks yet")
                    plan.estimatedTaskCount == plan.items.size -> "${formatEstimatedMinutes(plan.estimatedDurationMinutes)} ${uiText("planned")}"
                    plan.estimatedTaskCount > 0 -> "${plan.estimatedTaskCount}/${plan.items.size} ${uiText("task estimates set")}"
                    else -> uiText("Add task estimates")
                }
                Text(
                    estimateSummary,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.tertiary,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun ChecklistPlanOverviewCard(plan: ChecklistWithItems) {
    val checklist = plan.checklist
    val range = ChecklistTimeRange(checklist.scheduledStartMinutes, checklist.scheduledEndMinutes)
    val windowMinutes = range.durationMinutes()
    val allTasksEstimated = plan.items.isNotEmpty() && plan.estimatedTaskCount == plan.items.size
    val overBy = if (allTasksEstimated) windowMinutes?.let { plan.estimatedDurationMinutes - it }?.coerceAtLeast(0) ?: 0 else 0
    val progress = if (plan.items.isEmpty()) 0f else plan.completedCount.toFloat() / plan.items.size
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f)) {
                    Text(
                        uiText(ChecklistCategory.fromStorage(checklist.categoryType).labelKey),
                        modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(Modifier.weight(1f))
                if (range.isScheduled) {
                    Text(
                        "${formatChecklistClockTime(range.startMinutes!!)}–${formatChecklistClockTime(range.endMinutes!!)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            if (windowMinutes != null) {
                Text(
                    "${formatEstimatedMinutes(windowMinutes)} ${uiText("time block")}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
            }
            val estimateSummary = when {
                plan.items.isEmpty() -> uiText("Add tasks with time estimates to build this schedule.")
                allTasksEstimated -> "${formatEstimatedMinutes(plan.estimatedDurationMinutes)} ${uiText("planned across")} ${plan.items.size} ${uiText("tasks")}"
                plan.estimatedTaskCount > 0 -> "${plan.estimatedTaskCount}/${plan.items.size} ${uiText("task estimates set")} · ${uiText("Set estimates for every task to calculate the full schedule.")}"
                else -> uiText("Assign an estimated time to each task to see the plan total.")
            }
            Text(
                estimateSummary,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            if (overBy > 0) {
                Text(
                    "${uiText("Tasks exceed the time block by")} ${formatEstimatedMinutes(overBy)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.SemiBold,
                )
            } else if (windowMinutes != null && allTasksEstimated) {
                val unused = (windowMinutes - plan.estimatedDurationMinutes).coerceAtLeast(0)
                Text(
                    if (unused > 0) "${formatEstimatedMinutes(unused)} ${uiText("buffer in this block")}" else uiText("Plan fits this time block"),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
            LinearProgressIndicator(progress = progress, modifier = Modifier.fillMaxWidth())
            Text(
                "${plan.completedCount} ${uiText("done")} · ${plan.remainingCount} ${uiText("remaining")}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Composable
private fun ChecklistPlanTaskRow(
    index: Int,
    task: NotebookChecklistItem,
    clockRange: Pair<Int, Int>?,
    isEditing: Boolean,
    onToggle: (Boolean) -> Unit,
    onStartCountdown: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth().animateContentSize(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(checked = task.isChecked, onCheckedChange = onToggle)
            Surface(
                shape = CircleShape,
                color = if (task.isChecked) MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.size(34.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        checklistTaskLetter(index),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (task.isChecked) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Column(
                modifier = Modifier.weight(1f).padding(start = 10.dp).clickable { onToggle(!task.isChecked) },
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    task.text,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (task.isChecked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                    fontWeight = if (task.isChecked) FontWeight.Normal else FontWeight.Medium,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    task.estimatedDurationMinutes?.let { duration ->
                        Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.tertiaryContainer) {
                            Text(
                                formatEstimatedMinutes(duration),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onTertiaryContainer,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    } ?: Text(uiText("Time not set"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
                    if (clockRange != null) {
                        Text(
                            "${formatChecklistClockTime(clockRange.first)}–${formatChecklistClockTime(clockRange.second)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1,
                        )
                    }
                }
                ChecklistTaskTimeLimitStatus(item = task)
                if (!task.isChecked && task.countdownDurationMillis != null && task.countdownStartedAt == null) {
                    TextButton(onClick = onStartCountdown, contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
                        Text(uiText("Start countdown"))
                    }
                }
            }
            if (isEditing) {
                Column {
                    IconButton(onClick = onEdit) { Icon(Icons.Filled.Edit, contentDescription = uiText("Edit task")) }
                    IconButton(onClick = onDelete) { Icon(Icons.Filled.DeleteOutline, contentDescription = uiText("Delete task")) }
                }
            }
        }
    }
}

@Composable
private fun ChecklistTaskTimeLimitStatus(item: NotebookChecklistItem) {
    val limit = ChecklistTaskTimeLimit.from(item)
    if (limit.type == ChecklistTaskTimeLimitType.NONE) return
    if (item.isChecked) {
        Text(uiText("Completed"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    val dueAt = limit.dueAt()
    if (dueAt == null) {
        Text(uiText("Countdown not started"), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.tertiary)
        return
    }
    var now by remember(item.id, dueAt) { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(item.id, dueAt, item.isChecked) {
        while (!item.isChecked) {
            delay(30_000L)
            now = System.currentTimeMillis()
        }
    }
    val overdue = now >= dueAt
    val delta = if (overdue) now - dueAt else dueAt - now
    val minutes = ((delta.coerceAtLeast(0L) + 59_999L) / 60_000L).coerceAtLeast(1L)
    Text(
        "${uiText(if (overdue) "Overdue by" else "Time left")} · $minutes ${uiText("min")}",
        style = MaterialTheme.typography.labelSmall,
        color = if (overdue) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

private fun checklistPlanTimeLabel(checklist: NotebookChecklist): String {
    val start = checklist.scheduledStartMinutes
    val end = checklist.scheduledEndMinutes
    return if (start != null && end != null) {
        "${formatChecklistClockTime(start)}–${formatChecklistClockTime(end)}"
    } else {
        uiText("No time block")
    }
}
