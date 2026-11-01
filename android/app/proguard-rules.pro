# Keep JavascriptInterface methods on AndroidBridge so R8/ProGuard does not strip native bridge calls in release builds
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.alya.companion.MainActivity$AndroidBridge {
    *;
}

-keepattributes JavascriptInterface
-keepattributes *Annotation*
