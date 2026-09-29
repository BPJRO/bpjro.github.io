# 双击/右键用 PowerShell 运行：在 posts/md/ 新建 md 后运行此脚本即可同步
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Output '[sync] 找不到 node，请先安装 Node.js https://nodejs.org/'
  Read-Host '按回车退出'
  exit 1
}
Write-Output '[sync] 正在扫描 posts/md/ ...'
node scripts/sync.mjs
Write-Output ''
Write-Output '[sync] 完成。检查上面是否有“发现新博文”。'
Read-Host '按回车关闭'
