#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <node_api.h>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <memory>
#include <mutex>
#include <string>
#include <thread>

namespace {

struct HookState {
  napi_threadsafe_function threadSafeFunction = nullptr;
  std::thread thread;
  std::atomic<DWORD> threadId{0};
  std::atomic<bool> stopRequested{false};
  std::mutex startupMutex;
  std::condition_variable startupCondition;
  bool startupComplete = false;
  bool hookInstalled = false;
  std::string startupError;
  DWORD lastVirtualKey = 0;
  DWORD lastModifiers = 0;
  ULONGLONG lastEventAt = 0;
};

struct ShortcutEvent {
  std::string label;
};

enum class WorkKind { Start, Stop };

struct AsyncOperation {
  napi_async_work work = nullptr;
  napi_deferred deferred = nullptr;
  HookState* state = nullptr;
  WorkKind kind = WorkKind::Start;
  bool succeeded = false;
  std::string error;
};

std::mutex g_stateMutex;
std::unique_ptr<HookState> g_hookState;
std::atomic<HookState*> g_activeHookState{nullptr};

void CallJavaScript(napi_env env, napi_value callback, void*, void* data) {
  std::unique_ptr<ShortcutEvent> event(static_cast<ShortcutEvent*>(data));
  if (env == nullptr || callback == nullptr || !event) return;

  napi_value payload;
  napi_value type;
  napi_value label;
  if (napi_create_object(env, &payload) != napi_ok ||
      napi_create_string_utf8(env, "shortcut", NAPI_AUTO_LENGTH, &type) != napi_ok ||
      napi_create_string_utf8(env, event->label.c_str(), event->label.size(), &label) != napi_ok) {
    return;
  }
  napi_set_named_property(env, payload, "type", type);
  napi_set_named_property(env, payload, "label", label);
  napi_value receiver;
  napi_value ignored;
  napi_get_undefined(env, &receiver);
  napi_call_function(env, receiver, callback, 1, &payload, &ignored);
}

void PostStartupResult(HookState* state, bool installed, const std::string& error) {
  {
    std::lock_guard<std::mutex> lock(state->startupMutex);
    state->hookInstalled = installed;
    state->startupError = error;
    state->startupComplete = true;
  }
  state->startupCondition.notify_all();
}

bool IsModifierKey(DWORD key) {
  return key == VK_SHIFT || key == VK_LSHIFT || key == VK_RSHIFT ||
         key == VK_CONTROL || key == VK_LCONTROL || key == VK_RCONTROL ||
         key == VK_MENU || key == VK_LMENU || key == VK_RMENU ||
         key == VK_LWIN || key == VK_RWIN;
}

bool IsDown(int key) { return (GetAsyncKeyState(key) & 0x8000) != 0; }

std::string KeyLabel(DWORD key) {
  if (key >= 'A' && key <= 'Z') return std::string(1, static_cast<char>(key));
  if (key >= '0' && key <= '9') return std::string(1, static_cast<char>(key));
  if (key >= VK_F1 && key <= VK_F24) return "F" + std::to_string(key - VK_F1 + 1);
  if (key >= VK_NUMPAD0 && key <= VK_NUMPAD9) return "Num" + std::to_string(key - VK_NUMPAD0);

  switch (key) {
    case VK_SPACE: return "Space";
    case VK_ESCAPE: return "Esc";
    case VK_TAB: return "Tab";
    case VK_RETURN: return "Enter";
    case VK_BACK: return "Backspace";
    case VK_DELETE: return "Delete";
    case VK_INSERT: return "Insert";
    case VK_HOME: return "Home";
    case VK_END: return "End";
    case VK_PRIOR: return "PageUp";
    case VK_NEXT: return "PageDown";
    case VK_LEFT: return "Left";
    case VK_RIGHT: return "Right";
    case VK_UP: return "Up";
    case VK_DOWN: return "Down";
    case VK_SNAPSHOT: return "PrintScreen";
    case VK_PAUSE: return "Pause";
    case VK_ADD: return "NumAdd";
    case VK_SUBTRACT: return "NumSubtract";
    case VK_MULTIPLY: return "NumMultiply";
    case VK_DIVIDE: return "NumDivide";
    default: return {};
  }
}

std::string BuildShortcutLabel(DWORD key, DWORD modifiers) {
  std::string label;
  auto append = [&label](const char* part) {
    if (!label.empty()) label += "+";
    label += part;
  };

  if ((modifiers & MOD_CONTROL) != 0) append("Ctrl");
  if ((modifiers & MOD_ALT) != 0) append("Alt");
  if ((modifiers & MOD_SHIFT) != 0) append("Shift");
  if ((modifiers & MOD_WIN) != 0) append("Win");
  const std::string keyName = KeyLabel(key);
  if (keyName.empty()) return {};
  append(keyName.c_str());
  return label;
}

void EmitShortcut(HookState* state, const std::string& label) {
  if (!state || !state->threadSafeFunction || label.empty()) return;
  auto event = std::make_unique<ShortcutEvent>();
  event->label = label;
  if (napi_call_threadsafe_function(
          state->threadSafeFunction, event.get(), napi_tsfn_nonblocking) == napi_ok) {
    event.release();
  }
}

LRESULT CALLBACK LowLevelKeyboardProc(int code, WPARAM message, LPARAM data) {
  if (code == HC_ACTION &&
      (message == WM_KEYDOWN || message == WM_SYSKEYDOWN)) {
    const auto* keyEvent = reinterpret_cast<const KBDLLHOOKSTRUCT*>(data);
    HookState* state = g_activeHookState.load(std::memory_order_acquire);
    if (state && keyEvent && (keyEvent->flags & LLKHF_INJECTED) == 0 &&
        !IsModifierKey(keyEvent->vkCode)) {
      DWORD modifiers = 0;
      if (IsDown(VK_CONTROL)) modifiers |= MOD_CONTROL;
      if (IsDown(VK_MENU)) modifiers |= MOD_ALT;
      if (IsDown(VK_SHIFT)) modifiers |= MOD_SHIFT;
      if (IsDown(VK_LWIN) || IsDown(VK_RWIN)) modifiers |= MOD_WIN;

      const bool hasPrimaryModifier =
          (modifiers & (MOD_CONTROL | MOD_ALT | MOD_WIN)) != 0;
      const bool shiftOnlyNonPrintable =
          (modifiers & MOD_SHIFT) != 0 &&
          keyEvent->vkCode >= VK_F1 && keyEvent->vkCode <= VK_F24;
      if (hasPrimaryModifier || shiftOnlyNonPrintable) {
        const ULONGLONG now = GetTickCount64();
        if (state->lastVirtualKey != keyEvent->vkCode ||
            state->lastModifiers != modifiers || now - state->lastEventAt > 180) {
          state->lastVirtualKey = keyEvent->vkCode;
          state->lastModifiers = modifiers;
          state->lastEventAt = now;
          EmitShortcut(state, BuildShortcutLabel(keyEvent->vkCode, modifiers));
        }
      }
    }
  }
  return CallNextHookEx(nullptr, code, message, data);
}

void HookThreadMain(HookState* state) {
  MSG message;
  PeekMessageW(&message, nullptr, WM_USER, WM_USER, PM_NOREMOVE);
  state->threadId.store(GetCurrentThreadId(), std::memory_order_release);
  if (state->stopRequested.load(std::memory_order_acquire)) {
    PostStartupResult(state, false, "Keyboard hook start was cancelled.");
    napi_release_threadsafe_function(state->threadSafeFunction, napi_tsfn_abort);
    return;
  }

  HMODULE module = nullptr;
  const BOOL moduleFound = GetModuleHandleExW(
      GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
      reinterpret_cast<LPCWSTR>(&LowLevelKeyboardProc), &module);
  HHOOK hook = moduleFound
      ? SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, module, 0)
      : nullptr;
  if (!hook) {
    const DWORD errorCode = GetLastError();
    PostStartupResult(state, false, "SetWindowsHookExW failed (" + std::to_string(errorCode) + ").");
    napi_release_threadsafe_function(state->threadSafeFunction, napi_tsfn_abort);
    return;
  }

  g_activeHookState.store(state, std::memory_order_release);
  PostStartupResult(state, true, {});
  while (GetMessageW(&message, nullptr, 0, 0) > 0) {
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }

  g_activeHookState.store(nullptr, std::memory_order_release);
  UnhookWindowsHookEx(hook);
  napi_release_threadsafe_function(state->threadSafeFunction, napi_tsfn_release);
}

void SignalHookThreadStop(HookState* state) {
  if (!state) return;
  state->stopRequested.store(true, std::memory_order_release);
  const DWORD threadId = state->threadId.load(std::memory_order_acquire);
  if (threadId != 0) PostThreadMessageW(threadId, WM_QUIT, 0, 0);
  state->startupCondition.notify_all();
}

void ExecuteOperation(napi_env, void* data) {
  auto* operation = static_cast<AsyncOperation*>(data);
  if (!operation || !operation->state) return;
  HookState* state = operation->state;

  if (operation->kind == WorkKind::Stop) {
    SignalHookThreadStop(state);
    if (state->thread.joinable()) state->thread.join();
    operation->succeeded = true;
    return;
  }

  {
    std::unique_lock<std::mutex> lock(state->startupMutex);
    const bool ready = state->startupCondition.wait_for(
        lock, std::chrono::seconds(5), [state] { return state->startupComplete; });
    if (!ready) {
      operation->error = "Timed out while starting the Windows keyboard hook.";
    } else if (!state->hookInstalled) {
      operation->error = state->startupError.empty()
          ? "The Windows keyboard hook could not be installed."
          : state->startupError;
    } else {
      operation->succeeded = true;
    }
  }

  if (!operation->succeeded) {
    SignalHookThreadStop(state);
    if (state->thread.joinable()) state->thread.join();
  }
}

void CompleteOperation(napi_env env, napi_status status, void* data) {
  std::unique_ptr<AsyncOperation> operation(static_cast<AsyncOperation*>(data));
  if (!operation) return;
  if (status != napi_ok && operation->error.empty()) {
    operation->error = "The native keyboard hook operation was cancelled.";
  }

  if (operation->kind == WorkKind::Start && !operation->succeeded) {
    std::lock_guard<std::mutex> lock(g_stateMutex);
    if (g_hookState.get() == operation->state) g_hookState.reset();
  } else if (operation->kind == WorkKind::Stop) {
    std::lock_guard<std::mutex> lock(g_stateMutex);
    if (g_hookState.get() == operation->state) g_hookState.reset();
  }

  if (env != nullptr) {
    if (operation->succeeded) {
      napi_value undefinedValue;
      napi_get_undefined(env, &undefinedValue);
      napi_resolve_deferred(env, operation->deferred, undefinedValue);
    } else {
      napi_value error;
      const char* message = operation->error.empty()
          ? "The native keyboard hook operation failed."
          : operation->error.c_str();
      napi_value messageValue;
      napi_create_string_utf8(env, message, NAPI_AUTO_LENGTH, &messageValue);
      napi_create_error(env, nullptr, messageValue, &error);
      napi_reject_deferred(env, operation->deferred, error);
    }
    napi_delete_async_work(env, operation->work);
  }
}

napi_value CreateOperationPromise(napi_env env, HookState* state, WorkKind kind) {
  if (kind == WorkKind::Start) {
    std::lock_guard<std::mutex> lock(g_stateMutex);
    if (g_hookState) {
      napi_throw_error(env, nullptr, "A keyboard visualizer hook is already active.");
      return nullptr;
    }
    g_hookState.reset(state);
  }

  auto operation = std::make_unique<AsyncOperation>();
  operation->state = state;
  operation->kind = kind;

  napi_value promise;
  if (napi_create_promise(env, &operation->deferred, &promise) != napi_ok) {
    if (kind == WorkKind::Start) {
      napi_release_threadsafe_function(state->threadSafeFunction, napi_tsfn_abort);
      std::lock_guard<std::mutex> lock(g_stateMutex);
      g_hookState.reset();
    }
    napi_throw_error(env, nullptr, "Unable to create the keyboard hook operation promise.");
    return nullptr;
  }
  napi_value resourceName;
  napi_create_string_utf8(env, "proscreen-keyboard-visualizer", NAPI_AUTO_LENGTH, &resourceName);
  if (napi_create_async_work(
          env, nullptr, resourceName, ExecuteOperation, CompleteOperation,
          operation.get(), &operation->work) != napi_ok) {
    if (kind == WorkKind::Start) {
      napi_release_threadsafe_function(state->threadSafeFunction, napi_tsfn_abort);
      std::lock_guard<std::mutex> lock(g_stateMutex);
      g_hookState.reset();
    }
    napi_throw_error(env, nullptr, "Unable to queue the keyboard hook operation.");
    return nullptr;
  }

  AsyncOperation* rawOperation = operation.release();
  if (kind == WorkKind::Start) {
    try {
      state->thread = std::thread(HookThreadMain, state);
    } catch (const std::exception& error) {
      napi_release_threadsafe_function(state->threadSafeFunction, napi_tsfn_abort);
      {
        std::lock_guard<std::mutex> lock(g_stateMutex);
        g_hookState.reset();
      }
      napi_delete_async_work(env, rawOperation->work);
      delete rawOperation;
      napi_throw_error(env, nullptr, error.what());
      return nullptr;
    }
  }

  const napi_status queueStatus = napi_queue_async_work(env, rawOperation->work);
  if (queueStatus != napi_ok) {
    if (kind == WorkKind::Start) {
      SignalHookThreadStop(rawOperation->state);
      if (rawOperation->state->thread.joinable()) rawOperation->state->thread.join();
      std::lock_guard<std::mutex> lock(g_stateMutex);
      g_hookState.reset();
    }
    napi_delete_async_work(env, rawOperation->work);
    delete rawOperation;
    napi_throw_error(env, nullptr, "Unable to start the keyboard hook worker.");
    return nullptr;
  }
  return promise;
}

napi_value Start(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  if (argc < 1) {
    napi_throw_type_error(env, nullptr, "start(callback) requires an event callback.");
    return nullptr;
  }
  napi_valuetype callbackType;
  napi_typeof(env, argv[0], &callbackType);
  if (callbackType != napi_function) {
    napi_throw_type_error(env, nullptr, "start(callback) requires an event callback.");
    return nullptr;
  }

  {
    std::lock_guard<std::mutex> lock(g_stateMutex);
    if (g_hookState) {
      napi_throw_error(env, nullptr, "A keyboard visualizer hook is already active.");
      return nullptr;
    }
  }

  auto state = std::make_unique<HookState>();
  napi_value resourceName;
  napi_create_string_utf8(env, "proscreen-keyboard-shortcut-events", NAPI_AUTO_LENGTH, &resourceName);
  if (napi_create_threadsafe_function(
          env, argv[0], nullptr, resourceName, 64, 1, nullptr, nullptr, nullptr,
          CallJavaScript, &state->threadSafeFunction) != napi_ok) {
    napi_throw_error(env, nullptr, "Unable to create the keyboard shortcut event bridge.");
    return nullptr;
  }

  return CreateOperationPromise(env, state.release(), WorkKind::Start);
}

napi_value Stop(napi_env env, napi_callback_info) {
  HookState* state = nullptr;
  {
    std::lock_guard<std::mutex> lock(g_stateMutex);
    state = g_hookState.get();
  }
  if (!state) {
    napi_deferred deferred;
    napi_value promise;
    napi_create_promise(env, &deferred, &promise);
    napi_value undefinedValue;
    napi_get_undefined(env, &undefinedValue);
    napi_resolve_deferred(env, deferred, undefinedValue);
    return promise;
  }
  return CreateOperationPromise(env, state, WorkKind::Stop);
}

napi_value Initialize(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
      {"start", nullptr, Start, nullptr, nullptr, nullptr, napi_default, nullptr},
      {"stop", nullptr, Stop, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_define_properties(env, exports, sizeof(properties) / sizeof(properties[0]), properties);
  return exports;
}

}  // namespace

NAPI_MODULE(NODE_GYP_MODULE_NAME, Initialize)
