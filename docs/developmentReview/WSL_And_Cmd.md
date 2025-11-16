  🎯 如何避免 WSL/CMD 混用問題 - 完整指南

  原則 1：環境隔離 - 只用 Windows

  ✅ 你應該使用的工具（全部在 Windows 中）：

  | 工具                  | 用途              | 檢查命令            |
  |---------------------|-----------------|-----------------|
  | Windows CMD         | 主要終端機           | echo %COMSPEC%  |
  | Git for Windows     | 版本控制            | where git       |
  | Node.js for Windows | JavaScript 執行環境 | where node      |
  | npm                 | 套件管理            | where npm       |
  | VS Code             | 編輯器             | 正常安裝 Windows 版本 |

  ❌ 完全不要使用：
  - WSL / WSL2
  - Ubuntu Terminal
  - 任何 Linux 終端機

  ---
  原則 2：環境識別

  如何知道自己在哪個環境？

  Windows CMD/PowerShell：
  D:\YourProject>                    ← 磁碟機代號 (C:, D:)
  PS C:\Users\USER>                  ← PowerShell

  WSL (立即退出！)：
  username@computer:/mnt/d/...$      ← Linux 格式，有 @ 符號
  /home/username$                    ← Linux 路徑

  如果誤開到 WSL，立即輸入 exit 退出

  ---
  原則 3：檔案編輯規則

  ✅ 正確做法：
  1. 只在 Windows 環境中編輯專案文件
  2. 只在 Windows CMD 中執行 git 命令
  3. 只在 Windows CMD 中執行 npm 命令

  ❌ 錯誤做法：
  ✗ 在 WSL 中編輯文件，然後在 Windows CMD 中執行 npm
  ✗ 在 Windows 中編輯，在 WSL 中 commit
  ✗ 在兩個環境之間切換

  ---
  原則 4：Git 配置（重要）

  在 Windows CMD 執行以下配置（只需要執行一次）：

  :: 忽略檔案權限變更（避免 WSL/Windows 權限衝突）
  git config --global core.fileMode false

  :: 自動轉換行尾符號（Windows 用 CRLF）
  git config --global core.autocrlf true

  :: 確認配置
  git config --list | findstr "fileMode"
  git config --list | findstr "autocrlf"

  ---
  原則 5：VS Code 設定

  確保 VS Code 使用 Windows 終端機：

  1. 打開 VS Code Settings (Ctrl + ,)
  2. 搜尋 terminal.integrated.defaultProfile.windows
  3. 設定為 Command Prompt 或 PowerShell
  4. 不要設定為 WSL

  或編輯 settings.json：
  {
    "terminal.integrated.defaultProfile.windows": "Command Prompt",
    "terminal.integrated.profiles.windows": {
      "Command Prompt": {
        "path": "C:\\Windows\\System32\\cmd.exe"
      }
    }
  }

  ---
  原則 6：專案路徑最佳化

  目前路徑：
  D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio
  → 太長了！ (126 個字元)

  建議改成：
  D:\Projects\RedMansion
  → 簡短、清楚，避免 Windows 260 字元限制

  如何搬移（之後有空再做）：
  cd D:\
  mkdir Projects
  xcopy "D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio" "D:\Projects\RedMansion" /E /I

  ---
  原則 7：檢查清單 - 每次開發前

  開始工作前，在終端機確認：

  :: 1. 確認是 Windows 環境（應該顯示 C:\Windows\System32\cmd.exe）
  echo %COMSPEC%

  :: 2. 確認 Node.js 是 Windows 版本（應該在 C:\Program Files 或 C:\Users）
  where node

  :: 3. 確認 Git 是 Windows 版本
  where git

  :: 4. 確認在正確目錄
  cd D:\AboutUniversity\114 NSTC_and_SeniorProject\2025-IM-senior-project\TheChamber_Of_RedMansion_FireBaseStudio

  :: 5. 正常工作
  npm run dev

  ---
  原則 8：scripts/dev-server.cjs 已移除

  現在 package.json 的 dev script 是：
  "dev": "next dev -p 3001"

  這意味著：
  - ✅ 不再依賴自訂的 dev-server.cjs
  - ✅ 直接使用 Next.js 內建的 dev server
  - ✅ 簡單、穩定
  - ⚠️ 如果 port 3001 被佔用，會直接失敗（不會自動換 port）

  如果 port 3001 被佔用，手動換 port：
  npm run dev -- -p 3000

  ---
  📋 現在立即執行的步驟

  在 Windows CMD 中：

  :: 1. 確認 package.json 已恢復
  type package.json

  :: 2. 刪除 node_modules（重新開始）
  rd /s /q node_modules

  :: 3. 安裝依賴
  npm install

  :: 4. 啟動開發伺服器
  npm run dev

  ---
  ⚠️ 緊急狀況處理

  如果你發現自己在 WSL 中：
  exit  # 立即退出

  然後在 Windows 開啟新的 CMD：
  1. 按 Windows + R
  2. 輸入 cmd
  3. 按 Enter
  4. 導航到專案目錄

  ---
  🎯 總結：避免混用的黃金規則

  1. ✅ 只用 Windows CMD/PowerShell
  2. ✅ 確認所有工具都是 Windows 版本（node, npm, git）
  3. ✅ VS Code 設定用 Windows 終端機
  4. ✅ 配置 Git 忽略檔案權限
  5. ❌ 永遠不要在 WSL 中碰這個專案

  記住：一個專案，一個環境！