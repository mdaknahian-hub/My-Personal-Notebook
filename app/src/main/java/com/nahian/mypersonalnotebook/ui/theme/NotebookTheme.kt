package com.nahian.mypersonalnotebook.ui.theme

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Color as AndroidColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.nahian.mypersonalnotebook.ui.NotebookThemeMode

private val NotebookLightColors = lightColorScheme(
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

private val NotebookDarkColors = darkColorScheme(
    primary = Color(0xFF9AD8C5),
    onPrimary = Color(0xFF082019),
    primaryContainer = Color(0xFF214A3F),
    onPrimaryContainer = Color(0xFFB9F0DC),
    secondary = Color(0xFFE2C47F),
    onSecondary = Color(0xFF251A00),
    secondaryContainer = Color(0xFF53451E),
    onSecondaryContainer = Color(0xFFF5E2AD),
    background = Color(0xFF0A1014),
    surface = Color(0xFF111A20),
    surfaceVariant = Color(0xFF202B32),
    onSurface = Color(0xFFE7EFEC),
    onSurfaceVariant = Color(0xFFB3C2BE),
    error = Color(0xFFFFB4AB),
)

@Composable
internal fun NotebookTheme(
    mode: NotebookThemeMode = NotebookThemeMode.DARK,
    content: @Composable () -> Unit,
) {
    val useDarkColors = when (mode) {
        NotebookThemeMode.DARK -> true
        NotebookThemeMode.LIGHT -> false
        NotebookThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
    }
    val view = LocalView.current
    SideEffect {
        val window = view.context.findActivity()?.window
        if (window != null) {
            window.statusBarColor = AndroidColor.TRANSPARENT
            window.navigationBarColor = AndroidColor.TRANSPARENT
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !useDarkColors
                isAppearanceLightNavigationBars = !useDarkColors
            }
        }
    }
    MaterialTheme(
        colorScheme = if (useDarkColors) NotebookDarkColors else NotebookLightColors,
        typography = MaterialTheme.typography,
        content = content,
    )
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
