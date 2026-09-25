package com.nahian.mypersonalnotebook.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val NotebookColors = lightColorScheme(
    primary = Color(0xFF315B52),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD8E9E2),
    onPrimaryContainer = Color(0xFF143A32),
    secondary = Color(0xFF735B3E),
    secondaryContainer = Color(0xFFF3E2C5),
    background = Color(0xFFF7F8F4),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFECF0EA),
    onSurface = Color(0xFF1D2824),
    onSurfaceVariant = Color(0xFF52615B),
    error = Color(0xFFBA1A1A),
)

@Composable
fun NotebookTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = NotebookColors,
        typography = MaterialTheme.typography,
        content = content,
    )
}
