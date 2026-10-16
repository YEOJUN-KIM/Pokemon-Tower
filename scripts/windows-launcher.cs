using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

// Build as a Windows application so double-clicking never allocates a console.
internal static class TowerLauncher
{
    private static string FindNode()
    {
        foreach (string entry in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(Path.PathSeparator))
        {
            if (String.IsNullOrWhiteSpace(entry)) continue;
            string candidate = Path.Combine(Environment.ExpandEnvironmentVariables(entry.Trim().Trim('"')), "node.exe");
            if (File.Exists(candidate)) return candidate;
        }

        string bundled = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            @".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe");
        return File.Exists(bundled) ? bundled : null;
    }

    [STAThread]
    private static int Main(string[] args)
    {
        bool checkOnly = args.Length == 1 && args[0] == "--check";
        try
        {
            string root = AppDomain.CurrentDomain.BaseDirectory;
            string script = Path.Combine(root, "scripts", "launcher-window.ps1");
            string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),
                @"WindowsPowerShell\v1.0\powershell.exe");
            string node = FindNode();
            if (!File.Exists(script))
                throw new FileNotFoundException("프로젝트 폴더에서 실행해 주세요. scripts/launcher-window.ps1을 찾을 수 없습니다.");
            foreach (string asset in new[] { "scripts/pocket-button.cs", "scripts/launch-preview.mjs", "src/app/favicon.ico", "public/fonts/neodgm.ttf" })
                if (!File.Exists(Path.Combine(root, asset)))
                    throw new FileNotFoundException("프로젝트 파일을 찾을 수 없습니다: " + asset);
            if (!File.Exists(powershell))
                throw new FileNotFoundException("Windows PowerShell을 찾을 수 없습니다.");
            if (node == null)
                throw new FileNotFoundException("Node.js 24 이상을 설치한 뒤 다시 실행해 주세요.");
            if (checkOnly) return 0;

            ProcessStartInfo start = new ProcessStartInfo
            {
                FileName = powershell,
                Arguments = "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File \"" + script + "\" -NodePath \"" + node + "\"",
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            using (Process process = Process.Start(start))
            {
                if (process == null) throw new InvalidOperationException("실행기 창을 열지 못했습니다.");
            }
            return 0;
        }
        catch (Exception error)
        {
            if (!checkOnly)
                MessageBox.Show(error.Message, "포켓몬 타워 실행 오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
