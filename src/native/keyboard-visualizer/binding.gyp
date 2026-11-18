{
  "targets": [
    {
      "target_name": "keyboard_visualizer",
      "sources": ["keyboard_visualizer_win.cc"],
      "defines": ["NAPI_VERSION=8", "NOMINMAX"],
      "libraries": ["user32.lib"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": ["/std:c++17"]
        }
      }
    }
  ]
}
