$url = "https://npmmirror.com/mirrors/node/v14.18.3/node-v14.18.3-win-x64.zip"
$splits = ($url -split "/" )
$filename = $splits[$splits.Length - 1]
$subpath = ($filename -split ".zip")[0]
$curdir = Split-Path -Parent $MyInvocation.MyCommand.Definition

$zipfile = $curdir + '\' + $filename
if (Test-Path $zipfile) {
    Remove-Item $zipfile
}

Write-Output "$url start downloading"

$client = new-object System.Net.WebClient
$client.DownloadFile($url, $zipfile)

$nodepath = $curdir + "\" + $subpath
Write-Output $nodepath
if (Test-Path $nodepath) {
    Remove-Item -r $nodepath
}
Expand-Archive $filename -DestinationPath .\
$env:path += ";" + $nodepath
Write-Output "nodejs installed at $nodepath"

npm i

node install.js

npm run start